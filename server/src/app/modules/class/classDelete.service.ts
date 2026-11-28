import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { writeAuditLog } from "../../shared/auditLog";
import { deleteCheck } from "../../shared/deleteCheck";
import type { OptionalReasonQuery } from "../../shared/deleteSchemas";
import { countEnrollmentRecords, deleteEnrollments, feeWithMoney, untouchedFee } from "../../shared/moneyGuard";
import { deleteExamClasses } from "../exam/examDelete.service";
import { DEFAULT_SECTION_NAME } from "./class.service";

/*
 * Deleting a class or a section, with everything set up for it and done in it (the super
 * admin only, see the routes). Its students stay: they lose that placement (with its
 * attendance, marks, results and unpaid fees) and show as not placed, to be placed again or
 * deleted on their own. Fees with money data stay with the student, detached from the class.
 */

type Db = Prisma.TransactionClient | typeof prisma;
type Auth = NonNullable<Express.Request["auth"]>;

const TX_OPTIONS = { maxWait: 10_000, timeout: 120_000 };

// --------------------------------------------------------------------- class

const findClass = async (db: Db, schoolId: string, classId: string) => {
  const klass = await db.schoolClass.findFirst({ where: { id: classId, schoolId } });
  if (!klass) throw new AppError("Class not found", httpStatus.NOT_FOUND);
  return klass;
};

// the class fees of the class (custom fees belong to the student and stay)
const classFees = (classId: string): Prisma.StudentFeeWhereInput => ({
  feeStructureId: { not: null },
  OR: [{ classId }, { feeStructure: { classId } }],
});

const classCheck = async (db: Db, classId: string) => {
  const [records, students, sections, examClasses, feeStructures, unpaidFees, feesKept, classSubjects, routine, homework] =
    await Promise.all([
      countEnrollmentRecords(db, { classId }),
      db.student.count({ where: { enrollments: { some: { classId } } } }),
      db.section.count({ where: { classId, isDefault: false } }),
      db.examClass.count({ where: { classId } }),
      db.feeStructure.count({ where: { classId } }),
      db.studentFee.count({ where: { ...classFees(classId), ...untouchedFee } }),
      db.studentFee.count({ where: { AND: [classFees(classId), feeWithMoney] } }),
      db.classSubject.count({ where: { classId } }),
      db.routineEntry.count({ where: { classId } }),
      db.homework.count({ where: { classId } }),
    ]);
  return deleteCheck([], {
    studentsUnplaced: students,
    ...records,
    sections,
    examClasses,
    feeStructures,
    unpaidFees,
    classSubjects,
    routine,
    homework,
    feesKept,
  });
};

const classDeleteCheck = async (schoolId: string, classId: string) => {
  await findClass(prisma, schoolId, classId);
  return classCheck(prisma, classId);
};

const deleteClass = async (auth: Auth, classId: string, query: OptionalReasonQuery) => {
  const schoolId = auth.schoolId!;
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "SchoolClass" WHERE "id" = ${classId} AND "schoolId" = ${schoolId} FOR UPDATE`;
    const klass = await findClass(tx, schoolId, classId);
    const result = await classCheck(tx, classId);

    // the students' placements here, with what hangs on them
    await deleteEnrollments(tx, { classId });
    await tx.attendanceSession.deleteMany({ where: { section: { classId } } });

    // its place in exams; an exam left with no class goes too
    const examClasses = await tx.examClass.findMany({ where: { classId }, select: { id: true, examId: true } });
    const examIds = [...new Set(examClasses.map((c) => c.examId))];
    await deleteExamClasses(tx, examClasses.map((c) => c.id));
    const emptyExams = await tx.exam.findMany({ where: { id: { in: examIds }, classes: { none: {} } }, select: { id: true } });
    await tx.exam.deleteMany({ where: { id: { in: emptyExams.map((e) => e.id) } } });

    // the fees nobody paid
    await tx.studentFee.deleteMany({ where: { ...classFees(classId), ...untouchedFee } });

    // sections, subjects, routine, fee setup, result settings, homework... go by cascade
    await tx.schoolClass.delete({ where: { id: classId } });

    await writeAuditLog(tx, auth, {
      action: "class.delete",
      entityType: "SchoolClass",
      entityId: classId,
      summary: klass.name,
      reason: query.reason,
      snapshot: { class: klass, removed: result.willRemove, emptyExams: emptyExams.length },
    });
  }, TX_OPTIONS);
  return { id: classId };
};

// --------------------------------------------------------------------- section

const findSection = async (db: Db, schoolId: string, sectionId: string) => {
  const section = await db.section.findFirst({ where: { id: sectionId, schoolId }, include: { class: { select: { id: true, name: true } } } });
  if (!section) throw new AppError("Section not found", httpStatus.NOT_FOUND);
  return section;
};

const sectionCheck = async (db: Db, sectionId: string) => {
  const [records, attendanceDays] = await Promise.all([
    countEnrollmentRecords(db, { sectionId }),
    db.attendanceSession.count({ where: { sectionId } }),
  ]);
  return deleteCheck([], { studentsUnplaced: records.enrollments, ...records, attendanceDays });
};

const sectionDeleteCheck = async (schoolId: string, sectionId: string) => {
  await findSection(prisma, schoolId, sectionId);
  return sectionCheck(prisma, sectionId);
};

/* A class is never left without a section: deleting its last one brings back the automatic one. */
const deleteSection = async (auth: Auth, sectionId: string, query: OptionalReasonQuery) => {
  const schoolId = auth.schoolId!;
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Section" WHERE "id" = ${sectionId} AND "schoolId" = ${schoolId} FOR UPDATE`;
    const section = await findSection(tx, schoolId, sectionId);
    const result = await sectionCheck(tx, sectionId);

    await deleteEnrollments(tx, { sectionId });
    await tx.attendanceSession.deleteMany({ where: { sectionId } });
    // its year settings, routine links, subject teachers and homework targets go by cascade
    await tx.section.delete({ where: { id: sectionId } });
    if ((await tx.section.count({ where: { schoolId, classId: section.classId } })) === 0) {
      await tx.section.create({ data: { schoolId, classId: section.classId, name: DEFAULT_SECTION_NAME, isDefault: true } });
    }

    await writeAuditLog(tx, auth, {
      action: "section.delete",
      entityType: "Section",
      entityId: sectionId,
      summary: section.isDefault ? section.class.name : `${section.class.name} ${section.name}`,
      reason: query.reason,
      snapshot: { section, removed: result.willRemove },
    });
  }, TX_OPTIONS);
  return { id: sectionId };
};

export const ClassDeleteService = { classDeleteCheck, deleteClass, sectionDeleteCheck, deleteSection };
