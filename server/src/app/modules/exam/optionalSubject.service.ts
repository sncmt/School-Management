import httpStatus from "http-status";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { requireYear } from "../../shared/academicYears";
import { displayName } from "../../shared/names";
import { fourthOptions, loadElectiveRules, mainCountFor, openElectives } from "../../shared/subjectChoice";
import type { OptionalQuery, SetOptionalChoicesPayload } from "./exam.validation";

/*
 * Students' subject choices in a class: their main subject(s) among the "main or 4th"
 * (ELECTIVE) subjects, and their 4th subject. The 4th list is the class's fixed 4th
 * (OPTIONAL) subjects plus the electives the student did not take as main: a Science student
 * with Biology as main may take Higher Math as their 4th. Open to the student's group only.
 */

/* The given year, or the current one of the class's track. */
const resolveYear = async (schoolId: string, academicYearId: string | undefined, classId: string) => {
  const year = await requireYear(prisma, schoolId, { academicYearId, classId });
  return { id: year.id, name: year.name };
};

const choiceSubjectSelect = {
  id: true,
  type: true,
  groupId: true,
  sortOrder: true,
  group: { select: { id: true, nameEn: true, nameBn: true } },
  subject: { select: { id: true, nameEn: true, nameBn: true, code: true } },
} as const;

/* The class's choice subjects, and each active student with their choices and what they may choose. */
const getChoices = async (schoolId: string, query: OptionalQuery) => {
  const year = await resolveYear(schoolId, query.academicYearId, query.classId);
  const schoolClass = await prisma.schoolClass.findFirst({
    where: { id: query.classId, schoolId },
    select: { id: true, name: true },
  });
  if (!schoolClass) throw new AppError("Class not found for this school", httpStatus.NOT_FOUND);

  const [subjects, rules, enrollments] = await Promise.all([
    prisma.classSubject.findMany({
      where: { schoolId, classId: query.classId, academicYearId: year.id, type: { in: ["OPTIONAL", "ELECTIVE"] } },
      orderBy: { sortOrder: "asc" },
      select: choiceSubjectSelect,
    }),
    loadElectiveRules(prisma, year.id, query.classId),
    prisma.enrollment.findMany({
      where: {
        academicYearId: year.id,
        classId: query.classId,
        status: "ACTIVE",
        ...(query.sectionId ? { sectionId: query.sectionId } : {}),
      },
      select: {
        id: true,
        rollNumber: true,
        groupId: true,
        section: { select: { id: true, name: true, isDefault: true } },
        group: { select: { id: true, nameEn: true, nameBn: true } },
        student: { select: { id: true, nameEn: true, nameBn: true, admissionNo: true } },
        optionalSubject: { select: { classSubjectId: true } },
        mainSubjects: { select: { classSubjectId: true } },
      },
    }),
  ]);

  const options = subjects.filter((s) => s.type === "OPTIONAL");
  const electives = subjects.filter((s) => s.type === "ELECTIVE");

  const students = enrollments
    .map((e) => {
      const mains = e.mainSubjects.map((m) => m.classSubjectId);
      const availableMains = openElectives(subjects, e.groupId).map((s) => s.id);
      return {
        enrollmentId: e.id,
        student: e.student,
        section: e.section,
        group: e.group,
        rollNumber: e.rollNumber,
        // the 4th subject
        choice: e.optionalSubject?.classSubjectId ?? null,
        // the 4th list as the mains are now
        available: fourthOptions(subjects, { groupId: e.groupId, mainIds: mains }).map((s) => s.id),
        mains,
        availableMains,
        // how many of availableMains they take as main (0: the class has none for them)
        mainCount: mainCountFor(rules, e.groupId, availableMains.length),
      };
    })
    .sort(
      (a, b) =>
        a.section.name.localeCompare(b.section.name) ||
        (a.rollNumber ?? "").localeCompare(b.rollNumber ?? "", undefined, { numeric: true }),
    );

  return {
    academicYear: year,
    class: schoolClass,
    // the fixed 4th subjects, and the "main or 4th" ones
    options,
    electives,
    electiveRules: rules,
    hasOptionalSubjects: subjects.length > 0,
    // students who could choose but have not: flagged before results are published
    missingChoices: students.filter((s) => s.choice === null && s.available.length > 0).length,
    missingMains: students.filter((s) => s.mainCount > 0 && s.mains.length !== s.mainCount).length,
    students,
  };
};

/*
 * Sets students' main subjects and/or 4th subject. All or nothing. Mains are the whole set
 * (exactly the class's number, or [] to clear). A 4th that becomes one of the new mains is
 * cleared; a 4th asked for must be on the 4th list as it will be after saving.
 */
const setChoices = async (schoolId: string, userId: string, data: SetOptionalChoicesPayload) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { id: { in: data.choices.map((c) => c.enrollmentId) }, student: { schoolId } },
    select: {
      id: true,
      classId: true,
      academicYearId: true,
      groupId: true,
      optionalSubject: { select: { classSubjectId: true } },
      mainSubjects: { select: { classSubjectId: true } },
    },
  });
  if (enrollments.length !== data.choices.length) {
    throw new AppError("One or more students were not found", httpStatus.NOT_FOUND);
  }

  // every choice subject of the classes and years involved
  const places = [...new Map(enrollments.map((e) => [`${e.academicYearId}:${e.classId}`, e])).values()];
  const [subjects, rules] = await Promise.all([
    prisma.classSubject.findMany({
      where: {
        schoolId,
        type: { in: ["OPTIONAL", "ELECTIVE"] },
        OR: places.map((p) => ({ academicYearId: p.academicYearId, classId: p.classId })),
      },
      select: { id: true, classId: true, academicYearId: true, groupId: true, type: true, subject: { select: { nameEn: true, nameBn: true } } },
    }),
    prisma.electiveRule.findMany({
      where: { OR: places.map((p) => ({ academicYearId: p.academicYearId, classId: p.classId })) },
      select: { academicYearId: true, classId: true, groupId: true, mainCount: true },
    }),
  ]);
  const enrollmentOf = new Map(enrollments.map((e) => [e.id, e]));

  type Plan = { enrollmentId: string; mainIds: string[] | undefined; fourth: string | null | undefined };
  const plans: Plan[] = [];
  let clearedFourths = 0;

  for (const choice of data.choices) {
    const e = enrollmentOf.get(choice.enrollmentId)!;
    const ofClass = subjects.filter((s) => s.classId === e.classId && s.academicYearId === e.academicYearId);
    const nameOf = (id: string) => {
      const s = subjects.find((x) => x.id === id);
      return s ? displayName(s.subject) : "This subject";
    };

    // the mains as they will be
    let mains = e.mainSubjects.map((m) => m.classSubjectId);
    if (choice.mainIds !== undefined) {
      const open = openElectives(ofClass, e.groupId).map((s) => s.id);
      const classRules = rules.filter((r) => r.academicYearId === e.academicYearId && r.classId === e.classId);
      const count = mainCountFor(classRules, e.groupId, open.length);
      for (const id of choice.mainIds) {
        if (!open.includes(id)) {
          throw new AppError(`${nameOf(id)} is not a "main or 4th" subject of the student's class and group`, httpStatus.BAD_REQUEST);
        }
      }
      if (choice.mainIds.length > 0 && choice.mainIds.length !== count) {
        throw new AppError(
          count === 1 ? "Choose one main subject" : `Choose ${count} main subjects`,
          httpStatus.BAD_REQUEST,
        );
      }
      mains = choice.mainIds;
    }

    // the 4th as it will be
    let fourth = choice.classSubjectId === undefined ? (e.optionalSubject?.classSubjectId ?? null) : choice.classSubjectId;
    if (fourth && mains.includes(fourth)) {
      if (choice.classSubjectId) {
        throw new AppError(`${nameOf(fourth)} can't be both a main subject and the 4th subject`, httpStatus.BAD_REQUEST);
      }
      // it moved to the mains: the 4th is chosen again
      fourth = null;
      clearedFourths++;
    }
    if (fourth && choice.classSubjectId !== undefined) {
      const allowed = fourthOptions(ofClass, { groupId: e.groupId, mainIds: mains }).map((s) => s.id);
      if (!allowed.includes(fourth)) {
        const s = subjects.find((x) => x.id === fourth);
        throw new AppError(
          s ? `${displayName(s.subject)} is not on the student's 4th-subject list` : "Only a 4th subject of the class can be chosen",
          httpStatus.BAD_REQUEST,
        );
      }
    }

    plans.push({
      enrollmentId: e.id,
      mainIds: choice.mainIds !== undefined ? mains : undefined,
      fourth: fourth === (e.optionalSubject?.classSubjectId ?? null) ? undefined : fourth,
    });
  }

  await prisma.$transaction(async (tx) => {
    for (const p of plans) {
      if (p.mainIds !== undefined) {
        await tx.studentMainSubject.deleteMany({ where: { enrollmentId: p.enrollmentId, classSubjectId: { notIn: p.mainIds } } });
        await tx.studentMainSubject.createMany({
          data: p.mainIds.map((classSubjectId) => ({ enrollmentId: p.enrollmentId, classSubjectId, chosenBy: userId })),
          skipDuplicates: true,
        });
      }
      if (p.fourth === undefined) continue;
      if (p.fourth) {
        await tx.studentOptionalSubject.upsert({
          where: { enrollmentId: p.enrollmentId },
          create: { enrollmentId: p.enrollmentId, classSubjectId: p.fourth, chosenBy: userId },
          update: { classSubjectId: p.fourth, chosenBy: userId },
        });
      } else {
        await tx.studentOptionalSubject.deleteMany({ where: { enrollmentId: p.enrollmentId } });
      }
    }
  });

  return { saved: data.choices.length, clearedFourths };
};

export const OptionalSubjectService = {
  getChoices,
  setChoices,
};
