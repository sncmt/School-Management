import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import type { NotificationType, SmsEvent } from "../../../../generated/prisma/enums";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { checkPermission } from "../../middlewares/authorize";
import { dayKey } from "../../shared/scheduleSchemas";
import { SmsService, type SmsEventMessage, type SmsFacts } from "../sms/sms.service";
import { currentMonth, dueFilter } from "../studentFee/studentFee.service";
import type { NotificationListQuery } from "./notification.validation";

type Auth = NonNullable<Express.Request["auth"]>;

/*
 * The in-app inbox. Other modules report what happened (notifyAdmitted, notifyPayment...)
 * and this decides who gets a message. A message keeps the type and the facts (`data`);
 * the app writes the sentence in the reader's language.
 *
 * For now every message goes to the family login of the student it is about. A student
 * without a login (admitted without a phone) gets none. The same events also go to the SMS
 * module, which sends an SMS to the guardian's phone when the school has that SMS on.
 */

type StudentRef = { id: string; userId: string | null; nameEn: string; nameBn: string; phone: string | null; guardianPhone: string | null };
type Message = { schoolId: string; student: StudentRef; type: NotificationType; dedupeKey: string; data: Prisma.InputJsonObject };

const studentRef = { id: true, userId: true, nameEn: true, nameBn: true, phone: true, guardianPhone: true } satisfies Prisma.StudentSelect;

/* The SMS for a message: the same event (promotion splits into promoted and graduated) and facts. */
const asSms = (m: Message): SmsEventMessage => ({
  schoolId: m.schoolId,
  student: m.student,
  event: m.type === "STUDENT_PROMOTED" && m.data.outcome === "GRADUATED" ? "STUDENT_GRADUATED" : (m.type as SmsEvent),
  dedupeKey: m.dedupeKey,
  facts: m.data as SmsFacts,
});

/*
 * Writes the in-app messages for students with a login (a dedupeKey already in that inbox is
 * skipped), then hands the events to SMS (unless the caller does that itself).
 */
const send = async (messages: Message[], options: { sms?: boolean } = {}) => {
  await writeInApp(messages);
  if (options.sms === false || messages.length === 0) return;
  try {
    await SmsService.enqueueEvents(messages.map(asSms));
  } catch (error) {
    console.error("[sms] queueing failed:", (error as Error).message);
  }
};

/* The in-app message types each school has switched off. */
const mutedTypesOf = async (schoolIds: string[]) =>
  new Map(
    (await prisma.notificationSetting.findMany({ where: { schoolId: { in: schoolIds } }, select: { schoolId: true, mutedTypes: true } })).map(
      (s) => [s.schoolId, new Set(s.mutedTypes)],
    ),
  );

const writeInApp = async (messages: Message[]) => {
  const withLogin = messages.filter((m) => m.student.userId);
  if (withLogin.length === 0) return;
  const muted = await mutedTypesOf([...new Set(withLogin.map((m) => m.schoolId))]);
  const rows = withLogin
    .filter((m) => !muted.get(m.schoolId)?.has(m.type))
    .map((m) => ({
      schoolId: m.schoolId,
      userId: m.student.userId!,
      studentId: m.student.id,
      type: m.type,
      dedupeKey: m.dedupeKey,
      data: { student: { nameEn: m.student.nameEn, nameBn: m.student.nameBn }, ...m.data },
    }));
  if (rows.length > 0) await prisma.notification.createMany({ data: rows, skipDuplicates: true });
};

/*
 * Runs `work` after the action it reports on has been saved, without making the request wait.
 * A message that can't be written is logged; the admission, payment or roll call still stands.
 */
export const notifyInBackground = (label: string, work: () => Promise<unknown>) => {
  void work().catch((error) => console.error(`[notification] ${label} failed:`, (error as Error).message));
};

// ------------------------------------------------------------------- events

/* Welcome: the student, their class and admission number. */
const notifyAdmitted = async (schoolId: string, studentId: string) => {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: {
      ...studentRef,
      admissionNo: true,
      enrollments: {
        orderBy: { academicYear: { startDate: "desc" } },
        take: 1,
        select: {
          class: { select: { name: true } },
          section: { select: { name: true, isDefault: true } },
          academicYear: { select: { name: true } },
        },
      },
    },
  });
  if (!student) return;
  const enrollment = student.enrollments[0];
  await send([
    {
      schoolId,
      student,
      type: "STUDENT_ADMITTED",
      dedupeKey: `admitted:${student.id}`,
      data: {
        admissionNo: student.admissionNo,
        className: enrollment?.class.name ?? null,
        // the automatic section has no name worth showing
        section: enrollment && !enrollment.section.isDefault ? enrollment.section.name : null,
        academicYear: enrollment?.academicYear.name ?? null,
      },
    },
  ]);
};

/* A payment taken or cancelled: its amount and receipt number. */
const notifyPayment = async (schoolId: string, paymentId: string, type: "PAYMENT_RECEIVED" | "PAYMENT_CANCELLED") => {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, schoolId },
    select: { amount: true, receiptNo: true, student: { select: studentRef } },
  });
  if (!payment) return;
  await send([
    {
      schoolId,
      student: payment.student,
      type,
      dedupeKey: `${type === "PAYMENT_RECEIVED" ? "paid" : "cancelled"}:${paymentId}`,
      data: { amount: payment.amount.toFixed(2), receiptNo: payment.receiptNo },
    },
  ]);
};

/*
 * After a section's roll call is saved: present, absent and late students get an in-app
 * message for that day. Saving again changes it rather than adding another: another status
 * updates it (unread again), on leave removes it.
 *
 * SMS go for present, absent and late (each switched on by the school). They wait a few
 * minutes, so a correction can still change or stop them. One already sent can't be taken
 * back, but each status has its own SMS: a student corrected from absent to present after the
 * absent SMS went out gets the present SMS too.
 */
// the attendance statuses that get a message, in the app and by SMS (on leave gets none)
const ATTENDANCE_SMS = { PRESENT: "STUDENT_PRESENT", ABSENT: "STUDENT_ABSENT", LATE: "STUDENT_LATE" } as const;
const syncAttendance = async (schoolId: string, sectionId: string, date: Date) => {
  const day = dayKey(date);
  const keyOf = (studentId: string) => `attendance:${studentId}:${day}`;

  const records = await prisma.studentAttendance.findMany({
    where: { session: { schoolId, sectionId, date } },
    select: { status: true, student: { select: studentRef } },
  });
  // in-app: the types the school sends (it may have switched "present" off: those messages go too)
  const muted = (await mutedTypesOf([schoolId])).get(schoolId);
  const wanted = new Map(
    records
      .filter((r) => r.status in ATTENDANCE_SMS)
      .map((r) => [keyOf(r.student.id), { student: r.student, type: ATTENDANCE_SMS[r.status as keyof typeof ATTENDANCE_SMS] }] as const)
      .filter(([, w]) => !muted?.has(w.type)),
  );

  const existing = await prisma.notification.findMany({
    where: { schoolId, dedupeKey: { in: records.map((r) => keyOf(r.student.id)) } },
    select: { id: true, dedupeKey: true, type: true },
  });
  const existingKeys = new Set(existing.map((n) => n.dedupeKey));
  const gone = existing.filter((n) => !wanted.has(n.dedupeKey!));
  const changed = existing.filter((n) => {
    const now = wanted.get(n.dedupeKey!);
    return now && now.type !== n.type;
  });

  if (gone.length > 0) await prisma.notification.deleteMany({ where: { id: { in: gone.map((n) => n.id) } } });
  for (const n of changed) {
    await prisma.notification.update({
      where: { id: n.id },
      data: { type: wanted.get(n.dedupeKey!)!.type, readAt: null, createdAt: new Date() },
    });
  }
  const messages = [...wanted].map(([key, { student, type }]) => ({ schoolId, student, type, dedupeKey: key, data: { date: day } }));
  await send(
    messages.filter((m) => !existingKeys.has(m.dedupeKey)),
    { sms: false },
  );
  // every SMS of this roll call not sent yet is written afresh from the latest marks
  const smsKey = (studentId: string, event: SmsEvent) => `${keyOf(studentId)}:${event}`;
  const sms: SmsEventMessage[] = records.flatMap((r) => {
    const event = r.status in ATTENDANCE_SMS ? ATTENDANCE_SMS[r.status as keyof typeof ATTENDANCE_SMS] : null;
    return event ? [{ schoolId, student: r.student, event, dedupeKey: smsKey(r.student.id, event), facts: { date: day } }] : [];
  });
  await SmsService.replaceQueued(
    schoolId,
    records.flatMap((r) => Object.values(ATTENDANCE_SMS).map((event) => smsKey(r.student.id, event))),
    sms,
  );
};

/* A class's exam result is out: every student in it. */
const notifyResultPublished = async (schoolId: string, examClassId: string) => {
  const examClass = await prisma.examClass.findFirst({
    where: { id: examClassId, exam: { schoolId } },
    select: {
      class: { select: { name: true } },
      exam: { select: { nameEn: true, nameBn: true } },
      results: { select: { student: { select: studentRef } } },
    },
  });
  if (!examClass) return;
  await send(
    examClass.results.map(({ student }) => ({
      schoolId,
      student,
      type: "RESULT_PUBLISHED" as const,
      dedupeKey: `result:${examClassId}:${student.id}`,
      data: { exam: examClass.exam, className: examClass.class.name },
    })),
  );
};

export type PromotionMove = { enrollmentId: string; studentId: string; outcome: "PROMOTED" | "GRADUATED" };

/*
 * End of year: promoted students hear their new class (in the next year); graduates are
 * congratulated. Repeating or leaving is left to the office to tell. Keyed by this year's
 * enrollment, so undoing the move removes the message.
 */
const notifyPromotion = async (schoolId: string, moves: PromotionMove[], ctx: { toYearId: string; fromClassName: string }) => {
  if (moves.length === 0) return;
  const [students, nextEnrollments] = await Promise.all([
    prisma.student.findMany({ where: { id: { in: moves.map((m) => m.studentId) }, schoolId }, select: studentRef }),
    prisma.enrollment.findMany({
      where: { academicYearId: ctx.toYearId, studentId: { in: moves.filter((m) => m.outcome === "PROMOTED").map((m) => m.studentId) } },
      select: {
        studentId: true,
        class: { select: { name: true } },
        section: { select: { name: true, isDefault: true } },
        academicYear: { select: { name: true } },
      },
    }),
  ]);
  const studentOf = new Map(students.map((s) => [s.id, s]));
  const nextOf = new Map(nextEnrollments.map((e) => [e.studentId, e]));

  await send(
    moves.flatMap((m) => {
      const student = studentOf.get(m.studentId);
      if (!student) return [];
      const next = nextOf.get(m.studentId);
      return [
        {
          schoolId,
          student,
          type: "STUDENT_PROMOTED" as const,
          dedupeKey: `promotion:${m.enrollmentId}`,
          data:
            m.outcome === "PROMOTED"
              ? {
                  outcome: m.outcome,
                  className: next?.class.name ?? null,
                  section: next && !next.section.isDefault ? next.section.name : null,
                  academicYear: next?.academicYear.name ?? null,
                }
              : { outcome: m.outcome, className: ctx.fromClassName },
        },
      ];
    }),
  );
};

/* A promotion undone: its message goes (and its SMS, if not sent yet). */
const withdrawPromotion = async (schoolId: string, enrollmentId: string) => {
  const key = `promotion:${enrollmentId}`;
  await prisma.notification.deleteMany({ where: { schoolId, dedupeKey: key } });
  await SmsService.dropQueued(schoolId, { equals: key });
};

/*
 * The monthly fee reminder (see notification.jobs): every active student who owes fees now
 * (the dues report's rule: unpaid fees whose month has started, and unpaid one-time fees, this
 * year or earlier) gets one message with the total, in the app (with a family login) and by SMS
 * (with a phone, when the school has it on). At most one a month per student, so running it
 * again (another server, a restart) sends nothing new.
 */
const sendFeeDueReminders = async () => {
  const { year, month } = currentMonth();
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;

  const fees = await prisma.studentFee.findMany({
    where: { ...dueFilter(), student: { status: "ACTIVE" } },
    select: { schoolId: true, amount: true, discountAmount: true, paidAmount: true, student: { select: studentRef } },
  });

  const owed = new Map<string, { schoolId: string; student: StudentRef; amount: Prisma.Decimal; fees: number }>();
  for (const f of fees) {
    const left = f.amount.minus(f.discountAmount).minus(f.paidAmount);
    if (left.lte(0)) continue;
    const row = owed.get(f.student.id);
    if (row) {
      row.amount = row.amount.plus(left);
      row.fees++;
    } else {
      owed.set(f.student.id, { schoolId: f.schoolId, student: f.student, amount: left, fees: 1 });
    }
  }

  await send(
    [...owed.values()].map((o) => ({
      schoolId: o.schoolId,
      student: o.student,
      type: "FEE_DUE" as const,
      dedupeKey: `fee-due:${o.student.id}:${monthKey}`,
      data: { amount: o.amount.toFixed(2), fees: o.fees },
    })),
  );
  return owed.size;
};

/* A published result taken back (to change marks): its messages go, and publishing again sends new ones. */
const withdrawResult = async (schoolId: string, examClassId: string) => {
  const prefix = `result:${examClassId}:`;
  await prisma.notification.deleteMany({ where: { schoolId, dedupeKey: { startsWith: prefix } } });
  await SmsService.dropQueued(schoolId, { startsWith: prefix });
};

/* Admit cards released (a message for every student of the exam's classes) or hidden again (messages removed). */
const syncAdmitCards = async (schoolId: string, examId: string, released: boolean) => {
  const prefix = `admit-card:${examId}:`;
  if (!released) {
    await prisma.notification.deleteMany({ where: { schoolId, dedupeKey: { startsWith: prefix } } });
    await SmsService.dropQueued(schoolId, { startsWith: prefix });
    return;
  }

  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId },
    select: { nameEn: true, nameBn: true, academicYearId: true, classes: { select: { classId: true } } },
  });
  if (!exam) return;
  const enrollments = await prisma.enrollment.findMany({
    where: {
      academicYearId: exam.academicYearId,
      classId: { in: exam.classes.map((c) => c.classId) },
      status: "ACTIVE",
    },
    select: { student: { select: studentRef } },
  });
  await send(
    enrollments.map(({ student }) => ({
      schoolId,
      student,
      type: "ADMIT_CARD_RELEASED" as const,
      dedupeKey: `${prefix}${student.id}`,
      data: { exam: { nameEn: exam.nameEn, nameBn: exam.nameBn } },
    })),
  );
};

// ------------------------------------------------------------------ settings

// the in-app messages a school may switch off, and the permission that may do it
const SWITCHABLE: Partial<Record<NotificationType, string>> = {
  // a message every school day for every student: some schools find it too many
  STUDENT_PRESENT: "sms:attendance",
};

const getSettings = async (schoolId: string) => {
  const setting = await prisma.notificationSetting.findUnique({ where: { schoolId }, select: { mutedTypes: true } });
  return { mutedTypes: setting?.mutedTypes ?? [] };
};

/* Turns one in-app message type on or off for the school. */
const setTypeEnabled = async (auth: Auth, type: NotificationType, enabled: boolean) => {
  const schoolId = auth.schoolId!;
  const permission = SWITCHABLE[type];
  if (!permission) throw new AppError("This message can't be turned off", httpStatus.BAD_REQUEST);
  if ((await checkPermission(auth, permission)) !== "OK") {
    throw new AppError("You don't have permission to change this", httpStatus.FORBIDDEN);
  }

  const { mutedTypes } = await getSettings(schoolId);
  const next = enabled ? mutedTypes.filter((t) => t !== type) : [...new Set([...mutedTypes, type])];
  await prisma.notificationSetting.upsert({
    where: { schoolId },
    create: { schoolId, mutedTypes: next, updatedBy: auth.userId },
    update: { mutedTypes: next, updatedBy: auth.userId },
  });
  return { mutedTypes: next };
};

// ------------------------------------------------------------------ the inbox

// a user's messages in the school they are logged in to
const inbox = (auth: Auth) => ({ userId: auth.userId, schoolId: auth.schoolId! });

const countUnread = (auth: Auth) => prisma.notification.count({ where: { ...inbox(auth), readAt: null } });

/* Newest first, with the unread count (for the badge). */
const listMine = async (auth: Auth, query: NotificationListQuery) => {
  const { page, limit, unread } = query;
  const where: Prisma.NotificationWhereInput = { ...inbox(auth), ...(unread ? { readAt: null } : {}) };

  const [rows, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, type: true, data: true, studentId: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where }),
    countUnread(auth),
  ]);

  return {
    items: rows.map(({ readAt, ...row }) => ({ ...row, read: readAt !== null })),
    unread: unreadCount,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/* Just the badge number: the app asks for it every half minute. */
const unreadCountMine = async (auth: Auth) => ({ unread: await countUnread(auth) });

const markRead = async (auth: Auth, notificationId: string) => {
  const { count } = await prisma.notification.updateMany({
    where: { id: notificationId, ...inbox(auth), readAt: null },
    data: { readAt: new Date() },
  });
  if (count === 0) {
    // nothing changed: already read, or not this user's message
    const mine = await prisma.notification.findFirst({ where: { id: notificationId, ...inbox(auth) }, select: { id: true } });
    if (!mine) throw new AppError("Message not found", httpStatus.NOT_FOUND);
  }
  return unreadCountMine(auth);
};

const markAllRead = async (auth: Auth) => {
  await prisma.notification.updateMany({ where: { ...inbox(auth), readAt: null }, data: { readAt: new Date() } });
  return { unread: 0 };
};

export const NotificationService = {
  notifyAdmitted,
  notifyPayment,
  syncAttendance,
  notifyResultPublished,
  withdrawResult,
  syncAdmitCards,
  notifyPromotion,
  withdrawPromotion,
  sendFeeDueReminders,
  getSettings,
  setTypeEnabled,
  listMine,
  unreadCountMine,
  markRead,
  markAllRead,
};
