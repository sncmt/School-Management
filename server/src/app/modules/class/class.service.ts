import httpStatus from "http-status";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { currentYears, findYear, trackForNew } from "../../shared/academicYears";
import { isUniqueViolation } from "../../utils/prismaError";
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

/*
 * Whether a class still has nothing tied to its track: no students placed, no year setup
 * (subjects, fees, results, routine, exams, homework, section settings). Only then may it
 * move between school and college.
 */
const hasYearRecords = async (classId: string) => {
  const where = { classId };
  const found = await Promise.all([
    prisma.enrollment.findFirst({ where, select: { id: true } }),
    prisma.classSubject.findFirst({ where, select: { id: true } }),
    prisma.feeStructure.findFirst({ where, select: { id: true } }),
    prisma.studentFee.findFirst({ where, select: { id: true } }),
    prisma.classResultSetting.findFirst({ where, select: { id: true } }),
    prisma.routineEntry.findFirst({ where, select: { id: true } }),
    prisma.examClass.findFirst({ where, select: { id: true } }),
    prisma.homework.findFirst({ where, select: { id: true } }),
    prisma.sectionYearConfig.findFirst({ where: { section: { classId } }, select: { id: true } }),
  ]);
  return found.some(Boolean);
};

const sectionsSelect = {
  select: { id: true, name: true, isDefault: true },
  orderBy: { name: "asc" as const },
};

// -------------------------------------------------------------------- create

const createClass = async (schoolId: string, payload: CreateClassPayload) => {
  const { name, numericLevel } = payload;
  await assertNameFree(schoolId, name);
  const track = await trackForNew(prisma, schoolId, payload.track);

  try {
    return await prisma.$transaction(async (tx) => {
      const schoolClass = await tx.schoolClass.create({ data: { schoolId, name, numericLevel, track } });

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

/*
 * Classes by level, each with its sections and active students.
 * - A year or a track asked for: only that track's classes, counted in that year (or the
 *   track's current year).
 * - Neither: every class, each counted in the current year of its own track; academicYear is
 *   the main track's current year (one track: the school's current year, as always).
 */
const getClasses = async (schoolId: string, query: ClassQuery) => {
  const scoped = !!(query.academicYearId || query.track);
  const year = await findYear(prisma, schoolId, query);
  if (query.academicYearId && !year) {
    throw new AppError("Academic year not found for this school", httpStatus.NOT_FOUND);
  }
  const current = scoped ? [] : await currentYears(prisma, schoolId);
  const track = year?.track ?? query.track;
  // a class has enrollments only in years of its own track, so one count covers both tracks
  const countYears = scoped ? (year ? [year] : []) : current;

  const [classes, counts] = await Promise.all([
    prisma.schoolClass.findMany({
      where: { schoolId, ...(scoped && track ? { track } : {}) },
      orderBy: [{ track: "asc" }, { numericLevel: "asc" }, { name: "asc" }],
      include: { sections: sectionsSelect },
    }),
    countYears.length > 0
      ? prisma.enrollment.groupBy({
          by: ["classId"],
          where: { academicYearId: { in: countYears.map((y) => y.id) }, status: "ACTIVE", class: { schoolId } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  const studentsBy = new Map(counts.map((c) => [c.classId, c._count._all]));
  const counted = new Set(countYears.map((y) => y.track));

  return {
    academicYear: year ? { id: year.id, name: year.name, track: year.track } : null,
    // the current year of each track (only when no year or track was asked for)
    currentYears: current.map((y) => ({ id: y.id, name: y.name, track: y.track })),
    items: classes.map((c) => ({ ...c, activeStudents: counted.has(c.track) ? (studentsBy.get(c.id) ?? 0) : null })),
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
  const trackChanges = data.track !== undefined && data.track !== schoolClass.track;
  if (trackChanges) {
    await trackForNew(prisma, schoolId, data.track);
    if (await hasYearRecords(classId)) {
      throw new AppError(
        "This class already has students or year setup in its track, so it can't move between school and college",
        httpStatus.CONFLICT,
      );
    }
  }

  try {
    return await prisma.schoolClass.update({
      where: { id: classId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.numericLevel !== undefined ? { numericLevel: data.numericLevel } : {}),
        ...(trackChanges ? { track: data.track } : {}),
      },
      include: { sections: sectionsSelect },
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError(DUPLICATE_MESSAGE, httpStatus.CONFLICT);
    throw e;
  }
};

// deleting a class: classDelete.service.ts

export const ClassService = { createClass, getClasses, getClassById, updateClass };
