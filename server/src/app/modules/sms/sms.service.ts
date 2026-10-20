import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import type { SmsEvent, SmsLanguage } from "../../../../generated/prisma/enums";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { checkPermission } from "../../middlewares/authorize";
import type { Names } from "../../shared/names";
import { activityPermission, fillTemplate, SMS_EVENTS, smsParts, unknownPlaceholders } from "./sms.templates";
import type {
  SendSmsPayload,
  SmsLogQuery,
  SmsRecipientsQuery,
  SmsStudentSearchQuery,
  UpdateSmsSettingsPayload,
  UpdateSmsTemplatePayload,
} from "./sms.validation";

type Auth = NonNullable<Express.Request["auth"]>;

/*
 * SMS to guardians. Something happens (the notification module reports it), and if the
 * school has SMS on, that event switched on and a phone for the student, an SMS is written to
 * the outbox (SmsMessage, QUEUED) in the school's language. The sender (sms.worker) sends it.
 * The phone is the guardian's, else the family login's.
 */

// ------------------------------------------------------------------ timing

const MINUTE = 60_000;
const BD_OFFSET = 6 * 60 * MINUTE;
// no automatic SMS from 9 pm to 8 am (Bangladesh): they wait for the morning
const QUIET_FROM = 21;
const QUIET_UNTIL = 8;
// absent / late SMS wait this long, so a corrected roll call can still change or stop them
export const ATTENDANCE_DELAY_MINUTES = 10;

/** The time itself, or 8 am (Bangladesh) when it falls in the quiet hours. */
const outsideQuietHours = (at: Date) => {
  const bd = new Date(at.getTime() + BD_OFFSET);
  const hour = bd.getUTCHours();
  if (hour >= QUIET_UNTIL && hour < QUIET_FROM) return at;
  const morning = Date.UTC(bd.getUTCFullYear(), bd.getUTCMonth(), bd.getUTCDate(), QUIET_UNTIL) - BD_OFFSET;
  return new Date(hour >= QUIET_FROM ? morning + 24 * 60 * MINUTE : morning);
};

// ------------------------------------------------------------------ wording

/* The facts an event's SMS can show (the same ones the in-app message keeps). */
export type SmsFacts = {
  admissionNo?: string;
  className?: string | null;
  section?: string | null;
  academicYear?: string | null;
  amount?: string;
  receiptNo?: string;
  // YYYY-MM-DD
  date?: string;
  exam?: Names;
  fees?: number;
};

export type SmsStudent = { id: string; nameEn: string; nameBn: string; phone: string | null; guardianPhone: string | null };

export type SmsEventMessage = { schoolId: string; student: SmsStudent; event: SmsEvent; dedupeKey: string; facts: SmsFacts };

const pick = (names: Names, language: SmsLanguage) =>
  (language === "BN" ? names.nameBn || names.nameEn : names.nameEn || names.nameBn) ?? "";

/* The placeholder values in the school's language (Bangla digits in Bangla SMS). */
const valuesFor = (language: SmsLanguage, student: SmsStudent, school: Names, facts: SmsFacts): Record<string, string> => {
  const locale = language === "BN" ? "bn-BD" : "en-GB";
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  return {
    student: pick(student, language),
    school: pick(school, language),
    class: [facts.className, facts.section && `(${facts.section})`].filter(Boolean).join(" "),
    year: facts.academicYear ?? "",
    admissionNo: facts.admissionNo ?? "",
    amount: facts.amount ? number.format(Number(facts.amount)) : "",
    receipt: facts.receiptNo ?? "",
    date: facts.date
      ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${facts.date}T00:00:00Z`))
      : "",
    exam: facts.exam ? pick(facts.exam, language) : "",
    fees: facts.fees !== undefined ? number.format(facts.fees) : "",
  };
};

const phoneOf = (student: SmsStudent) => student.guardianPhone || student.phone;

// --------------------------------------------------------- automatic SMS

/* Whether the SMS module is on for each school (the platform can turn modules off). */
const schoolsWithModule = async (schoolIds: string[]) =>
  new Set(
    (
      await prisma.schoolModule.findMany({
        where: { schoolId: { in: schoolIds }, isEnabled: true, module: { code: "sms", isActive: true } },
        select: { schoolId: true },
      })
    ).map((m) => m.schoolId),
  );

/*
 * Writes the SMS for events, for schools with SMS on and the event switched on. An SMS whose
 * dedupeKey the school already has is skipped (one SMS per thing, even when told twice).
 */
const enqueueEvents = async (messages: SmsEventMessage[], options: { delayMinutes?: number } = {}) => {
  const withPhone = messages.filter((m) => phoneOf(m.student));
  if (withPhone.length === 0) return 0;
  const schoolIds = [...new Set(withPhone.map((m) => m.schoolId))];

  const [settings, templates, modules, schools] = await Promise.all([
    prisma.smsSetting.findMany({ where: { schoolId: { in: schoolIds }, isActive: true } }),
    prisma.smsTemplate.findMany({ where: { schoolId: { in: schoolIds }, enabled: true } }),
    schoolsWithModule(schoolIds),
    prisma.school.findMany({ where: { id: { in: schoolIds } }, select: { id: true, nameEn: true, nameBn: true } }),
  ]);
  const settingOf = new Map(settings.map((s) => [s.schoolId, s]));
  const templateOf = new Map(templates.map((t) => [`${t.schoolId}:${t.event}`, t]));
  const schoolOf = new Map(schools.map((s) => [s.id, s]));
  const sendAfter = outsideQuietHours(new Date(Date.now() + (options.delayMinutes ?? 0) * MINUTE));

  const rows: Prisma.SmsMessageCreateManyInput[] = [];
  for (const m of withPhone) {
    const setting = settingOf.get(m.schoolId);
    const template = templateOf.get(`${m.schoolId}:${m.event}`);
    if (!setting || !template || !modules.has(m.schoolId)) continue;

    const language = setting.language;
    const wording = (language === "BN" ? template.bodyBn : template.bodyEn) ?? SMS_EVENTS[m.event].defaults[language];
    const body = fillTemplate(wording, valuesFor(language, m.student, schoolOf.get(m.schoolId)!, m.facts));
    rows.push({
      schoolId: m.schoolId,
      studentId: m.student.id,
      phone: phoneOf(m.student)!,
      body,
      parts: smsParts(body).parts,
      event: m.event,
      dedupeKey: m.dedupeKey,
      sendAfter,
    });
  }
  if (rows.length === 0) return 0;
  return (await prisma.smsMessage.createMany({ data: rows, skipDuplicates: true })).count;
};

/*
 * A roll call saved (again): SMS of these keys not sent yet are dropped and written afresh
 * from the latest marks, waiting the correction window again. Ones already sent stay.
 */
const replaceQueued = async (schoolId: string, keys: string[], messages: SmsEventMessage[]) => {
  if (keys.length > 0) {
    await prisma.smsMessage.deleteMany({ where: { schoolId, status: "QUEUED", dedupeKey: { in: keys } } });
  }
  await enqueueEvents(messages, { delayMinutes: ATTENDANCE_DELAY_MINUTES });
};

/* Something undone (a result unlocked, admit cards hidden, a promotion taken back): its SMS not yet sent are dropped. */
const dropQueued = (schoolId: string, key: { equals: string } | { startsWith: string }) =>
  prisma.smsMessage.deleteMany({ where: { schoolId, status: "QUEUED", dedupeKey: key } });

// ------------------------------------------------------------------ settings

const settingDefaults = { isActive: false, provider: "TEST" as const, senderId: null, language: "BN" as const };

const getSettings = async (schoolId: string) => {
  const setting = await prisma.smsSetting.findUnique({
    where: { schoolId },
    select: { isActive: true, provider: true, senderId: true, language: true, updatedAt: true },
  });
  return setting ?? { ...settingDefaults, updatedAt: null };
};

const updateSettings = async (auth: Auth, data: UpdateSmsSettingsPayload) => {
  const schoolId = auth.schoolId!;
  await prisma.smsSetting.upsert({
    where: { schoolId },
    create: { schoolId, ...settingDefaults, ...data, updatedBy: auth.userId },
    update: { ...data, updatedBy: auth.userId },
  });
  return getSettings(schoolId);
};

// ------------------------------------------------------------------ templates

/* Every automatic SMS with its switch, its wording (the school's or the default) and its placeholders. */
const listTemplates = async (schoolId: string) => {
  const saved = new Map((await prisma.smsTemplate.findMany({ where: { schoolId } })).map((t) => [t.event, t]));
  return (Object.keys(SMS_EVENTS) as SmsEvent[]).map((event) => {
    const info = SMS_EVENTS[event];
    const t = saved.get(event);
    return {
      event,
      activity: info.activity,
      enabled: t?.enabled ?? false,
      bodyBn: t?.bodyBn ?? info.defaults.BN,
      bodyEn: t?.bodyEn ?? info.defaults.EN,
      customBn: t?.bodyBn != null,
      customEn: t?.bodyEn != null,
      defaults: info.defaults,
      placeholders: info.placeholders,
    };
  });
};

const may = async (auth: Auth, code: string) => (await checkPermission(auth, code)) === "OK";

/*
 * Turning an event on or off needs its activity's permission (sms:attendance...); changing the
 * wording needs sms:templates. A body of null (or "") brings the default back.
 */
const updateTemplate = async (auth: Auth, event: SmsEvent, data: UpdateSmsTemplatePayload) => {
  const schoolId = auth.schoolId!;
  const { activity } = SMS_EVENTS[event];

  if (data.enabled !== undefined && !(await may(auth, activityPermission(activity)))) {
    throw new AppError("You don't have permission to turn this SMS on or off", httpStatus.FORBIDDEN);
  }
  const changesWording = data.bodyBn !== undefined || data.bodyEn !== undefined;
  if (changesWording && !(await may(auth, "sms:templates"))) {
    throw new AppError("You don't have permission to change SMS templates", httpStatus.FORBIDDEN);
  }
  for (const body of [data.bodyBn, data.bodyEn]) {
    const unknown = body ? unknownPlaceholders(event, body) : [];
    if (unknown.length > 0) {
      throw new AppError(`This SMS can't use ${unknown.map((u) => `{${u}}`).join(", ")}`, httpStatus.BAD_REQUEST);
    }
  }

  const values = {
    ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
    ...(data.bodyBn !== undefined ? { bodyBn: data.bodyBn || null } : {}),
    ...(data.bodyEn !== undefined ? { bodyEn: data.bodyEn || null } : {}),
    updatedBy: auth.userId,
  };
  await prisma.smsTemplate.upsert({
    where: { schoolId_event: { schoolId, event } },
    create: { schoolId, event, ...values },
    update: values,
  });
  return (await listTemplates(schoolId)).find((t) => t.event === event)!;
};

// ------------------------------------------------------------------ the log

const listMessages = async (schoolId: string, query: SmsLogQuery) => {
  const { status, search, page, limit } = query;
  const where: Prisma.SmsMessageWhereInput = {
    schoolId,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { phone: { contains: search } },
            { student: { nameEn: { contains: search, mode: "insensitive" } } },
            { student: { nameBn: { contains: search } } },
          ],
        }
      : {}),
  };

  // this month (Bangladesh), for the summary
  const bd = new Date(Date.now() + BD_OFFSET);
  const monthStart = new Date(Date.UTC(bd.getUTCFullYear(), bd.getUTCMonth(), 1) - BD_OFFSET);

  const [rows, total, byStatus, partsSent] = await Promise.all([
    prisma.smsMessage.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        phone: true,
        body: true,
        parts: true,
        event: true,
        status: true,
        sendAfter: true,
        attempts: true,
        error: true,
        provider: true,
        sentAt: true,
        createdAt: true,
        createdBy: true,
        student: { select: { id: true, nameEn: true, nameBn: true, admissionNo: true } },
      },
    }),
    prisma.smsMessage.count({ where }),
    prisma.smsMessage.groupBy({ by: ["status"], where: { schoolId, createdAt: { gte: monthStart } }, _count: { _all: true } }),
    prisma.smsMessage.aggregate({ where: { schoolId, status: "SENT", sentAt: { gte: monthStart } }, _sum: { parts: true } }),
  ]);

  const counts = { QUEUED: 0, SENDING: 0, SENT: 0, FAILED: 0, CANCELLED: 0 };
  for (const s of byStatus) counts[s.status] = s._count._all;

  return {
    items: rows,
    thisMonth: { ...counts, partsSent: partsSent._sum.parts ?? 0 },
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// ------------------------------------------------------------------ by hand

/*
 * The phones an SMS by hand goes to: the guardians of the school's active students this year
 * (or one class / section), or of one student (whatever their status: a former student's
 * family can still be told about dues). Siblings sharing a phone get one SMS.
 */
const recipientsOf = async (schoolId: string, target: SmsRecipientsQuery) => {
  if (target.studentId) {
    const student = await prisma.student.findFirst({
      where: { id: target.studentId, schoolId },
      select: { id: true, phone: true, guardianPhone: true },
    });
    if (!student) throw new AppError("Student not found", httpStatus.NOT_FOUND);
    const phone = student.guardianPhone || student.phone;
    return { students: 1, withoutPhone: phone ? 0 : 1, phones: new Map(phone ? [[phone, student.id]] : []) };
  }

  const year = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true }, select: { id: true } });
  if (!year) throw new AppError("No current academic year is set", httpStatus.BAD_REQUEST);

  const enrollments = await prisma.enrollment.findMany({
    where: {
      academicYearId: year.id,
      status: "ACTIVE",
      student: { schoolId, status: "ACTIVE" },
      ...(target.classId ? { classId: target.classId } : {}),
      ...(target.sectionId ? { sectionId: target.sectionId } : {}),
    },
    select: { student: { select: { id: true, phone: true, guardianPhone: true } } },
  });

  const byPhone = new Map<string, string>();
  let withoutPhone = 0;
  for (const { student } of enrollments) {
    const phone = student.guardianPhone || student.phone;
    if (!phone) withoutPhone++;
    else if (!byPhone.has(phone)) byPhone.set(phone, student.id);
  }
  return { students: enrollments.length, withoutPhone, phones: byPhone };
};

/*
 * The students to pick one from, with the phone the SMS would go to. Needs only sms:send, not
 * student:view. With a class: its active students this year (one section, if given), by roll.
 * Otherwise a search by name, admission number or phone, with each one's latest class.
 */
const searchStudents = async (schoolId: string, { classId, sectionId, search }: SmsStudentSearchQuery) => {
  if (classId) return classStudents(schoolId, classId, sectionId);

  const students = await prisma.student.findMany({
    where: {
      schoolId,
      OR: [
        { nameEn: { contains: search, mode: "insensitive" } },
        { nameBn: { contains: search } },
        { admissionNo: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { guardianPhone: { contains: search } },
      ],
    },
    // the students still at the school first
    orderBy: [{ status: "asc" }, { nameEn: "asc" }],
    take: 10,
    select: {
      id: true,
      nameEn: true,
      nameBn: true,
      admissionNo: true,
      status: true,
      phone: true,
      guardianPhone: true,
      enrollments: {
        orderBy: { academicYear: { startDate: "desc" } },
        take: 1,
        select: { class: { select: { name: true } }, section: { select: { name: true, isDefault: true } } },
      },
    },
  });
  return students.map(({ phone, guardianPhone, enrollments, ...s }) => ({
    ...s,
    smsPhone: guardianPhone || phone,
    rollNumber: null,
    className: enrollments[0]?.class.name ?? null,
    section: enrollments[0] && !enrollments[0].section.isDefault ? enrollments[0].section.name : null,
  }));
};

// roll numbers in their natural order (2 before 10), students without one last
const byRoll = (a: string | null, b: string | null) =>
  a === null ? (b === null ? 0 : 1) : b === null ? -1 : a.localeCompare(b, undefined, { numeric: true });

const classStudents = async (schoolId: string, classId: string, sectionId?: string) => {
  const year = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true }, select: { id: true } });
  if (!year) throw new AppError("No current academic year is set", httpStatus.BAD_REQUEST);

  const enrollments = await prisma.enrollment.findMany({
    where: {
      academicYearId: year.id,
      classId,
      status: "ACTIVE",
      student: { schoolId, status: "ACTIVE" },
      ...(sectionId ? { sectionId } : {}),
    },
    select: {
      rollNumber: true,
      class: { select: { name: true } },
      section: { select: { name: true, isDefault: true } },
      student: { select: { id: true, nameEn: true, nameBn: true, admissionNo: true, status: true, phone: true, guardianPhone: true } },
    },
  });
  return enrollments
    .sort((a, b) => byRoll(a.rollNumber, b.rollNumber) || a.student.nameEn.localeCompare(b.student.nameEn))
    .map(({ rollNumber, class: cls, section, student: { phone, guardianPhone, ...s } }) => ({
      ...s,
      smsPhone: guardianPhone || phone,
      rollNumber,
      className: cls.name,
      section: section.isDefault ? null : section.name,
    }));
};

const previewRecipients = async (schoolId: string, target: SmsRecipientsQuery) => {
  const { students, withoutPhone, phones } = await recipientsOf(schoolId, target);
  return { students, withoutPhone, phones: phones.size };
};

const sendByHand = async (auth: Auth, data: SendSmsPayload) => {
  const schoolId = auth.schoolId!;
  const setting = await prisma.smsSetting.findUnique({ where: { schoolId }, select: { isActive: true } });
  if (!setting?.isActive) throw new AppError("SMS is turned off for the school. Turn it on in SMS settings first", httpStatus.BAD_REQUEST);

  const { phones } = await recipientsOf(schoolId, data);
  if (phones.size === 0) {
    throw new AppError(data.studentId ? "This student has no phone number" : "None of these students has a phone number", httpStatus.BAD_REQUEST);
  }

  const parts = smsParts(data.message).parts;
  // sent now: a person chose the moment, so the quiet hours don't apply
  const { count } = await prisma.smsMessage.createMany({
    data: [...phones].map(([phone, studentId]) => ({
      schoolId,
      studentId,
      phone,
      body: data.message,
      parts,
      createdBy: auth.userId,
    })),
  });
  return { queued: count, parts, totalParts: count * parts };
};

export const SmsService = {
  enqueueEvents,
  replaceQueued,
  dropQueued,
  getSettings,
  updateSettings,
  listTemplates,
  updateTemplate,
  listMessages,
  searchStudents,
  previewRecipients,
  sendByHand,
};
