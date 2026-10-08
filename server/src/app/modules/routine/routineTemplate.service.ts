import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { isUniqueViolation } from "../../utils/prismaError";
import type { TemplatePayload } from "./routine.validation";

const DUPLICATE_MESSAGE = "A period template with this name already exists";

const templateInclude = {
  periods: { orderBy: { number: "asc" } },
  _count: { select: { sectionConfigs: true, overrideRules: true } },
} satisfies Prisma.PeriodTemplateInclude;

const findTemplate = async (schoolId: string, templateId: string) => {
  const template = await prisma.periodTemplate.findFirst({ where: { id: templateId, schoolId }, include: templateInclude });
  if (!template) throw new AppError("Period template not found", httpStatus.NOT_FOUND);
  return template;
};

const assertNameFree = async (schoolId: string, nameEn: string, excludeId?: string) => {
  const clash = await prisma.periodTemplate.findFirst({
    where: { schoolId, nameEn: { equals: nameEn, mode: "insensitive" }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (clash) throw new AppError(DUPLICATE_MESSAGE, httpStatus.CONFLICT);
};

const createTemplate = async (schoolId: string, data: TemplatePayload) => {
  await assertNameFree(schoolId, data.nameEn);
  try {
    return await prisma.periodTemplate.create({
      data: { schoolId, nameEn: data.nameEn, nameBn: data.nameBn, periods: { create: data.periods } },
      include: templateInclude,
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError(DUPLICATE_MESSAGE, httpStatus.CONFLICT);
    throw e;
  }
};

const getTemplates = (schoolId: string) =>
  prisma.periodTemplate.findMany({ where: { schoolId }, orderBy: { nameEn: "asc" }, include: templateInclude });

const getTemplateById = (schoolId: string, templateId: string) => findTemplate(schoolId, templateId);

/*
 * Replaces the name and periods. Times can change freely (the routine follows them); a
 * period that routine classes sit in cannot disappear or become a break.
 */
const updateTemplate = async (schoolId: string, templateId: string, data: TemplatePayload) => {
  const template = await findTemplate(schoolId, templateId);
  if (data.nameEn !== template.nameEn) await assertNameFree(schoolId, data.nameEn, templateId);

  const kept = new Set(data.periods.filter((p) => !p.isBreak).map((p) => p.number));
  const lost = template.periods.filter((p) => !p.isBreak && !kept.has(p.number)).map((p) => p.number);
  if (lost.length > 0) {
    // the sections that use this template, in each year
    const users = await prisma.sectionYearConfig.findMany({
      where: { periodTemplateId: templateId },
      select: { sectionId: true, academicYearId: true },
    });
    const inUse = users.length
      ? await prisma.routineEntry.findFirst({
          where: {
            periodNumber: { in: lost },
            OR: users.map((u) => ({ academicYearId: u.academicYearId, sections: { some: { sectionId: u.sectionId } } })),
          },
          select: { periodNumber: true },
        })
      : null;
    if (inUse) {
      throw new AppError(
        `Period ${inUse.periodNumber} has classes in the routine, so it cannot be removed or made a break`,
        httpStatus.CONFLICT,
      );
    }
  }

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.templatePeriod.deleteMany({ where: { templateId } });
      return tx.periodTemplate.update({
        where: { id: templateId },
        data: { nameEn: data.nameEn, nameBn: data.nameBn, periods: { create: data.periods } },
        include: templateInclude,
      });
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError(DUPLICATE_MESSAGE, httpStatus.CONFLICT);
    throw e;
  }
};

/* Only a template no section and no schedule change uses. */
const deleteTemplate = async (schoolId: string, templateId: string) => {
  const template = await findTemplate(schoolId, templateId);
  if (template._count.sectionConfigs > 0 || template._count.overrideRules > 0) {
    throw new AppError("Sections or schedule changes use this template. Change them first", httpStatus.CONFLICT);
  }
  await prisma.periodTemplate.delete({ where: { id: templateId } });
};

export const RoutineTemplateService = {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
};
