import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { fileUrl } from "../../shared/storage";
import { idCardSettingsSchema, type IdCardSettings, type IdCardsQuery } from "./idCard.validation";

/*
 * Student ID cards: the school's chosen design, and one card per student on roll in a
 * year (narrowed to a class, section or one student) with the photo, name, father's name,
 * class, section, roll and a mobile number (the family login's, else the guardian's).
 */

const DEFAULT_TEXT = {
  EN: { backText: "This card belongs to the school. If found, please return it to the school office.", signatureLabel: "Head Teacher" },
  BN: { backText: "এই কার্ডটি বিদ্যালয়ের সম্পত্তি। কেউ পেলে অনুগ্রহ করে বিদ্যালয়ের অফিসে ফেরত দিন।", signatureLabel: "প্রধান শিক্ষক" },
} as const;

/* The design, every field filled in (the defaults where nothing was saved). */
const getSettings = async (schoolId: string): Promise<Required<IdCardSettings>> => {
  const [row, school] = await Promise.all([
    prisma.idCardSetting.findUnique({ where: { schoolId }, select: { settings: true } }),
    prisma.school.findUnique({ where: { id: schoolId }, select: { language: true } }),
  ]);
  const settings = idCardSettingsSchema.parse(row?.settings ?? {});
  const text = DEFAULT_TEXT[school?.language ?? "BN"];
  return { ...settings, backText: settings.backText ?? text.backText, signatureLabel: settings.signatureLabel ?? text.signatureLabel };
};

const saveSettings = async (schoolId: string, userId: string, data: IdCardSettings) => {
  const settings = data as unknown as Prisma.InputJsonValue;
  await prisma.idCardSetting.upsert({
    where: { schoolId },
    create: { schoolId, settings, updatedBy: userId },
    update: { settings, updatedBy: userId },
  });
  return getSettings(schoolId);
};

const roll = (r: string | null) => (r && /^\d+$/.test(r) ? Number(r) : Number.MAX_SAFE_INTEGER);

const getCards = async (schoolId: string, query: IdCardsQuery) => {
  const year = query.academicYearId
    ? await prisma.academicYear.findFirst({ where: { id: query.academicYearId, schoolId }, select: { id: true, name: true, startDate: true, endDate: true } })
    : await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true }, select: { id: true, name: true, startDate: true, endDate: true } });
  if (!year) throw new AppError(query.academicYearId ? "Academic year not found!" : "Set the current academic year first", httpStatus.BAD_REQUEST);

  const [school, settings, enrollments] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { nameEn: true, nameBn: true, logo: true, address: true, phone: true, email: true, website: true } }),
    getSettings(schoolId),
    prisma.enrollment.findMany({
      where: {
        academicYearId: year.id,
        status: "ACTIVE",
        student: { schoolId, status: "ACTIVE" },
        ...(query.classId ? { classId: query.classId } : {}),
        ...(query.sectionId ? { sectionId: query.sectionId } : {}),
        ...(query.enrollmentId ? { id: query.enrollmentId } : {}),
      },
      select: {
        id: true,
        rollNumber: true,
        class: { select: { id: true, name: true, numericLevel: true } },
        section: { select: { id: true, name: true, isDefault: true } },
        group: { select: { id: true, nameEn: true, nameBn: true } },
        student: { select: { id: true, nameEn: true, nameBn: true, fatherName: true, admissionNo: true, photo: true, phone: true, guardianPhone: true } },
      },
    }),
  ]);

  enrollments.sort(
    (a, b) =>
      a.class.numericLevel - b.class.numericLevel ||
      a.section.name.localeCompare(b.section.name) ||
      roll(a.rollNumber) - roll(b.rollNumber) ||
      a.student.nameEn.localeCompare(b.student.nameEn),
  );

  const cards = await Promise.all(
    enrollments.map(async ({ student: { phone, guardianPhone, photo, ...student }, ...e }) => ({
      ...e,
      student: { ...student, photo: await fileUrl(photo), mobile: phone ?? guardianPhone ?? null },
    })),
  );

  return {
    school: school && { ...school, logo: await fileUrl(school.logo) },
    settings,
    academicYear: year,
    cards,
  };
};

/* The school's name, logo and contacts, as printed on the cards (for the design previews). */
const getSchool = async (schoolId: string) => {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { nameEn: true, nameBn: true, logo: true, address: true, phone: true, email: true, website: true },
  });
  if (!school) throw new AppError("School not found!", httpStatus.NOT_FOUND);
  return { ...school, logo: await fileUrl(school.logo) };
};

export const IdCardService = { getSettings, saveSettings, getCards, getSchool };
