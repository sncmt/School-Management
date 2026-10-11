import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { dayKey } from "../../shared/scheduleSchemas";
import type { CreateAcademicYearPayload, UpdateAcademicYearPayload } from "./academicYear.type";
import httpStatus from 'http-status'
import type { Prisma } from "../../../../generated/prisma/client";

const createAcademicYear = async (
  schoolId: string,
  payload: CreateAcademicYearPayload
) => {
  const { name, startDate, endDate, isCurrent = false } = payload;

  return prisma.$transaction(async (tx) => {
    // 1. Check duplicate academic year
    const existingAcademicYear = await tx.academicYear.findUnique({
      where: {
        schoolId_name: {
          schoolId,
          name,
        },
      },
    });

    if (existingAcademicYear) {
      throw new AppError(
        `Academic year "${name}" already exists`,
        httpStatus.CONFLICT
      );
    }

    await assertNoOverlap(tx, schoolId, startDate, endDate);

    // 2. If this year should become current,
    //    remove current status from existing year
    if (isCurrent) {
      await tx.academicYear.updateMany({
        where: {
          schoolId,
          isCurrent: true,
        },
        data: {
          isCurrent: false,
        },
      });
    }

    // 3. Create academic year
    const academicYear = await tx.academicYear.create({
      data: {
        schoolId,
        name,
        startDate,
        endDate,
        isCurrent,
      },
    });

    const previousYear = await tx.academicYear.findFirst({
      where: { schoolId, id: { not: academicYear.id }, startDate: { lt: academicYear.startDate } },
      orderBy: { startDate: "desc" },
      select: { id: true },
    });

    const carriedOverSections = previousYear
      ? await carryOverSectionConfigs(tx, schoolId, previousYear.id, academicYear.id)
      : 0;
    const carriedOverSubjects = previousYear
      ? await carryOverClassSubjects(tx, schoolId, previousYear.id, academicYear.id)
      : 0;
    // after the subjects: the new year's class subjects must exist first
    const carriedOverSubjectTeachers = previousYear
      ? await carryOverSubjectTeachers(tx, schoolId, previousYear.id, academicYear.id)
      : 0;

    const carriedOverResultSettings = previousYear
      ? await carryOverResultSettings(tx, schoolId, previousYear.id, academicYear.id)
      : 0;
    // after the subjects: routine classes point at the new year's class subjects
    const carriedOverRoutine = previousYear
      ? await carryOverRoutine(tx, schoolId, previousYear.id, academicYear.id)
      : 0;

    return {
      ...academicYear,
      carriedOverSections,
      carriedOverSubjects,
      carriedOverSubjectTeachers,
      carriedOverResultSettings,
      carriedOverRoutine,
    };
  });
};

const WORKING_TEACHER = { status: { in: ["ACTIVE" as const, "ON_LEAVE" as const] } };

/*
 * A new year starts with the subject teachers of the year before, matched to the new
 * year's copy of each class subject. Teachers who have left are not carried.
 */
const carryOverSubjectTeachers = async (
  tx: Prisma.TransactionClient,
  schoolId: string,
  previousYearId: string,
  newYearId: string,
) => {
  const [previous, newSubjects] = await Promise.all([
    tx.subjectTeacher.findMany({
      where: { schoolId, academicYearId: previousYearId, teacher: WORKING_TEACHER },
      select: {
        sectionId: true,
        teacherId: true,
        classSubject: { select: { classId: true, subjectId: true, groupId: true } },
      },
    }),
    tx.classSubject.findMany({
      where: { schoolId, academicYearId: newYearId },
      select: { id: true, classId: true, subjectId: true, groupId: true },
    }),
  ]);
  if (previous.length === 0) return 0;

  const key = (s: { classId: string; subjectId: string; groupId: string | null }) =>
    `${s.classId}:${s.subjectId}:${s.groupId ?? ""}`;
  const newIdByKey = new Map(newSubjects.map((s) => [key(s), s.id]));

  const data = previous.flatMap((p) => {
    const classSubjectId = newIdByKey.get(key(p.classSubject));
    return classSubjectId
      ? [{ schoolId, academicYearId: newYearId, sectionId: p.sectionId, classSubjectId, teacherId: p.teacherId }]
      : [];
  });

  const result = await tx.subjectTeacher.createMany({ data, skipDuplicates: true });
  return result.count;
};

/*
 * A new year starts with the subject list each class had in the year before it, with
 * each subject's marks setup (full / pass marks, parts, grading scale).
 */
const carryOverClassSubjects = async (
  tx: Prisma.TransactionClient,
  schoolId: string,
  previousYearId: string,
  newYearId: string,
) => {
  const previous = await tx.classSubject.findMany({
    where: { schoolId, academicYearId: previousYearId },
    select: {
      classId: true,
      subjectId: true,
      groupId: true,
      type: true,
      sortOrder: true,
      fullMarks: true,
      passMarks: true,
      gradingScaleId: true,
      parts: { select: { name: true, fullMarks: true, passMarks: true, sortOrder: true } },
    },
  });
  if (previous.length === 0) return 0;

  const result = await tx.classSubject.createMany({
    data: previous.map(({ parts, ...s }) => ({ ...s, schoolId, academicYearId: newYearId })),
    skipDuplicates: true,
  });

  // the parts hang off the new rows, matched by class, subject and group
  const withParts = previous.filter((s) => s.parts.length > 0);
  if (withParts.length > 0) {
    const created = await tx.classSubject.findMany({
      where: { schoolId, academicYearId: newYearId },
      select: { id: true, classId: true, subjectId: true, groupId: true },
    });
    const key = (s: { classId: string; subjectId: string; groupId: string | null }) =>
      `${s.classId}:${s.subjectId}:${s.groupId ?? ""}`;
    const newIdByKey = new Map(created.map((s) => [key(s), s.id]));

    await tx.classSubjectPart.createMany({
      data: withParts.flatMap((s) => {
        const classSubjectId = newIdByKey.get(key(s));
        return classSubjectId ? s.parts.map((p) => ({ ...p, classSubjectId })) : [];
      }),
      skipDuplicates: true,
    });
  }
  return result.count;
};

/*
 * A new year starts with the weekly routine of the year before: the same weekday, period
 * and sections, matched to the new year's copy of each class subject. A teacher who has
 * left is not carried (the class stays, without a teacher). Substitutions are not copied.
 */
const carryOverRoutine = async (
  tx: Prisma.TransactionClient,
  schoolId: string,
  previousYearId: string,
  newYearId: string,
) => {
  const [previous, newSubjects] = await Promise.all([
    tx.routineEntry.findMany({
      where: { schoolId, academicYearId: previousYearId },
      select: {
        classId: true,
        weekday: true,
        periodNumber: true,
        teacher: { select: { id: true, status: true } },
        classSubject: { select: { classId: true, subjectId: true, groupId: true } },
        sections: { select: { sectionId: true } },
      },
    }),
    tx.classSubject.findMany({
      where: { schoolId, academicYearId: newYearId },
      select: { id: true, classId: true, subjectId: true, groupId: true },
    }),
  ]);
  if (previous.length === 0) return 0;

  const key = (s: { classId: string; subjectId: string; groupId: string | null }) =>
    `${s.classId}:${s.subjectId}:${s.groupId ?? ""}`;
  const newIdByKey = new Map(newSubjects.map((s) => [key(s), s.id]));

  let count = 0;
  for (const e of previous) {
    const classSubjectId = newIdByKey.get(key(e.classSubject));
    if (!classSubjectId) continue;
    await tx.routineEntry.create({
      data: {
        schoolId,
        academicYearId: newYearId,
        classId: e.classId,
        weekday: e.weekday,
        periodNumber: e.periodNumber,
        classSubjectId,
        teacherId: e.teacher && ["ACTIVE", "ON_LEAVE"].includes(e.teacher.status) ? e.teacher.id : null,
        sections: { create: e.sections.map((s) => ({ sectionId: s.sectionId })) },
      },
    });
    count++;
  }
  return count;
};

/* A new year starts with each class's result settings (system, scale, papers, absent rule). */
const carryOverResultSettings = async (
  tx: Prisma.TransactionClient,
  schoolId: string,
  previousYearId: string,
  newYearId: string,
) => {
  const previous = await tx.classResultSetting.findMany({
    where: { schoolId, academicYearId: previousYearId },
    select: { classId: true, resultSystem: true, gradingScaleId: true, combinePapers: true, absentRule: true },
  });
  const result = await tx.classResultSetting.createMany({
    data: previous.map((s) => ({ ...s, schoolId, academicYearId: newYearId })),
    skipDuplicates: true,
  });
  return result.count;
};

/*
 * A new year starts with the class teacher, capacity and class hours each section had
 * in the year before it. A class teacher who has left is not carried; the rest still is.
 * All of it can be changed afterwards.
 */
const carryOverSectionConfigs = async (
  tx: Prisma.TransactionClient,
  schoolId: string,
  previousYearId: string,
  newYearId: string,
) => {
  const previous = await tx.sectionYearConfig.findMany({
    where: { academicYearId: previousYearId, section: { schoolId } },
    select: { sectionId: true, capacity: true, startTime: true, endTime: true, periodTemplateId: true, classTeacherMembershipId: true },
  });
  if (previous.length === 0) return 0;

  const activeTeachers = await tx.teacherProfile.findMany({
    where: {
      schoolId,
      ...WORKING_TEACHER,
      membership: { status: "ACTIVE" },
      membershipId: { in: previous.flatMap((c) => (c.classTeacherMembershipId ? [c.classTeacherMembershipId] : [])) },
    },
    select: { membershipId: true },
  });
  const activeTeacherIds = new Set(activeTeachers.map((t) => t.membershipId));

  const result = await tx.sectionYearConfig.createMany({
    data: previous.map((c) => ({
      sectionId: c.sectionId,
      academicYearId: newYearId,
      capacity: c.capacity,
      startTime: c.startTime,
      endTime: c.endTime,
      periodTemplateId: c.periodTemplateId,
      classTeacherMembershipId:
        c.classTeacherMembershipId && activeTeacherIds.has(c.classTeacherMembershipId)
          ? c.classTeacherMembershipId
          : null,
    })),
    skipDuplicates: true,
  });
  return result.count;
};

// ------------------------------------------------------------------- helpers

type Db = Prisma.TransactionClient | typeof prisma;

/*
 * Two years of one school never cover the same day: "the year of a date" (attendance,
 * calendar, exams) must have one answer.
 */
const assertNoOverlap = async (db: Db, schoolId: string, startDate: Date, endDate: Date, excludeId?: string) => {
  const clash = await db.academicYear.findFirst({
    where: {
      schoolId,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { name: true, startDate: true, endDate: true },
  });
  if (clash) {
    throw new AppError(
      `These dates overlap ${clash.name} (${dayKey(clash.startDate)} to ${dayKey(clash.endDate)})`,
      httpStatus.CONFLICT,
    );
  }
};

const findYear = async (schoolId: string, academicYearId: string) => {
  const year = await prisma.academicYear.findFirst({ where: { id: academicYearId, schoolId } });
  if (!year) throw new AppError("Academic year not found", httpStatus.NOT_FOUND);
  return year;
};

/*
 * Records dated inside the year that would fall outside new dates. Moving a year's dates
 * must not leave holidays, schedule changes, attendance or exam days outside it.
 */
const firstDatedOutside = async (academicYearId: string, start: Date, end: Date) => {
  const [entry, change, attendance, examDay] = await Promise.all([
    prisma.calendarEntry.findFirst({
      where: { academicYearId, OR: [{ fromDate: { lt: start } }, { toDate: { gt: end } }] },
      select: { id: true },
    }),
    prisma.scheduleOverride.findFirst({
      where: { academicYearId, OR: [{ fromDate: { lt: start } }, { toDate: { gt: end } }] },
      select: { id: true },
    }),
    prisma.attendanceSession.findFirst({
      where: { academicYearId, OR: [{ date: { lt: start } }, { date: { gt: end } }] },
      select: { id: true },
    }),
    prisma.examSubject.findFirst({
      where: {
        examClass: { exam: { academicYearId } },
        OR: [{ date: { lt: start } }, { date: { gt: end } }],
      },
      select: { id: true },
    }),
  ]);
  if (entry) return "calendar entries";
  if (change) return "schedule changes";
  if (attendance) return "attendance";
  if (examDay) return "exam days";
  return null;
};

// ------------------------------------------------------------------- reading

/** Newest first, with how much each year holds. */
const getAcademicYears = async (schoolId: string) => {
  const years = await prisma.academicYear.findMany({
    where: { schoolId },
    orderBy: { startDate: "desc" },
    include: { _count: { select: { enrollments: true, exams: true } } },
  });
  return years;
};

const getAcademicYearById = async (schoolId: string, academicYearId: string) => {
  await findYear(schoolId, academicYearId);
  return prisma.academicYear.findUniqueOrThrow({
    where: { id: academicYearId },
    include: { _count: { select: { enrollments: true, exams: true } } },
  });
};

// -------------------------------------------------------------------- update

/* Rename, or move the dates (they must still hold everything dated inside the year). */
const updateAcademicYear = async (schoolId: string, academicYearId: string, data: UpdateAcademicYearPayload) => {
  const year = await findYear(schoolId, academicYearId);

  if (data.name !== undefined && data.name !== year.name) {
    const taken = await prisma.academicYear.findFirst({
      where: { schoolId, name: { equals: data.name, mode: "insensitive" }, id: { not: academicYearId } },
      select: { id: true },
    });
    if (taken) throw new AppError(`Academic year "${data.name}" already exists`, httpStatus.CONFLICT);
  }

  const startDate = data.startDate ?? year.startDate;
  const endDate = data.endDate ?? year.endDate;
  const datesChange = dayKey(startDate) !== dayKey(year.startDate) || dayKey(endDate) !== dayKey(year.endDate);

  if (datesChange) {
    if (endDate <= startDate) {
      throw new AppError("End date must be after start date", httpStatus.BAD_REQUEST, [
        { path: "endDate", message: "End date must be after start date" },
      ]);
    }
    await assertNoOverlap(prisma, schoolId, startDate, endDate, academicYearId);
    const stranded = await firstDatedOutside(academicYearId, startDate, endDate);
    if (stranded) {
      throw new AppError(
        `This year already has ${stranded} outside the new dates. Move or remove them first`,
        httpStatus.CONFLICT,
      );
    }
  }

  return prisma.academicYear.update({
    where: { id: academicYearId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(datesChange ? { startDate, endDate } : {}),
    },
    include: { _count: { select: { enrollments: true, exams: true } } },
  });
};

/* The year the school works in by default (lists, admission, attendance). Only one at a time. */
const setCurrentAcademicYear = async (schoolId: string, academicYearId: string) => {
  await findYear(schoolId, academicYearId);
  return prisma.$transaction(async (tx) => {
    await tx.academicYear.updateMany({ where: { schoolId, isCurrent: true }, data: { isCurrent: false } });
    return tx.academicYear.update({
      where: { id: academicYearId },
      data: { isCurrent: true },
      include: { _count: { select: { enrollments: true, exams: true } } },
    });
  });
};

export const AcademicYearService = {
  createAcademicYear,
  getAcademicYears,
  getAcademicYearById,
  updateAcademicYear,
  setCurrentAcademicYear,
};
