import httpStatus from "http-status";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { requireYear } from "../../shared/academicYears";
import type { RollsQuery, SaveRollsPayload } from "./rollNumber.validation";

/*
 * Roll numbers, a class (or one section of it) at a time, for one academic year. A roll is
 * kept on the student's enrollment for that year and is unique among the active students of
 * a section (two sections may both have a roll 1). Only active students are numbered: those
 * who left or moved on keep the roll they had.
 */

const TX_OPTIONS = { maxWait: 10_000, timeout: 60_000 };

/* Rolls in their natural order: numbers by value (2 before 10), other rolls as text, none last. */
const byRoll = (a: string | null, b: string | null) =>
  a === null ? (b === null ? 0 : 1) : b === null ? -1 : a.localeCompare(b, undefined, { numeric: true });

// "A-1" and "a-1" are the same roll
const rollKey = (roll: string) => roll.toUpperCase();

/* The year (the class's track's current year by default), the class, and the section if one is asked. */
const resolve = async (schoolId: string, query: { academicYearId?: string; classId: string; sectionId?: string }) => {
  const schoolClass = await prisma.schoolClass.findFirst({
    where: { id: query.classId, schoolId },
    select: { id: true, name: true, sections: { orderBy: { name: "asc" }, select: { id: true, name: true, isDefault: true } } },
  });
  if (!schoolClass) throw new AppError("Class not found", httpStatus.NOT_FOUND);
  // the class must be taught in the year (a school class in a school year)
  const year = await requireYear(prisma, schoolId, { academicYearId: query.academicYearId, classId: schoolClass.id });
  const section = query.sectionId ? schoolClass.sections.find((s) => s.id === query.sectionId) : undefined;
  if (query.sectionId && !section) throw new AppError("This section is not part of the class", httpStatus.BAD_REQUEST);
  return { year, schoolClass, section };
};

/* The active students of the class (or section) in the year, by section and roll. */
const getRolls = async (schoolId: string, query: RollsQuery) => {
  const { year, schoolClass, section } = await resolve(schoolId, query);

  const enrollments = await prisma.enrollment.findMany({
    where: {
      academicYearId: year.id,
      classId: schoolClass.id,
      status: "ACTIVE",
      student: { schoolId },
      ...(section ? { sectionId: section.id } : {}),
    },
    select: {
      id: true,
      rollNumber: true,
      section: { select: { id: true, name: true, isDefault: true } },
      group: { select: { id: true, nameEn: true, nameBn: true } },
      student: { select: { id: true, nameEn: true, nameBn: true, admissionNo: true, gender: true, status: true } },
    },
  });
  enrollments.sort(
    (a, b) =>
      a.section.name.localeCompare(b.section.name) ||
      byRoll(a.rollNumber, b.rollNumber) ||
      a.student.admissionNo.localeCompare(b.student.admissionNo, undefined, { numeric: true }),
  );

  return {
    academicYear: { id: year.id, name: year.name, track: year.track },
    class: schoolClass,
    section: section ?? null,
    items: enrollments.map((e) => ({
      enrollmentId: e.id,
      rollNumber: e.rollNumber,
      section: e.section,
      group: e.group,
      student: e.student,
    })),
  };
};

/*
 * Saves several rolls at once (a whole class numbered in one go). All or nothing: every roll
 * must be unique in its section once saved, counting the section's students who weren't in
 * this list. Clearing a roll (null) is allowed.
 */
const saveRolls = async (schoolId: string, data: SaveRollsPayload) => {
  const { year, schoolClass, section } = await resolve(schoolId, data);

  return prisma.$transaction(async (tx) => {
    const listed = await tx.enrollment.findMany({
      where: { id: { in: data.items.map((i) => i.enrollmentId) }, student: { schoolId } },
      select: { id: true, academicYearId: true, classId: true, sectionId: true, status: true, rollNumber: true },
    });
    const byId = new Map(listed.map((e) => [e.id, e]));
    for (const item of data.items) {
      const e = byId.get(item.enrollmentId);
      if (!e || e.academicYearId !== year.id || e.classId !== schoolClass.id || (section && e.sectionId !== section.id)) {
        throw new AppError(`A student in the list is not in ${schoolClass.name} this year. Reload and try again`, httpStatus.BAD_REQUEST);
      }
      if (e.status !== "ACTIVE") {
        throw new AppError("A student in the list is no longer active in the class. Reload and try again", httpStatus.CONFLICT);
      }
    }

    // every active student of the touched sections, with the rolls as they will be
    const sectionIds = [...new Set(listed.map((e) => e.sectionId))];
    const all = await tx.enrollment.findMany({
      where: { academicYearId: year.id, sectionId: { in: sectionIds }, status: "ACTIVE" },
      select: { id: true, sectionId: true, rollNumber: true, section: { select: { name: true, isDefault: true } } },
    });
    const next = new Map(data.items.map((i) => [i.enrollmentId, i.rollNumber]));
    const seen = new Map<string, string>();
    for (const e of all) {
      const roll = next.has(e.id) ? next.get(e.id)! : e.rollNumber;
      if (!roll) continue;
      const key = `${e.sectionId}:${rollKey(roll)}`;
      if (seen.has(key)) {
        const where = e.section.isDefault ? schoolClass.name : `${schoolClass.name} ${e.section.name}`;
        const index = data.items.findIndex((i) => i.enrollmentId === e.id);
        throw new AppError(
          `Roll ${roll} is given to two students in ${where}`,
          httpStatus.CONFLICT,
          index >= 0 ? [{ path: `items.${index}.rollNumber`, message: "This roll is used twice" }] : undefined,
        );
      }
      seen.set(key, e.id);
    }

    // only the rolls that change
    const changed = data.items.filter((i) => (byId.get(i.enrollmentId)!.rollNumber ?? null) !== i.rollNumber);
    // in two steps: the database keeps active rolls unique in a section (a partial unique
    // index), so swapping 1 and 2 must clear both before writing either
    await tx.enrollment.updateMany({ where: { id: { in: changed.map((i) => i.enrollmentId) } }, data: { rollNumber: null } });
    for (const item of changed) {
      if (item.rollNumber) await tx.enrollment.update({ where: { id: item.enrollmentId }, data: { rollNumber: item.rollNumber } });
    }
    return { updated: changed.length };
  }, TX_OPTIONS);
};

export const RollNumberService = { getRolls, saveRolls };
