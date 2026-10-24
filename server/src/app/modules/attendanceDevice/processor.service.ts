import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { dayKey, endOfBangladeshDay } from "../../shared/scheduleSchemas";
import { dayStatus, loadCalendar } from "../calendar/calendar.resolver";
import { NotificationService, notifyInBackground } from "../notification/notification.service";
import { resolveSectionHours } from "../schedule/schedule.service";
import { WORKING_STATUSES } from "../teacher/teacher.service";

/*
 * Punches into attendance. Each punch is claimed once (so two servers, or a restart, never
 * count it twice), then:
 *  - the person's first punch of the day is the arrival: Present, or Late after their start
 *    time (the section's hours that day, or the teachers' start time) plus the grace minutes;
 *  - a later one, at least the check-out gap after arriving, is the leaving time (the last wins);
 *  - one closer than the gap is a repeat and changes nothing.
 * A mark a person made by hand always wins: the device only adds the times to it. Days off
 * (holidays, weekly days off) and people not on roll that day are kept in the log with the
 * reason. Afterwards each section's messages to families are brought in step, exactly as when
 * a teacher saves a roll call.
 */

const DEVICE = "DEVICE";
const BATCH = 200;
// a punch claimed but never finished (the server stopped mid-way) is taken again after this
const STALE_MS = 10 * 60_000;
const BD_OFFSET_MS = 6 * 3_600_000;

export type DeviceRules = {
  lateAfterMinutes: number;
  studentAbsentAt: string | null;
  teacherStartTime: string;
  teacherLateAfterMinutes: number;
  teacherAbsentAt: string | null;
  checkoutGapMinutes: number;
  studentAbsentDoneOn: Date | null;
  teacherAbsentDoneOn: Date | null;
};

export const DEFAULT_RULES: DeviceRules = {
  lateAfterMinutes: 10,
  studentAbsentAt: "10:00",
  teacherStartTime: "08:00",
  teacherLateAfterMinutes: 10,
  teacherAbsentAt: "10:30",
  checkoutGapMinutes: 60,
  studentAbsentDoneOn: null,
  teacherAbsentDoneOn: null,
};

export const rulesOf = async (schoolId: string): Promise<DeviceRules> => {
  const row = await prisma.deviceAttendanceSetting.findUnique({ where: { schoolId } });
  return row ?? DEFAULT_RULES;
};

/** The Bangladesh calendar day of a moment, as midnight UTC (the DATE columns' form). */
export const bdDay = (at: Date) => new Date(`${new Date(at.getTime() + BD_OFFSET_MS).toISOString().slice(0, 10)}T00:00:00Z`);
/** Minutes after midnight, Bangladesh time. */
export const bdMinutes = (at: Date) => {
  const local = new Date(at.getTime() + BD_OFFSET_MS);
  return local.getUTCHours() * 60 + local.getUTCMinutes();
};
export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

type Punch = { id: string; schoolId: string; pin: string; punchedAt: Date };
type Outcome = string;

// how far ahead of the server's clock a punch may be (devices drift a little)
const FUTURE_GRACE_MS = 10 * 60_000;

/* Claims a batch of a school's waiting punches (and ones left half done), oldest first. */
const claim = async (schoolId: string): Promise<Punch[]> => {
  const stale = new Date(Date.now() - STALE_MS);
  return prisma.$queryRaw<Punch[]>`
    UPDATE "DevicePunch" SET "processedAt" = now(), "outcome" = 'PROCESSING'
    WHERE "id" IN (
      SELECT "id" FROM "DevicePunch"
      WHERE "schoolId" = ${schoolId}
        AND ("processedAt" IS NULL OR ("outcome" = 'PROCESSING' AND "processedAt" < ${stale}))
      ORDER BY "punchedAt"
      LIMIT ${BATCH}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id", "schoolId", "pin", "punchedAt"`;
};

/* What one run of a school needs again and again: years, calendars, section hours. */
const makeCache = (schoolId: string) => {
  const years = new Map<string, Promise<{ id: string } | null>>();
  const calendars = new Map<string, ReturnType<typeof loadCalendar>>();
  return {
    year: (day: Date) => {
      const k = dayKey(day);
      if (!years.has(k)) {
        years.set(
          k,
          prisma.academicYear.findFirst({ where: { schoolId, startDate: { lte: day }, endDate: { gte: day } }, orderBy: { startDate: "desc" }, select: { id: true } }),
        );
      }
      return years.get(k)!;
    },
    calendar: (day: Date) => {
      const k = dayKey(day);
      if (!calendars.has(k)) calendars.set(k, loadCalendar(prisma, schoolId, day, day));
      return calendars.get(k)!;
    },
  };
};

type Cache = ReturnType<typeof makeCache>;

/*
 * Arrival, leaving or repeat, for a record that may already exist. Returns the changes to
 * make (none for a repeat) and what the punch was.
 */
const applyPunch = (
  record: { status: string; source: string; checkInAt: Date | null; checkOutAt: Date | null } | null,
  at: Date,
  late: boolean,
  gapMs: number,
): { data: Record<string, unknown> | null; outcome: "IN" | "LATE" | "OUT" | "REPEAT"; statusChanged: boolean } => {
  const arrival = late ? "LATE" : "PRESENT";
  if (!record) return { data: { status: arrival, checkInAt: at }, outcome: late ? "LATE" : "IN", statusChanged: true };

  const byDevice = record.source === DEVICE;
  // an earlier punch than the arrival we have (punches can come in late, out of order)
  if (!record.checkInAt || at < record.checkInAt) {
    const data: Record<string, unknown> = { checkInAt: at };
    // the old arrival may now be a leaving time
    if (record.checkInAt && record.checkInAt.getTime() - at.getTime() >= gapMs && (!record.checkOutAt || record.checkInAt > record.checkOutAt)) {
      data.checkOutAt = record.checkInAt;
    }
    const statusChanged = byDevice && record.status !== arrival;
    if (statusChanged) data.status = arrival;
    return { data, outcome: late ? "LATE" : "IN", statusChanged };
  }
  if (at.getTime() - record.checkInAt.getTime() >= gapMs) {
    if (!record.checkOutAt || at > record.checkOutAt) return { data: { checkOutAt: at }, outcome: "OUT", statusChanged: false };
    return { data: null, outcome: "OUT", statusChanged: false };
  }
  return { data: null, outcome: "REPEAT", statusChanged: false };
};

const handleStudent = async (punch: Punch, studentId: string, rules: DeviceRules, cache: Cache, touched: Map<string, Date>): Promise<Outcome> => {
  const day = bdDay(punch.punchedAt);
  const year = await cache.year(day);
  if (!year) return "NO_YEAR";
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId,
      academicYearId: year.id,
      enrolledAt: { lt: endOfBangladeshDay(day) },
      OR: [{ status: "ACTIVE" }, { leftAt: { gte: day } }],
      student: { schoolId: punch.schoolId },
    },
    select: { id: true, sectionId: true, classId: true },
  });
  if (!enrollment) return "NOT_ON_ROLL";
  if (!dayStatus(await cache.calendar(day), day, { classId: enrollment.classId }).isSchoolDay) return "DAY_OFF";

  let session = await prisma.attendanceSession.findUnique({ where: { sectionId_date: { sectionId: enrollment.sectionId, date: day } }, select: { id: true, startTime: true } });
  if (!session) {
    const hours = (await resolveSectionHours(prisma, punch.schoolId, year.id, day, [{ id: enrollment.sectionId, classId: enrollment.classId }])).get(enrollment.sectionId)!;
    session = await prisma.attendanceSession.upsert({
      where: { sectionId_date: { sectionId: enrollment.sectionId, date: day } },
      create: {
        schoolId: punch.schoolId,
        academicYearId: year.id,
        sectionId: enrollment.sectionId,
        date: day,
        startTime: hours.startTime,
        endTime: hours.endTime,
        scheduleNote: hours.source.type === "OVERRIDE" ? hours.source.name : null,
        takenBy: DEVICE,
      },
      update: {},
      select: { id: true, startTime: true },
    });
  }

  const record = await prisma.studentAttendance.findUnique({
    where: { sessionId_studentId: { sessionId: session.id, studentId } },
    select: { id: true, status: true, source: true, checkInAt: true, checkOutAt: true },
  });
  // no class hours for the day: nobody can be late
  const late = !!session.startTime && bdMinutes(punch.punchedAt) > toMinutes(session.startTime) + rules.lateAfterMinutes;
  const { data, outcome, statusChanged } = applyPunch(record, punch.punchedAt, late, rules.checkoutGapMinutes * 60_000);

  if (!record) {
    await prisma.studentAttendance.create({
      data: { sessionId: session.id, studentId, enrollmentId: enrollment.id, source: DEVICE, status: late ? "LATE" : "PRESENT", checkInAt: punch.punchedAt },
    });
  } else if (data) {
    await prisma.studentAttendance.update({ where: { id: record.id }, data: data as Prisma.StudentAttendanceUpdateInput });
  }
  if (statusChanged) touched.set(`${enrollment.sectionId}|${dayKey(day)}`, day);
  return `STUDENT_${outcome}`;
};

const handleTeacher = async (punch: Punch, teacherId: string, rules: DeviceRules, cache: Cache): Promise<Outcome> => {
  const day = bdDay(punch.punchedAt);
  const teacher = await prisma.teacherProfile.findFirst({
    where: {
      id: teacherId,
      schoolId: punch.schoolId,
      OR: [{ joiningDate: null }, { joiningDate: { lte: day } }],
      AND: [{ OR: [{ status: { in: WORKING_STATUSES } }, { leftAt: { gte: day } }] }],
    },
    select: { id: true },
  });
  if (!teacher) return "NOT_ON_ROLL";
  if (!dayStatus(await cache.calendar(day), day, "TEACHERS").isSchoolDay) return "DAY_OFF";

  const record = await prisma.teacherAttendance.findUnique({
    where: { teacherId_date: { teacherId, date: day } },
    select: { id: true, status: true, source: true, checkInAt: true, checkOutAt: true },
  });
  const late = bdMinutes(punch.punchedAt) > toMinutes(rules.teacherStartTime) + rules.teacherLateAfterMinutes;
  const { data, outcome } = applyPunch(record, punch.punchedAt, late, rules.checkoutGapMinutes * 60_000);
  if (!record) {
    await prisma.teacherAttendance.create({
      data: { schoolId: punch.schoolId, teacherId, date: day, source: DEVICE, status: late ? "LATE" : "PRESENT", checkInAt: punch.punchedAt },
    });
  } else if (data) {
    await prisma.teacherAttendance.update({ where: { id: record.id }, data: data as Prisma.TeacherAttendanceUpdateInput });
  }
  return `TEACHER_${outcome}`;
};

/* Works through a school's waiting punches; returns how many were handled. */
export const processSchool = async (schoolId: string) => {
  let handled = 0;
  for (;;) {
    const punches = await claim(schoolId);
    if (punches.length === 0) break;
    punches.sort((a, b) => a.punchedAt.getTime() - b.punchedAt.getTime());
    const rules = await rulesOf(schoolId);
    const cache = makeCache(schoolId);
    const people = await prisma.devicePerson.findMany({
      where: { schoolId, pin: { in: [...new Set(punches.map((p) => p.pin))] } },
      select: { pin: true, studentId: true, teacherId: true },
    });
    const personOf = new Map(people.map((p) => [p.pin, p]));
    // sections whose marks changed, for the messages to families
    const touched = new Map<string, Date>();

    for (const punch of punches) {
      let outcome: Outcome;
      try {
        const person = personOf.get(punch.pin);
        // a device clock set ahead: kept, but never attendance for a day that hasn't come
        outcome = punch.punchedAt.getTime() > Date.now() + FUTURE_GRACE_MS
          ? "FUTURE_TIME"
          : !person
          ? "UNKNOWN_PERSON"
          : person.studentId
            ? await handleStudent(punch, person.studentId, rules, cache, touched)
            : await handleTeacher(punch, person.teacherId!, rules, cache);
      } catch (error) {
        console.error(`[devices] punch ${punch.id} failed:`, (error as Error).message);
        outcome = "ERROR";
      }
      await prisma.devicePunch.update({ where: { id: punch.id }, data: { outcome, processedAt: new Date() } });
      handled++;
    }

    for (const [k, day] of touched) {
      const sectionId = k.split("|")[0];
      notifyInBackground("device attendance", () => NotificationService.syncAttendance(schoolId, sectionId, day));
    }
    if (punches.length < BATCH) break;
  }
  return handled;
};

// one run per school at a time in this process
const running = new Map<string, Promise<number>>();

/** Processes a school's punches soon (after an upload), never two runs at once. */
export const processSoon = (schoolId: string) => {
  const current = running.get(schoolId);
  if (current) return current;
  const run = processSchool(schoolId)
    .catch((error) => {
      console.error("[devices] processing failed:", (error as Error).message);
      return 0;
    })
    .finally(() => running.delete(schoolId));
  running.set(schoolId, run);
  return run;
};

/** Every school with punches still waiting (for the minute job). */
export const processAllWaiting = async () => {
  const stale = new Date(Date.now() - STALE_MS);
  const schools = await prisma.devicePunch.findMany({
    where: { OR: [{ processedAt: null }, { outcome: "PROCESSING", processedAt: { lt: stale } }] },
    distinct: ["schoolId"],
    select: { schoolId: true },
  });
  for (const { schoolId } of schools) await processSoon(schoolId);
  return schools.length;
};
