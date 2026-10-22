import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { endOfBangladeshDay, todayInBangladesh } from "../../shared/scheduleSchemas";
import { dayStatus, loadCalendar } from "../calendar/calendar.resolver";
import { NotificationService, notifyInBackground } from "../notification/notification.service";
import { WORKING_STATUSES } from "../teacher/teacher.service";
import { bdMinutes, rulesOf, toMinutes } from "./processor.service";

/*
 * At the school's cutoff time, everyone on roll today who has not punched is marked absent
 * (source DEVICE, so a teacher can change it and a late punch still turns it into Late).
 * Only where the devices were clearly working that day: a section is marked only when one
 * of its students punched; teachers only when one of them punched. So a device that was off
 * or offline never marks a whole school absent. Each part runs once a day per school.
 */

const DEVICE = "DEVICE";

const markStudents = async (schoolId: string, today: Date) => {
  // the sections where the devices brought at least one arrival today
  const sessions = await prisma.attendanceSession.findMany({
    where: { schoolId, date: today, records: { some: { source: DEVICE, checkInAt: { not: null } } } },
    select: { id: true, sectionId: true, academicYearId: true, section: { select: { classId: true } } },
  });
  const calendar = await loadCalendar(prisma, schoolId, today, today);
  let marked = 0;
  for (const s of sessions) {
    if (!dayStatus(calendar, today, { classId: s.section.classId }).isSchoolDay) continue;
    const [roll, existing] = await Promise.all([
      prisma.enrollment.findMany({
        where: {
          sectionId: s.sectionId,
          academicYearId: s.academicYearId,
          enrolledAt: { lt: endOfBangladeshDay(today) },
          OR: [{ status: "ACTIVE" }, { leftAt: { gte: today } }],
          student: { status: "ACTIVE" },
        },
        select: { id: true, studentId: true },
      }),
      prisma.studentAttendance.findMany({ where: { sessionId: s.id }, select: { studentId: true } }),
    ]);
    const has = new Set(existing.map((r) => r.studentId));
    const absent: Prisma.StudentAttendanceCreateManyInput[] = roll
      .filter((e) => !has.has(e.studentId))
      .map((e) => ({ sessionId: s.id, studentId: e.studentId, enrollmentId: e.id, status: "ABSENT", source: DEVICE }));
    if (absent.length === 0) continue;
    await prisma.studentAttendance.createMany({ data: absent, skipDuplicates: true });
    marked += absent.length;
    notifyInBackground("device absent", () => NotificationService.syncAttendance(schoolId, s.sectionId, today));
  }
  return { sections: sessions.length, marked };
};

const markTeachers = async (schoolId: string, today: Date) => {
  const someone = await prisma.teacherAttendance.count({ where: { schoolId, date: today, source: DEVICE, checkInAt: { not: null } } });
  if (someone === 0) return { worked: false, marked: 0 };
  const calendar = await loadCalendar(prisma, schoolId, today, today);
  if (!dayStatus(calendar, today, "TEACHERS").isSchoolDay) return { worked: true, marked: 0 };

  const [teachers, existing] = await Promise.all([
    prisma.teacherProfile.findMany({
      where: {
        schoolId,
        OR: [{ joiningDate: null }, { joiningDate: { lte: today } }],
        AND: [{ OR: [{ status: { in: WORKING_STATUSES } }, { leftAt: { gte: today } }] }],
      },
      select: { id: true, status: true },
    }),
    prisma.teacherAttendance.findMany({ where: { schoolId, date: today }, select: { teacherId: true } }),
  ]);
  const has = new Set(existing.map((r) => r.teacherId));
  const rows: Prisma.TeacherAttendanceCreateManyInput[] = teachers
    .filter((t) => !has.has(t.id))
    // a teacher on leave is on leave, not absent
    .map((t) => ({ schoolId, teacherId: t.id, date: today, status: t.status === "ON_LEAVE" ? "LEAVE" : "ABSENT", source: DEVICE }));
  if (rows.length > 0) await prisma.teacherAttendance.createMany({ data: rows, skipDuplicates: true });
  return { worked: true, marked: rows.length };
};

/* One school: whatever cutoff has passed today and was not done yet. */
export const runAbsentMarks = async (schoolId: string, now = new Date()) => {
  const today = todayInBangladesh();
  const minutes = bdMinutes(now);
  const rules = await rulesOf(schoolId);
  const done = (d: Date | null) => !!d && d.getTime() === today.getTime();
  const result = { students: null as null | { sections: number; marked: number }, teachers: null as null | { worked: boolean; marked: number } };

  if (rules.studentAbsentAt && minutes >= toMinutes(rules.studentAbsentAt) && !done(rules.studentAbsentDoneOn)) {
    result.students = await markStudents(schoolId, today);
    // nobody punched yet (the devices may be offline): try again later today
    if (result.students.sections > 0) {
      await prisma.deviceAttendanceSetting.upsert({ where: { schoolId }, create: { schoolId, studentAbsentDoneOn: today }, update: { studentAbsentDoneOn: today } });
    }
  }
  if (rules.teacherAbsentAt && minutes >= toMinutes(rules.teacherAbsentAt) && !done(rules.teacherAbsentDoneOn)) {
    result.teachers = await markTeachers(schoolId, today);
    if (result.teachers.worked) {
      await prisma.deviceAttendanceSetting.upsert({ where: { schoolId }, create: { schoolId, teacherAbsentDoneOn: today }, update: { teacherAbsentDoneOn: today } });
    }
  }
  return result;
};

/* Every school with a device in use (for the minute job). */
export const runAllAbsentMarks = async () => {
  const schools = await prisma.attendanceDevice.findMany({ where: { isActive: true, school: { status: "ACTIVE" } }, distinct: ["schoolId"], select: { schoolId: true } });
  for (const { schoolId } of schools) await runAbsentMarks(schoolId);
  return schools.length;
};
