import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import type { AcademicTrack, Religion } from "../../../../generated/prisma/enums";
import { requireYear } from "../../shared/academicYears";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { displayName } from "../../shared/names";
import { isUniqueViolation } from "../../utils/prismaError";
import { audienceOf, audiencesDisjoint } from "../routine/routine.rules";
import type {
  AssignSubjectsPayload,
  ListClassSubjectsQuery,
  ReorderPayload,
  SetElectiveRulePayload,
  SetMarksPayload,
  UpdateClassSubjectPayload,
} from "./classSubject.type";

const TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 };

const subjectBrief = {
  id: true,
  nameEn: true,
  nameBn: true,
  code: true,
  religion: true,
  schoolId: true,
  parent: { select: { id: true, nameEn: true, nameBn: true, code: true } },
} satisfies Prisma.SubjectSelect;

const classSubjectInclude = {
  class: { select: { id: true, name: true, numericLevel: true } },
  group: { select: { id: true, nameEn: true, nameBn: true } },
  subject: { select: subjectBrief },
  parts: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, fullMarks: true, passMarks: true } },
  gradingScale: { select: { id: true, name: true } },
} satisfies Prisma.ClassSubjectInclude;

// ------------------------------------------------------------------- helpers

/* The given year, or the current one (of the class's track) when none is given. */
const resolveYear = (schoolId: string, academicYearId?: string, classId?: string, track?: AcademicTrack) =>
  requireYear(prisma, schoolId, { academicYearId, classId, track });

const findClassSubject = async (schoolId: string, classSubjectId: string) => {
  const row = await prisma.classSubject.findFirst({
    where: { id: classSubjectId, schoolId },
    include: classSubjectInclude,
  });
  if (!row) throw new AppError("Class subject not found", httpStatus.NOT_FOUND);
  return row;
};

type Row = {
  subjectId: string;
  groupId: string | null;
  subject: { nameEn: string | null; nameBn: string | null; parentId: string | null; religion: Religion | null };
};

/*
 * The rules for the full list of a class in one year (what is there plus what is added):
 *  - a subject appears once for the whole class, or once per group, never both
 *  - a class gets either a subject or its papers, never both (results would count twice)
 *  - a class has at most one subject per religion, and it is for the whole class
 */
const assertConsistent = (rows: Row[], groupNames: Map<string, string>) => {
  const seen = new Set<string>();
  for (const r of rows) {
    const key = `${r.subjectId}:${r.groupId ?? ""}`;
    if (seen.has(key)) {
      const forWhom = r.groupId ? ` for the ${groupNames.get(r.groupId) ?? "same"} group` : "";
      throw new AppError(`${displayName(r.subject)} is already assigned to this class${forWhom}`, httpStatus.CONFLICT);
    }
    seen.add(key);
  }

  const bySubject = new Map<string, Row[]>();
  for (const r of rows) bySubject.set(r.subjectId, [...(bySubject.get(r.subjectId) ?? []), r]);

  for (const list of bySubject.values()) {
    if (list.some((r) => r.groupId === null) && list.some((r) => r.groupId !== null)) {
      throw new AppError(
        `${displayName(list[0].subject)} cannot be both for the whole class and for a group`,
        httpStatus.CONFLICT,
      );
    }
  }

  for (const r of rows) {
    const parentId = r.subject.parentId;
    const parent = parentId ? bySubject.get(parentId)?.[0] : undefined;
    if (parent) {
      throw new AppError(
        `Assign either ${displayName(parent.subject)} or its papers (like ${displayName(r.subject)}), not both`,
        httpStatus.CONFLICT,
      );
    }
  }

  const byReligion = new Map<Religion, Row>();
  for (const r of rows) {
    const religion = r.subject.religion;
    if (!religion) continue;
    if (r.groupId !== null) {
      throw new AppError(`${displayName(r.subject)} is a religion subject and must be for the whole class`, httpStatus.BAD_REQUEST);
    }
    const other = byReligion.get(religion);
    if (other && other.subjectId !== r.subjectId) {
      throw new AppError(
        `This class already has ${displayName(other.subject)} for the same religion, so ${displayName(r.subject)} cannot be added`,
        httpStatus.CONFLICT,
      );
    }
    byReligion.set(religion, r);
  }
};

// -------------------------------------------------------------------- assign

/* Adds subjects to a class for a year, all or nothing. */
const assignSubjects = async (schoolId: string, data: AssignSubjectsPayload) => {
  const schoolClass = await prisma.schoolClass.findFirst({
    where: { id: data.classId, schoolId },
    select: { id: true },
  });
  if (!schoolClass) throw new AppError("Class not found for this school", httpStatus.NOT_FOUND);
  const year = await resolveYear(schoolId, data.academicYearId, data.classId);

  const subjectIds = [...new Set(data.items.map((i) => i.subjectId))];
  const groupIds = [...new Set(data.items.flatMap((i) => (i.groupId ? [i.groupId] : [])))];

  const [subjects, groups] = await Promise.all([
    // the shared NCTB list or this school's own
    prisma.subject.findMany({
      where: { id: { in: subjectIds }, OR: [{ schoolId: null }, { schoolId }] },
      select: { id: true, nameEn: true, nameBn: true, parentId: true, religion: true },
    }),
    prisma.group.findMany({ where: { schoolId }, select: { id: true, nameEn: true, nameBn: true } }),
  ]);
  if (subjects.length !== subjectIds.length) {
    throw new AppError("One or more subjects were not found", httpStatus.NOT_FOUND);
  }
  const groupNames = new Map(groups.map((g) => [g.id, displayName(g)]));
  if (groupIds.some((id) => !groupNames.has(id))) {
    throw new AppError("One or more groups were not found for this school", httpStatus.NOT_FOUND);
  }
  const subjectById = new Map(subjects.map((s) => [s.id, s]));

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.classSubject.findMany({
        where: { academicYearId: year.id, classId: data.classId },
        select: { subjectId: true, groupId: true, sortOrder: true, subject: { select: { nameEn: true, nameBn: true, parentId: true, religion: true } } },
      });

      const added = data.items.map((i) => ({
        subjectId: i.subjectId,
        groupId: i.groupId ?? null,
        subject: {
          nameEn: subjectById.get(i.subjectId)!.nameEn,
          nameBn: subjectById.get(i.subjectId)!.nameBn,
          parentId: subjectById.get(i.subjectId)!.parentId,
          religion: subjectById.get(i.subjectId)!.religion,
        },
      }));
      assertConsistent([...existing, ...added], groupNames);

      // without a sort order, new subjects go after the ones already there, in the given order
      let next = existing.reduce((max, r) => Math.max(max, r.sortOrder), -1) + 1;

      await tx.classSubject.createMany({
        data: data.items.map((i) => ({
          schoolId,
          academicYearId: year.id,
          classId: data.classId,
          subjectId: i.subjectId,
          groupId: i.groupId ?? null,
          type: i.type,
          sortOrder: i.sortOrder ?? next++,
        })),
      });

      const items = await tx.classSubject.findMany({
        where: { academicYearId: year.id, classId: data.classId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: classSubjectInclude,
      });
      return { academicYear: year, items };
    }, TX_OPTIONS);
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw new AppError("One of these subjects is already assigned to this class", httpStatus.CONFLICT);
    }
    throw e;
  }
};

// ------------------------------------------------------------------- reading

/* The subjects of one class (or every class) in a year, in their order. */
const getClassSubjects = async (schoolId: string, query: ListClassSubjectsQuery) => {
  const year = await resolveYear(schoolId, query.academicYearId, query.classId, query.track);

  const items = await prisma.classSubject.findMany({
    where: {
      schoolId,
      academicYearId: year.id,
      ...(query.classId ? { classId: query.classId } : {}),
      // a group's view: its own subjects plus the whole-class ones
      ...(query.groupId ? { OR: [{ groupId: query.groupId }, { groupId: null }] } : {}),
    },
    orderBy: [{ class: { numericLevel: "asc" } }, { sortOrder: "asc" }, { createdAt: "asc" }],
    include: classSubjectInclude,
  });
  // how many "main or 4th" subjects each class (or group) takes as main; none listed = 1
  const electiveRules = await prisma.electiveRule.findMany({
    where: { academicYearId: year.id, ...(query.classId ? { classId: query.classId } : {}) },
    select: { classId: true, groupId: true, mainCount: true },
  });

  return { academicYear: year, items, electiveRules };
};

// -------------------------------------------------------------------- update

const updateClassSubject = async (schoolId: string, classSubjectId: string, data: UpdateClassSubjectPayload) => {
  const current = await findClassSubject(schoolId, classSubjectId);

  // students' picks must still make sense: main picks need a "main or 4th" subject, 4th picks
  // a 4th or "main or 4th" one
  if (data.type !== undefined && data.type !== current.type) {
    const [mains, fourths] = await Promise.all([
      current.type === "ELECTIVE" ? prisma.studentMainSubject.count({ where: { classSubjectId } }) : 0,
      data.type === "COMPULSORY" ? prisma.studentOptionalSubject.count({ where: { classSubjectId } }) : 0,
    ]);
    if (mains > 0) {
      throw new AppError(`${mains} student(s) took this as a main subject. Change their choice first`, httpStatus.CONFLICT);
    }
    if (fourths > 0) {
      throw new AppError(`${fourths} student(s) chose this as their 4th subject. Change their choice first`, httpStatus.CONFLICT);
    }
  }

  const groupChanges = data.groupId !== undefined && data.groupId !== current.groupId;
  if (groupChanges) await assertGroupChange(schoolId, current, data.groupId ?? null);

  try {
    return await prisma.classSubject.update({
      where: { id: classSubjectId },
      data: {
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(groupChanges ? { groupId: data.groupId ?? null } : {}),
      },
      include: classSubjectInclude,
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("This subject is already assigned to that group", httpStatus.CONFLICT);
    throw e;
  }
};

/*
 * Moving a class subject to another group, or to the whole class. The class's subject list
 * must stay consistent (a subject is never both whole-class and group-only), and nobody outside
 * the new group may already depend on it: students who picked it (main or 4th) or have marks in it.
 */
const assertGroupChange = async (
  schoolId: string,
  current: { id: string; academicYearId: string; classId: string; subjectId: string },
  groupId: string | null,
) => {
  const groups = await prisma.group.findMany({ where: { schoolId }, select: { id: true, nameEn: true, nameBn: true } });
  const groupNames = new Map(groups.map((g) => [g.id, displayName(g)]));
  if (groupId && !groupNames.has(groupId)) throw new AppError("Group not found for this school", httpStatus.NOT_FOUND);

  const rows = await prisma.classSubject.findMany({
    where: { academicYearId: current.academicYearId, classId: current.classId },
    select: { id: true, subjectId: true, groupId: true, subject: { select: { nameEn: true, nameBn: true, parentId: true, religion: true } } },
  });
  assertConsistent(
    rows.map((r) => (r.id === current.id ? { ...r, groupId } : r)),
    groupNames,
  );

  // the routine: a class that shared a period with this one only because their groups differed
  const entries = await prisma.routineEntry.findMany({
    where: { classSubjectId: current.id },
    select: {
      id: true,
      academicYearId: true,
      weekday: true,
      periodNumber: true,
      sections: { select: { sectionId: true } },
      classSubject: { select: { id: true, type: true, subject: { select: { religion: true } } } },
    },
  });
  for (const e of entries) {
    const others = await prisma.routineEntry.findMany({
      where: {
        id: { not: e.id },
        academicYearId: e.academicYearId,
        weekday: e.weekday,
        periodNumber: e.periodNumber,
        sections: { some: { sectionId: { in: e.sections.map((x) => x.sectionId) } } },
      },
      select: { classSubject: { select: { id: true, type: true, groupId: true, subject: { select: { nameEn: true, nameBn: true, religion: true } } } } },
    });
    const moved = audienceOf({ ...e.classSubject, groupId });
    const clash = others.find((o) => !audiencesDisjoint(moved, audienceOf(o.classSubject)));
    if (clash) {
      throw new AppError(
        `In the routine this subject shares a period with ${displayName(clash.classSubject.subject)}. Move one of them first`,
        httpStatus.CONFLICT,
      );
    }
  }

  // only to one group: everyone outside it loses the subject
  if (!groupId) return;
  const outside = { enrollment: { OR: [{ groupId: null }, { groupId: { not: groupId } }] } };
  const [mains, fourths, marks] = await Promise.all([
    prisma.studentMainSubject.count({ where: { classSubjectId: current.id, ...outside } }),
    prisma.studentOptionalSubject.count({ where: { classSubjectId: current.id, ...outside } }),
    prisma.examMark.count({ where: { examSubject: { classSubjectId: current.id }, ...outside } }),
  ]);
  const groupName = groupNames.get(groupId);
  if (mains + fourths > 0) {
    throw new AppError(
      `${mains + fourths} student(s) outside the ${groupName} group picked this subject. Change their choice first`,
      httpStatus.CONFLICT,
    );
  }
  if (marks > 0) {
    throw new AppError(`Students outside the ${groupName} group already have marks in this subject`, httpStatus.CONFLICT);
  }
};

/*
 * Saves a class's subject order for a year in one go (drag and drop): the list must hold
 * exactly the class's subjects, so a stale or partial order can't scramble the positions.
 * Mark sheets and the tabulation sheet follow this order.
 */
const reorderClassSubjects = async (schoolId: string, data: ReorderPayload) => {
  const year = await resolveYear(schoolId, data.academicYearId, data.classId);
  const current = await prisma.classSubject.findMany({
    where: { schoolId, academicYearId: year.id, classId: data.classId },
    select: { id: true },
  });

  const listed = new Set(data.classSubjectIds);
  if (current.length !== data.classSubjectIds.length || current.some((c) => !listed.has(c.id))) {
    throw new AppError(
      "The order must list every subject of this class exactly once. Reload and try again",
      httpStatus.CONFLICT,
    );
  }

  // one after another: the pg driver can't run queries side by side on one connection
  await prisma.$transaction(async (tx) => {
    for (const [sortOrder, id] of data.classSubjectIds.entries()) {
      await tx.classSubject.update({ where: { id }, data: { sortOrder } });
    }
  }, TX_OPTIONS);
  return getClassSubjects(schoolId, { academicYearId: year.id, classId: data.classId });
};

// -------------------------------------------------------------------- remove

const removeClassSubject = async (schoolId: string, classSubjectId: string) => {
  await findClassSubject(schoolId, classSubjectId);

  const [examined, chosen, mains] = await Promise.all([
    prisma.examSubject.count({ where: { classSubjectId } }),
    prisma.studentOptionalSubject.count({ where: { classSubjectId } }),
    prisma.studentMainSubject.count({ where: { classSubjectId } }),
  ]);
  if (examined > 0) {
    throw new AppError("This subject is in an exam routine and cannot be removed", httpStatus.CONFLICT);
  }
  if (chosen > 0) {
    throw new AppError(
      `${chosen} student(s) chose this as their optional subject. Change their choice first`,
      httpStatus.CONFLICT,
    );
  }
  if (mains > 0) {
    throw new AppError(`${mains} student(s) took this as a main subject. Change their choice first`, httpStatus.CONFLICT);
  }

  await prisma.classSubject.delete({ where: { id: classSubjectId } });
};

// --------------------------------------------------------------- marks setup

/*
 * The default full marks, pass marks and parts of a class subject (each exam copies them
 * and may change them), and optionally its own grading scale. Replaces the whole setup.
 */
const setMarks = async (schoolId: string, classSubjectId: string, data: SetMarksPayload) => {
  await findClassSubject(schoolId, classSubjectId);

  if (data.gradingScaleId) {
    const scale = await prisma.gradingScale.findFirst({ where: { id: data.gradingScaleId, schoolId }, select: { id: true } });
    if (!scale) throw new AppError("Grading scale not found", httpStatus.NOT_FOUND);
  }

  return prisma.$transaction(async (tx) => {
    await tx.classSubjectPart.deleteMany({ where: { classSubjectId } });
    return tx.classSubject.update({
      where: { id: classSubjectId },
      data: {
        fullMarks: data.fullMarks,
        passMarks: data.passMarks,
        ...(data.gradingScaleId !== undefined ? { gradingScaleId: data.gradingScaleId } : {}),
        parts: { create: data.parts.map((p, i) => ({ ...p, sortOrder: i })) },
      },
      include: classSubjectInclude,
    });
  });
};

// ------------------------------------------------------------ main or 4th

/*
 * How many of a class's "main or 4th" subjects its students (or one group's) take as main.
 * Between 1 and one less than the number of such subjects open to them, so at least one is
 * left for the 4th list.
 */
const setElectiveRule = async (schoolId: string, data: SetElectiveRulePayload) => {
  const year = await resolveYear(schoolId, data.academicYearId, data.classId);
  const groupId = data.groupId ?? null;
  const electives = await prisma.classSubject.count({
    where: {
      schoolId,
      academicYearId: year.id,
      classId: data.classId,
      type: "ELECTIVE",
      ...(groupId ? { OR: [{ groupId: null }, { groupId }] } : { groupId: null }),
    },
  });
  if (electives < 2) {
    throw new AppError("Add at least two \"main or 4th\" subjects first", httpStatus.BAD_REQUEST);
  }
  if (data.mainCount > electives - 1) {
    throw new AppError(`At most ${electives - 1}: at least one has to be left for the 4th-subject list`, httpStatus.BAD_REQUEST, [
      { path: "mainCount", message: `At most ${electives - 1}` },
    ]);
  }
  // students' main picks of the old number stay; the choices page flags them until changed
  const existing = await prisma.electiveRule.findFirst({ where: { academicYearId: year.id, classId: data.classId, groupId } });
  const rule = existing
    ? await prisma.electiveRule.update({ where: { id: existing.id }, data: { mainCount: data.mainCount } })
    : await prisma.electiveRule.create({
        data: { schoolId, academicYearId: year.id, classId: data.classId, groupId, mainCount: data.mainCount },
      });
  return { classId: rule.classId, groupId: rule.groupId, mainCount: rule.mainCount };
};

export const ClassSubjectService = {
  setElectiveRule,
  setMarks,
  reorderClassSubjects,
  assignSubjects,
  getClassSubjects,
  updateClassSubject,
  removeClassSubject,
};
