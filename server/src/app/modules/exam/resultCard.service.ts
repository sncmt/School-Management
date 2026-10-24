import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { checkPermission } from "../../middlewares/authorize";
import { fileUrl } from "../../shared/storage";
import { attendancePercent, findExamClass } from "./examResult.service";
import { loadExamStudents } from "./examStudents";
import {
  cardSettingsSchema,
  type CardSettings,
  type CardsQuery,
  type RemarksQuery,
  type SaveRemarksPayload,
} from "./resultCard.validation";

type Auth = NonNullable<Express.Request["auth"]>;

const DEFAULT_SIGNATURES = {
  EN: ["Class Teacher", "Guardian", "Head Teacher"],
  BN: ["শ্রেণি শিক্ষক", "অভিভাবক", "প্রধান শিক্ষক"],
} as const;

// ------------------------------------------------------------------ settings

/* The school's card design, every field filled in (the defaults where nothing was saved). */
const getSettings = async (schoolId: string): Promise<CardSettings & { signatures: string[] }> => {
  const [row, school] = await Promise.all([
    prisma.resultCardSetting.findUnique({ where: { schoolId }, select: { settings: true } }),
    prisma.school.findUnique({ where: { id: schoolId }, select: { language: true } }),
  ]);
  const settings = cardSettingsSchema.parse(row?.settings ?? {});
  return { ...settings, signatures: settings.signatures ?? [...DEFAULT_SIGNATURES[school?.language ?? "BN"]] };
};

const saveSettings = async (schoolId: string, userId: string, data: CardSettings) => {
  const settings = data as unknown as Prisma.InputJsonValue;
  await prisma.resultCardSetting.upsert({
    where: { schoolId },
    create: { schoolId, settings, updatedBy: userId },
    update: { settings, updatedBy: userId },
  });
  return getSettings(schoolId);
};

// --------------------------------------------------------------------- cards

const resultInclude = {
  subjects: { orderBy: { sortOrder: "asc" } },
  student: { select: { id: true, nameEn: true, nameBn: true, admissionNo: true, photo: true, fatherName: true, motherName: true } },
  enrollment: {
    select: {
      rollNumber: true,
      section: { select: { id: true, name: true, isDefault: true } },
      group: { select: { id: true, nameEn: true, nameBn: true } },
    },
  },
} satisfies Prisma.ExamResultInclude;

/*
 * Result cards of a published class result: one student, one section or the whole class,
 * with the school's card design, the top marks of each subject (in the section and in the
 * class), positions out of how many, attendance and the class teacher's remark.
 */
const getCards = async (schoolId: string, query: CardsQuery) => {
  const examClass = await findExamClass(schoolId, query.examId, query.classId);
  if (examClass.status !== "PUBLISHED") throw new AppError("The result has not been published yet", httpStatus.CONFLICT);

  const [all, school, settings, remarks] = await Promise.all([
    prisma.examResult.findMany({ where: { examClassId: examClass.id }, include: resultInclude }),
    prisma.school.findUnique({
      where: { id: schoolId },
      select: { nameEn: true, nameBn: true, logo: true, address: true, phone: true, email: true, website: true, language: true },
    }),
    getSettings(schoolId),
    prisma.examRemark.findMany({ where: { examClassId: examClass.id }, select: { enrollmentId: true, remark: true } }),
  ]);
  const remarkOf = new Map(remarks.map((r) => [r.enrollmentId, r.remark]));

  // the top marks of each subject line, in the class and in each section (absent left out)
  const classTop = new Map<string, number>();
  const sectionTop = new Map<string, number>();
  for (const r of all) {
    for (const s of r.subjects) {
      if (s.marks === null) continue;
      const m = Number(s.marks);
      classTop.set(s.subjectId, Math.max(classTop.get(s.subjectId) ?? 0, m));
      const k = `${r.sectionId}:${s.subjectId}`;
      sectionTop.set(k, Math.max(sectionTop.get(k) ?? 0, m));
    }
  }
  const sectionCount = new Map<string, number>();
  for (const r of all) sectionCount.set(r.sectionId, (sectionCount.get(r.sectionId) ?? 0) + 1);

  const shown = all
    .filter((r) => (!query.sectionId || r.sectionId === query.sectionId) && (!query.enrollmentId || r.enrollmentId === query.enrollmentId))
    .sort(
      (a, b) =>
        a.enrollment.section.name.localeCompare(b.enrollment.section.name) ||
        (a.enrollment.rollNumber ?? "").localeCompare(b.enrollment.rollNumber ?? "", undefined, { numeric: true }),
    );
  if (query.enrollmentId && shown.length === 0) {
    throw new AppError("No published result for this student in this exam", httpStatus.NOT_FOUND);
  }

  const rules = examClass.resultRules as { attendancePeriod?: { from: string; to: string } } | null;

  return {
    settings,
    school: school && { ...school, logo: await fileUrl(school.logo) },
    exam: { id: examClass.exam.id, nameEn: examClass.exam.nameEn, nameBn: examClass.exam.nameBn },
    academicYear: { id: examClass.exam.academicYear.id, name: examClass.exam.academicYear.name },
    class: examClass.class,
    publishedAt: examClass.publishedAt,
    attendancePeriod: rules?.attendancePeriod ?? null,
    // the grading tables used (absent for a marks-only result)
    gradingReference: examClass.resultRules,
    cards: await Promise.all(
      shown.map(async ({ subjects, student, enrollment, ...r }) => ({
        enrollmentId: r.enrollmentId,
        student: { ...student, photo: await fileUrl(student.photo) },
        rollNumber: enrollment.rollNumber,
        section: enrollment.section,
        group: enrollment.group,
        totalMarks: r.totalMarks,
        fullMarks: r.fullMarks,
        percentage: r.percentage,
        gpa: r.gpa,
        grade: r.grade,
        passed: r.passed,
        failedSubjects: r.failedSubjects,
        position: {
          section: r.sectionPosition,
          sectionOutOf: sectionCount.get(r.sectionId) ?? 0,
          class: r.classPosition,
          classOutOf: all.length,
        },
        attendance: {
          workingDays: r.attendanceDays,
          present: r.attendancePresent,
          absent: r.attendanceAbsent,
          leave: r.attendanceLeave,
          percentage: attendancePercent(r),
        },
        remark: remarkOf.get(r.enrollmentId) ?? null,
        subjects: subjects.map((s) => ({
          ...s,
          highestInSection: sectionTop.get(`${r.sectionId}:${s.subjectId}`) ?? null,
          highestInClass: classTop.get(s.subjectId) ?? null,
        })),
      })),
    ),
  };
};

// ------------------------------------------------------------------- remarks

/* The section's class teacher for the exam's year, or anyone who may enter any marks. */
const canWriteRemarks = async (auth: Auth, sectionId: string, academicYearId: string) => {
  if ((await checkPermission(auth, "exam:enter_marks")) === "OK") return true;
  if (!auth.membershipId) return false;
  const config = await prisma.sectionYearConfig.findUnique({
    where: { sectionId_academicYearId: { sectionId, academicYearId } },
    select: { classTeacherMembershipId: true },
  });
  return config?.classTeacherMembershipId === auth.membershipId;
};

const findSection = async (schoolId: string, classId: string, sectionId: string) => {
  const section = await prisma.section.findFirst({ where: { id: sectionId, schoolId, classId }, select: { id: true, name: true, isDefault: true } });
  if (!section) throw new AppError("Section not found in this class", httpStatus.NOT_FOUND);
  return section;
};

/* The section's students in the exam, with their remark and (once published) their result. */
const getRemarks = async (auth: Auth, query: RemarksQuery) => {
  const schoolId = auth.schoolId!;
  const examClass = await findExamClass(schoolId, query.examId, query.classId);
  const section = await findSection(schoolId, query.classId, query.sectionId);

  // the class teacher and marks staff (who may also write them), or staff who see results
  const canEdit = await canWriteRemarks(auth, section.id, examClass.exam.academicYear.id);
  if (!canEdit && (await checkPermission(auth, "exam:view_result")) !== "OK") {
    throw new AppError("You can't see this section's remarks", httpStatus.FORBIDDEN);
  }

  const [{ students }, remarks, results] = await Promise.all([
    loadExamStudents(prisma, examClass.id, { sectionId: section.id }),
    prisma.examRemark.findMany({ where: { examClassId: examClass.id }, select: { enrollmentId: true, remark: true } }),
    prisma.examResult.findMany({
      where: { examClassId: examClass.id, sectionId: section.id },
      select: { enrollmentId: true, gpa: true, grade: true, passed: true, totalMarks: true, sectionPosition: true },
    }),
  ]);
  const remarkOf = new Map(remarks.map((r) => [r.enrollmentId, r.remark]));
  const resultOf = new Map(results.map((r) => [r.enrollmentId, r]));

  return {
    exam: { id: examClass.exam.id, nameEn: examClass.exam.nameEn, nameBn: examClass.exam.nameBn },
    class: examClass.class,
    section,
    status: examClass.status,
    canEdit,
    students: students.map((s) => ({
      enrollmentId: s.enrollmentId,
      rollNumber: s.rollNumber,
      student: { id: s.student.id, nameEn: s.student.nameEn, nameBn: s.student.nameBn, admissionNo: s.student.admissionNo },
      remark: remarkOf.get(s.enrollmentId) ?? null,
      result: resultOf.get(s.enrollmentId) ?? null,
    })),
  };
};

const saveRemarks = async (auth: Auth, data: SaveRemarksPayload) => {
  const schoolId = auth.schoolId!;
  const examClass = await findExamClass(schoolId, data.examId, data.classId);
  const section = await findSection(schoolId, data.classId, data.sectionId);
  if (!(await canWriteRemarks(auth, section.id, examClass.exam.academicYear.id))) {
    throw new AppError("Only this section's class teacher can write its remarks", httpStatus.FORBIDDEN);
  }

  const { students } = await loadExamStudents(prisma, examClass.id, { sectionId: section.id });
  const inSection = new Set(students.map((s) => s.enrollmentId));
  if (data.remarks.some((r) => !inSection.has(r.enrollmentId))) {
    throw new AppError("One or more students are not in this section for the exam", httpStatus.BAD_REQUEST);
  }

  await prisma.$transaction(async (tx) => {
    for (const r of data.remarks) {
      const where = { examClassId_enrollmentId: { examClassId: examClass.id, enrollmentId: r.enrollmentId } };
      if (r.remark) {
        await tx.examRemark.upsert({
          where,
          create: { examClassId: examClass.id, enrollmentId: r.enrollmentId, remark: r.remark, writtenBy: auth.userId },
          update: { remark: r.remark, writtenBy: auth.userId },
        });
      } else {
        await tx.examRemark.deleteMany({ where: { examClassId: examClass.id, enrollmentId: r.enrollmentId } });
      }
    }
  });

  return getRemarks(auth, { examId: data.examId, classId: data.classId, sectionId: data.sectionId });
};

export const ResultCardService = { getSettings, saveSettings, getCards, getRemarks, saveRemarks };
