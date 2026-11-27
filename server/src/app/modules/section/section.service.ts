import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import type { AcademicTrack } from "../../../../generated/prisma/enums";
import { currentYears, findYear, requireYear as requireTrackYear } from "../../shared/academicYears";
import { isUniqueViolation } from "../../utils/prismaError";
import type {
  CreateSectionPayload,
  ListSectionsQuery,
  SectionQuery,
  SetYearConfigPayload,
  UpdateSectionPayload,
  YearConfigQuery,
} from "./section.type";

type Db = Prisma.TransactionClient;

const DUPLICATE_MESSAGE = "A section with this name already exists for this class";

const sectionInclude = {
  class: { select: { id: true, name: true, numericLevel: true, track: true } },
} satisfies Prisma.SectionInclude;

const yearConfigSelect = {
  id: true,
  academicYearId: true,
  capacity: true,
  startTime: true,
  endTime: true,
  periodTemplate: { select: { id: true, nameEn: true, nameBn: true } },
  classTeacherMembershipId: true,
  classTeacherMembership: {
    select: {
      id: true,
      user: { select: { id: true, fullname: true, phone: true, email: true } },
      // the class teacher's names as this school writes them
      teacherProfile: { select: { id: true, nameEn: true, nameBn: true } },
    },
  },
} satisfies Prisma.SectionYearConfigSelect;

// ------------------------------------------------------------------- helpers

const findSection = async (schoolId: string, sectionId: string) => {
  const section = await prisma.section.findFirst({
    where: { id: sectionId, schoolId },
    include: sectionInclude,
  });
  if (!section) throw new AppError("Section not found", httpStatus.NOT_FOUND);
  return section;
};

/* "A" and "a" are the same name. The unique index is case-sensitive, so check here too. */
const assertNameFree = async (
  db: Db,
  schoolId: string,
  classId: string,
  name: string,
  excludeSectionId?: string,
) => {
  const clash = await db.section.findFirst({
    where: {
      schoolId,
      classId,
      name: { equals: name, mode: "insensitive" },
      ...(excludeSectionId ? { id: { not: excludeSectionId } } : {}),
    },
    select: { id: true },
  });
  if (clash) throw new AppError(DUPLICATE_MESSAGE, httpStatus.CONFLICT);
};

/*
 * The automatic "Default" section of a class is only there until the school adds real
 * sections. Once a real one arrives, an unused default is removed. A default that already
 * has students stays: rename it to make it an ordinary section.
 */
const removeUnusedDefaults = async (db: Db, schoolId: string, classId: string) => {
  const result = await db.section.deleteMany({
    where: { schoolId, classId, isDefault: true, enrollments: { none: {} } },
  });
  return result.count;
};

/*
 * The given year, or the current one of the given track (or of the main track) when none is
 * given. null when there is no current year.
 */
const resolveYear = async (schoolId: string, query: { academicYearId?: string; track?: AcademicTrack }) => {
  const year = await findYear(prisma, schoolId, query);
  if (query.academicYearId && !year) {
    throw new AppError("Academic year not found for this school", httpStatus.NOT_FOUND);
  }
  return year && { id: year.id, name: year.name, track: year.track };
};

/* The given year; the section's class must be taught in it (its track). */
const requireYear = async (schoolId: string, academicYearId: string, classId: string) => {
  const year = await requireTrackYear(prisma, schoolId, { academicYearId, classId });
  return { id: year.id, name: year.name, track: year.track };
};

/*
 * Teacher, capacity, class hours and active student count of the given sections in the
 * year(s). Several years: the current year of each track (a section has data only in years of
 * its class's track, so they never mix).
 */
const loadYearData = async (yearIds: string | string[], sectionIds: string[]) => {
  const academicYearId = { in: typeof yearIds === "string" ? [yearIds] : yearIds };
  const [configs, counts] = await Promise.all([
    prisma.sectionYearConfig.findMany({
      where: { academicYearId, sectionId: { in: sectionIds } },
      select: { sectionId: true, ...yearConfigSelect },
    }),
    prisma.enrollment.groupBy({
      by: ["sectionId"],
      where: { academicYearId, sectionId: { in: sectionIds }, status: "ACTIVE" },
      _count: { _all: true },
    }),
  ]);

  const configBySection = new Map(configs.map(({ sectionId, ...config }) => [sectionId, config]));
  const countBySection = new Map(counts.map((c) => [c.sectionId, c._count._all]));

  return (sectionId: string) => {
    const config = configBySection.get(sectionId) ?? null;
    const activeStudents = countBySection.get(sectionId) ?? 0;
    return {
      config,
      activeStudents,
      // capacity is only a warning: it never blocks an admission
      isOverCapacity: config?.capacity != null && activeStudents > config.capacity,
    };
  };
};

// -------------------------------------------------------------------- create

/*
 * Every listed class gets every listed name, in one transaction. A class that already has
 * a section with one of the names (ignoring case) keeps it, and that pair is reported as
 * skipped instead of failing the whole request. Each class that gets a new section loses
 * its unused automatic "Default" section.
 */
const createSections = async (schoolId: string, data: CreateSectionPayload) => {
  const classes = await prisma.schoolClass.findMany({
    where: { id: { in: data.classIds }, schoolId },
    orderBy: [{ numericLevel: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
  if (classes.length !== data.classIds.length) {
    throw new AppError("One or more classes were not found for this school", httpStatus.NOT_FOUND);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // what each class already has; an unused default is about to make way, so it doesn't count
      const existing = await tx.section.findMany({
        where: {
          schoolId,
          classId: { in: data.classIds },
          NOT: { isDefault: true, enrollments: { none: {} } },
        },
        select: { classId: true, name: true },
      });
      const taken = new Set(existing.map((s) => `${s.classId}:${s.name.toLowerCase()}`));

      const created = [];
      const skipped: { classId: string; className: string; name: string }[] = [];
      let replacedDefaultSections = 0;

      for (const schoolClass of classes) {
        const names = data.names.filter((name) => !taken.has(`${schoolClass.id}:${name.toLowerCase()}`));
        for (const name of data.names) {
          if (!names.includes(name)) skipped.push({ classId: schoolClass.id, className: schoolClass.name, name });
        }
        if (names.length === 0) continue;

        replacedDefaultSections += await removeUnusedDefaults(tx, schoolId, schoolClass.id);
        for (const name of names) {
          created.push(await tx.section.create({ data: { schoolId, classId: schoolClass.id, name }, include: sectionInclude }));
        }
      }

      return { created, skipped, replacedDefaultSections };
    });
  } catch (e) {
    // created by someone else at the same moment
    if (isUniqueViolation(e)) throw new AppError(DUPLICATE_MESSAGE, httpStatus.CONFLICT);
    throw e;
  }
};

// ------------------------------------------------------------------- reading

const getSections = async (schoolId: string, query: ListSectionsQuery) => {
  // a year or track asked for: that track's sections in that year. Neither: every section,
  // each with the current year of its own track (one track: the school's current year)
  const scoped = !!(query.academicYearId || query.track);
  const year = await resolveYear(schoolId, query);
  const current = scoped ? [] : await currentYears(prisma, schoolId);
  const yearIds = scoped ? (year ? [year.id] : []) : current.map((y) => y.id);
  const track = year?.track ?? query.track;

  const sections = await prisma.section.findMany({
    where: {
      schoolId,
      ...(query.classId ? { classId: query.classId } : {}),
      ...(scoped && track ? { class: { track } } : {}),
    },
    orderBy: [{ class: { track: "asc" } }, { class: { numericLevel: "asc" } }, { name: "asc" }],
    include: sectionInclude,
  });

  const yearData = yearIds.length > 0 ? await loadYearData(yearIds, sections.map((s) => s.id)) : null;

  return {
    academicYear: year,
    // the current year of each track (no year or track asked for): a section's settings
    // belong to the current year of its class's track
    currentYears: current.map((y) => ({ id: y.id, name: y.name, track: y.track })),
    items: sections.map((section) => ({
      ...section,
      yearInfo: yearData ? yearData(section.id) : null,
    })),
  };
};

const getSectionById = async (schoolId: string, sectionId: string, query: SectionQuery) => {
  const section = await findSection(schoolId, sectionId);
  // no year given: the current year of the section's own track
  const year = await resolveYear(schoolId, { academicYearId: query.academicYearId, track: section.class.track });

  const yearData = year ? await loadYearData(year.id, [section.id]) : null;

  return { ...section, academicYear: year, yearInfo: yearData ? yearData(section.id) : null };
};

// -------------------------------------------------------------------- update

/* Rename only. A section never moves to another class: enrollments store both. */
const updateSection = async (schoolId: string, sectionId: string, data: UpdateSectionPayload) => {
  const section = await findSection(schoolId, sectionId);
  if (data.name === section.name) return section;

  try {
    return await prisma.$transaction(async (tx) => {
      await assertNameFree(tx, schoolId, section.classId, data.name, sectionId);

      return tx.section.update({
        where: { id: sectionId },
        // a renamed default is an ordinary section from now on
        data: { name: data.name, isDefault: false },
        include: sectionInclude,
      });
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError(DUPLICATE_MESSAGE, httpStatus.CONFLICT);
    throw e;
  }
};

// -------------------------------------------------------------------- delete

// --------------------------------------------------------------- year config

/*
 * Sets the class teacher, capacity and/or class hours of a section for one academic year.
 * Can be called at any time, so the teacher or the hours can change in the middle of a
 * year. A missing field is left alone; null clears it. Past attendance is not affected:
 * it keeps its own copy of the hours in force on its day.
 */
const setYearConfig = async (schoolId: string, sectionId: string, data: SetYearConfigPayload) => {
  const { academicYearId, classTeacherMembershipId, capacity, startTime, endTime, periodTemplateId } = data;

  const section = await findSection(schoolId, sectionId);
  const year = await requireYear(schoolId, academicYearId, section.classId);

  if (classTeacherMembershipId) {
    // only a teacher who still works here (on leave included) and can log in
    const teacher = await prisma.teacherProfile.findFirst({
      where: {
        schoolId,
        membershipId: classTeacherMembershipId,
        status: { in: ["ACTIVE", "ON_LEAVE"] },
        membership: { status: "ACTIVE" },
      },
      select: { id: true },
    });
    if (!teacher) {
      throw new AppError("The selected class teacher is not a working teacher of this school", httpStatus.BAD_REQUEST);
    }
  }

  if (periodTemplateId !== undefined) {
    const template = periodTemplateId
      ? await prisma.periodTemplate.findFirst({
          where: { id: periodTemplateId, schoolId },
          select: { periods: { where: { isBreak: false }, select: { number: true } } },
        })
      : null;
    if (periodTemplateId && !template) throw new AppError("Period template not found", httpStatus.NOT_FOUND);

    // the section's routine sits in numbered periods: the new template must still have them
    const classPeriods = (template?.periods ?? []).map((p) => p.number);
    const stranded = await prisma.routineEntry.findFirst({
      where: { academicYearId, sections: { some: { sectionId } }, periodNumber: { notIn: classPeriods } },
      select: { periodNumber: true },
    });
    if (stranded) {
      throw new AppError(
        `The section's routine has classes in period ${stranded.periodNumber}, which this template does not have as a class period`,
        httpStatus.CONFLICT,
      );
    }
  }

  // the hours are checked as they will be after saving, so one of them can be changed alone
  if (startTime !== undefined || endTime !== undefined) {
    const saved = await prisma.sectionYearConfig.findUnique({
      where: { sectionId_academicYearId: { sectionId, academicYearId } },
      select: { startTime: true, endTime: true },
    });
    const start = startTime !== undefined ? startTime : (saved?.startTime ?? null);
    const end = endTime !== undefined ? endTime : (saved?.endTime ?? null);

    if ((start === null) !== (end === null)) {
      throw new AppError("Set both the start and the end time, or clear both", httpStatus.BAD_REQUEST);
    }
    if (start !== null && end !== null && end <= start) {
      throw new AppError("End time must be after start time", httpStatus.BAD_REQUEST);
    }
  }

  const config = await prisma.sectionYearConfig.upsert({
    where: { sectionId_academicYearId: { sectionId, academicYearId } },
    create: {
      sectionId,
      academicYearId,
      classTeacherMembershipId: classTeacherMembershipId ?? null,
      capacity: capacity ?? null,
      startTime: startTime ?? null,
      endTime: endTime ?? null,
      periodTemplateId: periodTemplateId ?? null,
    },
    update: {
      ...(classTeacherMembershipId !== undefined ? { classTeacherMembershipId } : {}),
      ...(capacity !== undefined ? { capacity } : {}),
      ...(startTime !== undefined ? { startTime } : {}),
      ...(endTime !== undefined ? { endTime } : {}),
      ...(periodTemplateId !== undefined ? { periodTemplateId } : {}),
    },
    select: yearConfigSelect,
  });

  const activeStudents = await prisma.enrollment.count({
    where: { academicYearId, sectionId, status: "ACTIVE" },
  });

  const warnings: string[] = [];
  if (config.capacity != null && activeStudents > config.capacity) {
    warnings.push(
      `This section already has ${activeStudents} active students, more than the capacity of ${config.capacity}`,
    );
  }

  return { academicYear: year, config, activeStudents, warnings };
};

const getYearConfig = async (schoolId: string, sectionId: string, query: YearConfigQuery) => {
  const section = await findSection(schoolId, sectionId);
  const year = await requireYear(schoolId, query.academicYearId, section.classId);

  const yearData = await loadYearData(year.id, [sectionId]);
  // config is null when nothing has been set for this year yet
  return { academicYear: year, ...yearData(sectionId) };
};

export const SectionService = {
  createSections,
  getSections,
  getSectionById,
  updateSection,
  setYearConfig,
  getYearConfig,
};
