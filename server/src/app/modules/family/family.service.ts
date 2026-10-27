import httpStatus from "http-status";
import { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { dayKey, todayInBangladesh } from "../../shared/scheduleSchemas";
import { GUARDIAN_ROLE } from "../../shared/schoolAccounts";
import { fileUrl } from "../../shared/storage";
import { upcomingHolidays } from "../dashboard/dashboard.service";
import { releasedForEnrollment } from "../admitCard/admitCard.service";
import { storeOf } from "../onlinePayment/onlinePayment.service";
import { homeworkDueSoon } from "../homework/homework.service";
import { currentMonth } from "../studentFee/studentFee.service";
import { AttendanceService } from "../attendance/attendance.service";
import { dayStatus, eachDay, loadCalendar } from "../calendar/calendar.resolver";
import { ExamResultService } from "../exam/examResult.service";
import { RoutineService } from "../routine/routine.service";

/*
 * The family login's home: the children on this account in this school, each with their
 * class this year, today's attendance, this month's attendance and the fees owed now
 * (earlier years too), the homework due soon; and the school's holidays coming up. Only the account's own
 * children, so it needs no permission, just the GUARDIAN role. Money is "1234.50".
 */

type Auth = NonNullable<Express.Request["auth"]>;
const ZERO = new Prisma.Decimal(0);

const assertGuardian = async (auth: Auth) => {
  const guardian = auth.membershipId
    ? await prisma.userRole.findFirst({
        where: { userId: auth.userId, membershipId: auth.membershipId, role: { scope: "SCHOOL", name: GUARDIAN_ROLE.name, isSystem: true } },
        select: { id: true },
      })
    : null;
  if (!guardian) throw new AppError("This page is for students and guardians", httpStatus.FORBIDDEN);
};

const getHome = async (auth: Auth) => {
  await assertGuardian(auth);
  const schoolId = auth.schoolId!;
  const today = todayInBangladesh();
  const firstOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const now = currentMonth();

  const [year, students] = await Promise.all([
    prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true }, select: { id: true, name: true, startDate: true } }),
    prisma.student.findMany({
      where: { schoolId, userId: auth.userId },
      orderBy: [{ status: "asc" }, { nameEn: "asc" }],
      select: {
        id: true,
        nameEn: true,
        nameBn: true,
        admissionNo: true,
        gender: true,
        photo: true,
        status: true,
        religion: true,
        enrollments: {
          orderBy: { academicYear: { startDate: "desc" } },
          take: 3,
          select: {
            id: true,
            status: true,
            rollNumber: true,
            academicYearId: true,
            classId: true,
            sectionId: true,
            groupId: true,
            optionalSubject: { select: { classSubjectId: true } },
            academicYear: { select: { id: true, name: true, startDate: true, isCurrent: true } },
            class: { select: { id: true, name: true } },
            section: { select: { id: true, name: true, isDefault: true } },
            group: { select: { id: true, nameEn: true, nameBn: true } },
          },
        },
      },
    }),
  ]);

  const children = await Promise.all(
    students.map(async ({ enrollments, photo, religion, ...student }) => {
      // this year's class; else the next year's (admitted early); else the latest
      const enrollment =
        enrollments.find((e) => e.academicYear.isCurrent) ??
        (year ? [...enrollments].reverse().find((e) => e.academicYear.startDate > year.startDate) : undefined) ??
        enrollments[0] ??
        null;

      const [todayRecord, monthByStatus, dueFees, homework, admitCards] = await Promise.all([
        prisma.studentAttendance.findFirst({
          where: { studentId: student.id, session: { date: today } },
          select: { status: true, checkInAt: true },
        }),
        prisma.studentAttendance.groupBy({
          by: ["status"],
          where: { studentId: student.id, session: { date: { gte: firstOfMonth, lte: today } } },
          _count: { _all: true },
        }),
        // owed now: one-time fees, and monthly fees of months that have started
        prisma.studentFee.findMany({
          where: {
            schoolId,
            studentId: student.id,
            status: { in: ["UNPAID", "PARTIAL"] },
            OR: [{ month: null }, { year: { lt: now.year } }, { year: now.year, month: { lte: now.month } }],
          },
          orderBy: [{ year: "asc" }, { month: "asc" }, { createdAt: "asc" }],
          select: {
            id: true,
            month: true,
            year: true,
            description: true,
            amount: true,
            discountAmount: true,
            paidAmount: true,
            feeType: { select: { nameEn: true, nameBn: true } },
            academicYear: { select: { id: true, name: true } },
          },
        }),
        // homework due from today, in the class they are in now
        enrollment ? homeworkDueSoon(schoolId, { id: student.id, religion, enrollments: [enrollment] }) : { total: 0, items: [] },
        // exams whose admit cards the school has released for this class
        enrollment && enrollment.status === "ACTIVE" ? releasedForEnrollment(enrollment) : [],
      ]);

      const count = (s: string) => monthByStatus.find((x) => x.status === s)?._count._all ?? 0;
      const fees = dueFees
        .map(({ amount, discountAmount, paidAmount, ...fee }) => ({ ...fee, due: amount.minus(discountAmount).minus(paidAmount) }))
        .filter((fee) => fee.due.gt(0));
      const total = fees.reduce((sum, fee) => sum.plus(fee.due), ZERO);

      return {
        ...student,
        photo: await fileUrl(photo),
        enrollment: enrollment && {
          id: enrollment.id,
          status: enrollment.status,
          rollNumber: enrollment.rollNumber,
          academicYear: enrollment.academicYear,
          class: enrollment.class,
          section: enrollment.section,
          group: enrollment.group,
        },
        homework,
        admitCards,
        attendance: {
          today: todayRecord ? { status: todayRecord.status, checkInAt: todayRecord.checkInAt } : null,
          month: { present: count("PRESENT"), late: count("LATE"), absent: count("ABSENT"), leave: count("LEAVE") },
        },
        dues: { total: total.toFixed(2), fees: fees.map((fee) => ({ ...fee, due: fee.due.toFixed(2) })) },
      };
    }),
  );

  return {
    today: dayKey(today),
    academicYear: year ? { id: year.id, name: year.name } : null,
    children,
    upcoming: await upcomingHolidays(schoolId),
    // "Pay fees" shows only when the school takes payments online
    onlinePayment: await storeOf(schoolId).then((s) => ({ enabled: !!s?.enabled, chargePercent: s?.chargePercent ?? "0.00" })),
  };
};

/*
 * One child's attendance in a month ("2026-10"), day by day: the roll-call status, and why a
 * day had no school (a holiday, with its name, or the weekly off day) for the child's class.
 * Days still ahead come back too, so the month's holidays show.
 */
const getAttendanceMonth = async (auth: Auth, query: { studentId: string; month: string }) => {
  await assertGuardian(auth);
  const schoolId = auth.schoolId!;
  const [y, m] = query.month.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 0));

  const student = await prisma.student.findFirst({
    where: { id: query.studentId, schoolId, userId: auth.userId },
    select: {
      // the class of that month: the latest year that had started by its end
      enrollments: {
        where: { academicYear: { startDate: { lte: to } } },
        orderBy: { academicYear: { startDate: "desc" } },
        take: 1,
        select: { classId: true },
      },
    },
  });
  if (!student) throw new AppError("Student not found!", httpStatus.NOT_FOUND);
  const classId = student.enrollments[0]?.classId;

  const [report, calendar] = await Promise.all([
    AttendanceService.getStudentReport(schoolId, query.studentId, { from, to }),
    loadCalendar(prisma, schoolId, from, to),
  ]);
  const recordOf = new Map(report.days.map((d) => [d.date, d]));

  return {
    month: query.month,
    summary: report.summary,
    days: eachDay(from, to).map((date) => {
      const record = recordOf.get(dayKey(date));
      const day = classId ? dayStatus(calendar, date, { classId }) : null;
      return {
        date: dayKey(date),
        status: record?.status ?? null,
        checkInAt: record?.checkInAt ?? null,
        note: record?.note ?? null,
        off: day && !day.isSchoolDay ? { reason: day.reason, nameEn: day.source?.nameEn ?? null, nameBn: day.source?.nameBn ?? null } : null,
      };
    }),
  };
};

// ----------------------------------------------------------------- exam results

/* The account's own child in this school, or 404. */
const ownChild = async (auth: Auth, studentId: string) => {
  await assertGuardian(auth);
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId: auth.schoolId!, userId: auth.userId },
    select: { id: true },
  });
  if (!student) throw new AppError("Student not found!", httpStatus.NOT_FOUND);
  return student;
};

/*
 * A child's published exam results, the latest first, with each one's headline numbers.
 * A result exists only while it is published (unlocking deletes it); the status is
 * checked too. Marks are "450.50" strings, as on the marksheet.
 */
const getResults = async (auth: Auth, studentId: string) => {
  await ownChild(auth, studentId);
  const results = await prisma.examResult.findMany({
    where: { studentId, examClass: { status: "PUBLISHED" } },
    orderBy: { examClass: { publishedAt: "desc" } },
    select: {
      totalMarks: true,
      fullMarks: true,
      percentage: true,
      gpa: true,
      grade: true,
      passed: true,
      failedSubjects: true,
      examClass: {
        select: {
          publishedAt: true,
          class: { select: { id: true, name: true } },
          exam: { select: { id: true, nameEn: true, nameBn: true, academicYear: { select: { id: true, name: true } } } },
        },
      },
    },
  });
  return results.map(({ examClass: { exam, class: schoolClass, publishedAt }, ...result }) => ({
    exam: { id: exam.id, nameEn: exam.nameEn, nameBn: exam.nameBn },
    academicYear: exam.academicYear,
    class: schoolClass,
    publishedAt,
    ...result,
  }));
};

/* One published exam result of a child: the full marksheet, as the school prints it. */
const getResult = async (auth: Auth, studentId: string, examId: string) => {
  await ownChild(auth, studentId);
  const result = await prisma.examResult.findFirst({
    where: { studentId, examClass: { examId, status: "PUBLISHED" } },
    select: { enrollmentId: true },
  });
  if (!result) throw new AppError("No published result for this student in this exam", httpStatus.NOT_FOUND);
  return ExamResultService.getMarksheet(auth.schoolId!, { examId, enrollmentId: result.enrollmentId });
};

// ------------------------------------------------------------------ class routine

/*
 * A child's weekly routine this year: their section's classes, narrowed to the ones the child
 * sits (their group's subjects, their own religion's class, the 4th subject they chose), with
 * each period's time. Teachers by name and designation only. null when not on roll this year.
 */
const getRoutine = async (auth: Auth, studentId: string) => {
  await assertGuardian(auth);
  const schoolId = auth.schoolId!;
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId, userId: auth.userId },
    select: {
      religion: true,
      enrollments: {
        where: { academicYear: { isCurrent: true } },
        take: 1,
        select: { sectionId: true, groupId: true, academicYearId: true, optionalSubject: { select: { classSubjectId: true } } },
      },
    },
  });
  if (!student) throw new AppError("Student not found!", httpStatus.NOT_FOUND);
  const enrollment = student.enrollments[0];
  if (!enrollment) return null;

  const { entries, ...week } = await RoutineService.getSectionWeek(schoolId, {
    sectionId: enrollment.sectionId,
    academicYearId: enrollment.academicYearId,
  });
  const optionalId = enrollment.optionalSubject?.classSubjectId ?? null;

  return {
    ...week,
    entries: entries
      .filter(
        (e) =>
          (!e.group || e.group.id === enrollment.groupId) &&
          (!e.subject.religion || e.subject.religion === student.religion) &&
          (!e.isOptional || e.classSubjectId === optionalId),
      )
      .map(({ teacher, sections: _sections, class: _class, ...e }) => ({
        ...e,
        teacher: teacher && { nameEn: teacher.nameEn, nameBn: teacher.nameBn, designation: teacher.designation },
      })),
  };
};

export const FamilyService = { getHome, getAttendanceMonth, getResults, getResult, getRoutine };
