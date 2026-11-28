import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { writeAuditLog } from "../../shared/auditLog";
import { assertDeletable, blocker, deleteCheck } from "../../shared/deleteCheck";
import type { OptionalReasonQuery } from "../../shared/deleteSchemas";
import { isForeignKeyViolation } from "../../utils/prismaError";

/*
 * Deleting an academic year made by mistake (wrong dates, a duplicate). The current year too,
 * but only while nobody is enrolled in it and nothing happened in it: no fees,
 * attendance, exams or homework. The setup copied into it when it was made
 * (class subjects, subject teachers, routine, result settings, section settings, fee
 * structures, calendar entries) goes with it.
 */

type Db = Prisma.TransactionClient | typeof prisma;
type Auth = NonNullable<Express.Request["auth"]>;

const TX_OPTIONS = { maxWait: 10_000, timeout: 30_000 };

const check = async (db: Db, year: { id: string; isCurrent: boolean }) => {
  const academicYearId = year.id;
  const [enrollments, studentFees, attendance, exams, homework, classSubjects, subjectTeachers, routine, feeStructures, calendarEntries, sectionConfigs] =
    await Promise.all([
      db.enrollment.count({ where: { academicYearId } }),
      db.studentFee.count({ where: { academicYearId } }),
      db.attendanceSession.count({ where: { academicYearId } }),
      db.exam.count({ where: { academicYearId } }),
      db.homework.count({ where: { academicYearId } }),
      db.classSubject.count({ where: { academicYearId } }),
      db.subjectTeacher.count({ where: { academicYearId } }),
      db.routineEntry.count({ where: { academicYearId } }),
      db.feeStructure.count({ where: { academicYearId } }),
      db.calendarEntry.count({ where: { academicYearId } }),
      db.sectionYearConfig.count({ where: { academicYearId } }),
    ]);
  return deleteCheck(
    [
      blocker("enrollments", enrollments, `${enrollments} student(s) enrolled`),
      blocker("studentFees", studentFees, `${studentFees} student fee(s)`),
      blocker("attendanceDays", attendance, `${attendance} day(s) of attendance`),
      blocker("exams", exams, `${exams} exam(s)`),
      blocker("homework", homework, `${homework} homework`),
    ],
    { classSubjects, subjectTeachers, routine, feeStructures, calendarEntries, sectionConfigs },
  );
};

const findYear = async (db: Db, schoolId: string, academicYearId: string) => {
  const year = await db.academicYear.findFirst({ where: { id: academicYearId, schoolId } });
  if (!year) throw new AppError("Academic year not found", httpStatus.NOT_FOUND);
  return year;
};

const deleteCheckFor = async (schoolId: string, academicYearId: string) =>
  check(prisma, await findYear(prisma, schoolId, academicYearId));

const deleteAcademicYear = async (auth: Auth, academicYearId: string, query: OptionalReasonQuery) => {
  const schoolId = auth.schoolId!;
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "AcademicYear" WHERE "id" = ${academicYearId} AND "schoolId" = ${schoolId} FOR UPDATE`;
      const year = await findYear(tx, schoolId, academicYearId);
      const result = await check(tx, year);
      assertDeletable(result);

      await tx.academicYear.delete({ where: { id: academicYearId } });
      await writeAuditLog(tx, auth, {
        action: "academic_year.delete",
        entityType: "AcademicYear",
        entityId: academicYearId,
        summary: year.name,
        reason: query.reason,
        snapshot: { year, removedSetup: result.willRemove },
      });
      return { id: academicYearId };
    }, TX_OPTIONS);
  } catch (e) {
    if (isForeignKeyViolation(e)) {
      throw new AppError("This year still has records that must be kept, so it cannot be deleted", httpStatus.CONFLICT);
    }
    throw e;
  }
};

export const AcademicYearDeleteService = { deleteCheck: deleteCheckFor, deleteAcademicYear };
