import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { dayKey } from "../../shared/scheduleSchemas";
import { GUARDIAN_ROLE } from "../../shared/schoolAccounts";
import { fileUrl } from "../../shared/storage";
import { ResultCardService } from "../exam/resultCard.service";
import { NotificationService, notifyInBackground } from "../notification/notification.service";
import type { AdmitSettingsPayload, CardsQuery } from "./admitCard.validation";

/*
 * Admit cards for an exam: one per student on roll in the exam's classes, with the photo,
 * class, roll, the exam's days for that class, the room and seat from the seat plan (when
 * there is one), the school's rules and signature lines. The colour, logo and address come
 * from the result card design. Families see their child's card once the school releases
 * the exam's admit cards.
 */

type Auth = NonNullable<Express.Request["auth"]>;

const DEFAULT_SIGNATURES = {
  EN: ["Class Teacher", "Head Teacher"],
  BN: ["শ্রেণি শিক্ষক", "প্রধান শিক্ষক"],
} as const;

const DEFAULT_RULES = {
  EN: [
    "Bring this admit card to every exam.",
    "Be in your seat 15 minutes before the exam starts.",
    "Phones, notes and papers are not allowed in the exam room.",
  ],
  BN: ["প্রতিটি পরীক্ষায় এই প্রবেশপত্র সঙ্গে আনতে হবে।", "পরীক্ষা শুরুর ১৫ মিনিট আগে নিজের আসনে বসতে হবে।", "পরীক্ষার কক্ষে মোবাইল, নোট বা কাগজ আনা যাবে না।"],
} as const;

// ------------------------------------------------------------------ settings

const getSettings = async (schoolId: string) => {
  const [row, school] = await Promise.all([
    prisma.admitCardSetting.findUnique({ where: { schoolId }, select: { rules: true, signatures: true } }),
    prisma.school.findUnique({ where: { id: schoolId }, select: { language: true } }),
  ]);
  const language = school?.language ?? "BN";
  if (!row) return { rules: DEFAULT_RULES[language].join("\n"), signatures: [...DEFAULT_SIGNATURES[language]] };
  return { rules: row.rules, signatures: row.signatures as string[] };
};

const saveSettings = async (schoolId: string, userId: string, data: AdmitSettingsPayload) => {
  await prisma.admitCardSetting.upsert({
    where: { schoolId },
    create: { schoolId, rules: data.rules, signatures: data.signatures, updatedBy: userId },
    update: { rules: data.rules, signatures: data.signatures, updatedBy: userId },
  });
  return getSettings(schoolId);
};

// --------------------------------------------------------------------- cards

const enrollmentSelect = {
  id: true,
  rollNumber: true,
  classId: true,
  class: { select: { id: true, name: true, numericLevel: true } },
  section: { select: { id: true, name: true, isDefault: true } },
  group: { select: { id: true, nameEn: true, nameBn: true } },
  student: { select: { id: true, nameEn: true, nameBn: true, admissionNo: true, fatherName: true, motherName: true, photo: true } },
} satisfies Prisma.EnrollmentSelect;

type EnrollmentRow = Prisma.EnrollmentGetPayload<{ select: typeof enrollmentSelect }>;

const loadExam = async (schoolId: string, examId: string) => {
  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId },
    select: {
      id: true,
      nameEn: true,
      nameBn: true,
      academicYearId: true,
      admitCardsReleasedAt: true,
      academicYear: { select: { id: true, name: true } },
      classes: { select: { id: true, classId: true } },
    },
  });
  if (!exam) throw new AppError("Exam not found!", httpStatus.NOT_FOUND);
  return exam;
};

type ExamRow = Awaited<ReturnType<typeof loadExam>>;

/* The page around the cards (school, design, rules) and one card per enrollment. */
const buildCards = async (schoolId: string, exam: ExamRow, enrollments: EnrollmentRow[]) => {
  const [school, design, settings, days, seats] = await Promise.all([
    prisma.school.findUnique({
      where: { id: schoolId },
      select: { nameEn: true, nameBn: true, logo: true, address: true, phone: true, email: true, website: true },
    }),
    ResultCardService.getSettings(schoolId),
    getSettings(schoolId),
    // each class's first and last exam day
    prisma.examSubject.groupBy({ by: ["examClassId"], where: { examClass: { examId: exam.id } }, _min: { date: true }, _max: { date: true } }),
    prisma.seat.findMany({
      where: { plan: { examId: exam.id }, enrollmentId: { in: enrollments.map((e) => e.id) } },
      select: { enrollmentId: true, seatNo: true, room: { select: { number: true, building: true } } },
    }),
  ]);
  const examClassOf = new Map(exam.classes.map((c) => [c.classId, c.id]));
  const dayOf = new Map(days.map((d) => [d.examClassId, d]));
  const seatOf = new Map(seats.map((s) => [s.enrollmentId, s]));

  const cards = await Promise.all(
    enrollments.map(async (e) => {
      const range = dayOf.get(examClassOf.get(e.classId) ?? "");
      const seat = seatOf.get(e.id);
      return {
        enrollmentId: e.id,
        student: { ...e.student, photo: await fileUrl(e.student.photo) },
        rollNumber: e.rollNumber,
        class: e.class,
        section: e.section,
        group: e.group,
        firstDay: range?._min.date ? dayKey(range._min.date) : null,
        lastDay: range?._max.date ? dayKey(range._max.date) : null,
        seat: seat ? { room: seat.room.number, building: seat.room.building, seatNo: seat.seatNo } : null,
      };
    }),
  );

  return {
    school: school && { ...school, logo: await fileUrl(school.logo) },
    design: { accentColor: design.accentColor, showLogo: design.showLogo, showAddress: design.showAddress },
    rules: settings.rules
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean),
    signatures: settings.signatures,
    exam: { id: exam.id, nameEn: exam.nameEn, nameBn: exam.nameBn, academicYear: exam.academicYear, releasedAt: exam.admitCardsReleasedAt },
    cards,
  };
};

const roll = (r: string | null) => (r && /^\d+$/.test(r) ? Number(r) : Number.MAX_SAFE_INTEGER);

/* The exam's admit cards, by class, section and roll; narrowed to a class, section or student. */
const getCards = async (schoolId: string, examId: string, query: CardsQuery) => {
  const exam = await loadExam(schoolId, examId);
  const classIds = exam.classes.map((c) => c.classId);
  if (query.classId && !classIds.includes(query.classId)) throw new AppError("This class is not in the exam", httpStatus.BAD_REQUEST);

  const enrollments = await prisma.enrollment.findMany({
    where: {
      academicYearId: exam.academicYearId,
      classId: query.classId ?? { in: classIds },
      status: "ACTIVE",
      student: { status: "ACTIVE", schoolId },
      ...(query.sectionId ? { sectionId: query.sectionId } : {}),
      ...(query.enrollmentId ? { id: query.enrollmentId } : {}),
    },
    select: enrollmentSelect,
  });
  enrollments.sort(
    (a, b) =>
      a.class.numericLevel - b.class.numericLevel ||
      a.section.name.localeCompare(b.section.name) ||
      roll(a.rollNumber) - roll(b.rollNumber) ||
      a.student.nameEn.localeCompare(b.student.nameEn),
  );
  return buildCards(schoolId, exam, enrollments);
};

/* Lets families see (or stop seeing) the exam's admit cards in the app. */
const setReleased = async (schoolId: string, examId: string, released: boolean) => {
  await loadExam(schoolId, examId);
  await prisma.exam.update({ where: { id: examId }, data: { admitCardsReleasedAt: released ? new Date() : null } });
  // released: each family hears; hidden again: those messages go
  notifyInBackground("admit cards", () => NotificationService.syncAdmitCards(schoolId, examId, released));
  return { released };
};

// ------------------------------------------------------------------ family

/* The exams with released admit cards for a child's class: for the family home. */
export const releasedForEnrollment = (enrollment: { academicYearId: string; classId: string }) =>
  prisma.exam.findMany({
    where: { academicYearId: enrollment.academicYearId, admitCardsReleasedAt: { not: null }, classes: { some: { classId: enrollment.classId } } },
    orderBy: { admitCardsReleasedAt: "desc" },
    select: { id: true, nameEn: true, nameBn: true },
  });

/* One child's admit card for one exam, when the school has released it. */
const familyCard = async (auth: Auth, studentId: string, examId: string) => {
  const schoolId = auth.schoolId!;
  const guardian = auth.membershipId
    ? await prisma.userRole.findFirst({
        where: { userId: auth.userId, membershipId: auth.membershipId, role: { scope: "SCHOOL", name: GUARDIAN_ROLE.name, isSystem: true } },
        select: { id: true },
      })
    : null;
  const exam = guardian ? await prisma.exam.findFirst({ where: { id: examId, schoolId, admitCardsReleasedAt: { not: null } }, select: { id: true } }) : null;
  if (!exam) throw new AppError("Admit card not found!", httpStatus.NOT_FOUND);
  const full = await loadExam(schoolId, examId);

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      academicYearId: full.academicYearId,
      classId: { in: full.classes.map((c) => c.classId) },
      status: "ACTIVE",
      student: { id: studentId, schoolId, userId: auth.userId },
    },
    select: enrollmentSelect,
  });
  if (!enrollment) throw new AppError("Admit card not found!", httpStatus.NOT_FOUND);
  return buildCards(schoolId, full, [enrollment]);
};

export const AdmitCardService = { getSettings, saveSettings, getCards, setReleased, familyCard };
