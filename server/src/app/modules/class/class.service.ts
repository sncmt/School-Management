import httpStatus from "http-status";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { isForeignKeyViolation, isUniqueViolation } from "../../utils/prismaError";
import type { ClassQuery, CreateClassPayload, UpdateClassPayload } from "./class.type";

export const DEFAULT_SECTION_NAME = "Default";

const DUPLICATE_MESSAGE = "Class name already exists!";

// ------------------------------------------------------------------- helpers

const findClass = async (schoolId: string, classId: string) => {
  const schoolClass = await prisma.schoolClass.findFirst({ where: { id: classId, schoolId } });
  if (!schoolClass) throw new AppError("Class not found", httpStatus.NOT_FOUND);
  return schoolClass;
};

/* "Class 6" and "class 6" are the same name. */
const assertNameFree = async (schoolId: string, name: string, excludeId?: string) => {
  const clash = await prisma.schoolClass.findFirst({
    where: { schoolId, name: { equals: name, mode: "insensitive" }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (clash) throw new AppError(DUPLICATE_MESSAGE, httpStatus.CONFLICT);
};

/* The given year, or the current one when none is given. null when the school has no current year. */
const resolveYear = async (schoolId: string, academicYearId?: string) => {
  const year = academicYearId
    ? await prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId }, select: { id: true, name: true } })
    : await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true }, select: { id: true, name: true } });

  if (academicYearId && !year) {
    throw new AppError("Academic year not found for this school", httpStatus.NOT_FOUND);
  }
  return year;
};

const sectionsSelect = {
  select: { id: true, name: true, isDefault: true },
  orderBy: { name: "asc" as const },
};

// -------------------------------------------------------------------- create

const createClass = async (schoolId: string, payload: CreateClassPayload) => {
  const { name, numericLevel } = payload;
  await assertNameFree(schoolId, name);

  try {
    return await prisma.$transaction(async (tx) => {
      const schoolClass = await tx.schoolClass.create({ data: { schoolId, name, numericLevel } });

      // Every class needs a section, because enrollments, roll numbers, the class teacher
      // and the class hours all belong to a section. It makes way for real sections later.
      const defaultSection = await tx.section.create({
        data: { schoolId, classId: schoolClass.id, name: DEFAULT_SECTION_NAME, isDefault: true },
        select: { id: true, name: true, isDefault: true },
      });

      return { ...schoolClass, defaultSection };
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError(DUPLICATE_MESSAGE, httpStatus.CONFLICT);
    throw e;
  }
};

// ------------------------------------------------------------------- reading

/** Classes by level, each with its sections and active students in the year. */
const getClasses = async (schoolId: string, query: ClassQuery) => {
  const year = await resolveYear(schoolId, query.academicYearId);

  const [classes, counts] = await Promise.all([
    prisma.schoolClass.findMany({
      where: { schoolId },
      orderBy: [{ numericLevel: "asc" }, { name: "asc" }],
      include: { sections: sectionsSelect },
    }),
    year
      ? prisma.enrollment.groupBy({
          by: ["classId"],
          where: { academicYearId: year.id, status: "ACTIVE", class: { schoolId } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  const studentsBy = new Map(counts.map((c) => [c.classId, c._count._all]));

  return {
    academicYear: year,
    items: classes.map((c) => ({ ...c, activeStudents: year ? (studentsBy.get(c.id) ?? 0) : null })),
  };
};

const getClassById = async (schoolId: string, classId: string) => {
  await findClass(schoolId, classId);
  return prisma.schoolClass.findUniqueOrThrow({ where: { id: classId }, include: { sections: sectionsSelect } });
};

// -------------------------------------------------------------------- update

const updateClass = async (schoolId: string, classId: string, data: UpdateClassPayload) => {
  const schoolClass = await findClass(schoolId, classId);
  if (data.name !== undefined && data.name.toLowerCase() !== schoolClass.name.toLowerCase()) {
    await assertNameFree(schoolId, data.name, classId);
  }

  try {
    return await prisma.schoolClass.update({
      where: { id: classId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.numericLevel !== undefined ? { numericLevel: data.numericLevel } : {}),
      },
      include: { sections: sectionsSelect },
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError(DUPLICATE_MESSAGE, httpStatus.CONFLICT);
    throw e;
  }
};

// -------------------------------------------------------------------- delete

/*
 * Hard delete, only while nothing uses the class: no student was ever enrolled in it and
 * no subjects, exams, fees, result settings or routine were set up for it. Its sections
 * go with it.
 */
const deleteClass = async (schoolId: string, classId: string) => {
  await findClass(schoolId, classId);

  const { _count: used } = await prisma.schoolClass.findUniqueOrThrow({
    where: { id: classId },
    select: {
      _count: {
        select: {
          enrollments: true,
          classSubjects: true,
          examClasses: true,
          feeStructures: true,
          studentFees: true,
          resultSettings: true,
          finalFormulas: true,
          routineEntries: true,
        },
      },
    },
  });

  if (used.enrollments > 0) {
    throw new AppError("Students have been enrolled in this class, so it cannot be deleted", httpStatus.CONFLICT);
  }
  const setUp = Object.entries(used).filter(([, count]) => count > 0);
  if (setUp.length > 0) {
    throw new AppError(
      "This class already has subjects, exams, fees or a routine set up. Remove them first",
      httpStatus.CONFLICT,
    );
  }

  try {
    await prisma.schoolClass.delete({ where: { id: classId } });
  } catch (e) {
    // used between the check and the delete
    if (isForeignKeyViolation(e)) {
      throw new AppError("This class is in use and cannot be deleted", httpStatus.CONFLICT);
    }
    throw e;
  }
};

export const ClassService = { createClass, getClasses, getClassById, updateClass, deleteClass };
