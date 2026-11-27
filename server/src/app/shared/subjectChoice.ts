import type { Prisma } from "../../../generated/prisma/client";
import type { SubjectType } from "../../../generated/prisma/enums";
import { prisma } from "../../../lib/prisma";

/*
 * Who takes which subject of a class, in one place.
 *
 * A class subject is
 * - COMPULSORY: every student of the class (or of its group) takes it;
 * - OPTIONAL: a fixed 4th-subject choice, taken only by the student who picks it as their 4th;
 * - ELECTIVE ("main or 4th", e.g. Biology / Higher Math in Science): each student takes a set
 *   number of these as main subjects (ElectiveRule, default 1); the rest join their 4th list.
 *
 * Group and religion narrow all three (a group's subjects, a religion's subject). The role is
 * per class: a subject can be a fixed 4th in one class and main in another.
 */

type Db = Prisma.TransactionClient | typeof prisma;

export type ChoiceSubject = {
  id: string;
  type: SubjectType;
  groupId: string | null;
  subject: { religion: string | null };
};

export type StudentChoices = {
  groupId: string | null;
  religion: string | null;
  // the student's main picks among the ELECTIVE subjects
  mainIds: ReadonlySet<string> | readonly string[];
  // the student's 4th subject (an OPTIONAL subject, or an ELECTIVE not picked as main)
  fourthId: string | null;
};

const has = (ids: ReadonlySet<string> | readonly string[], id: string) =>
  Array.isArray(ids) ? ids.includes(id) : (ids as ReadonlySet<string>).has(id);

/** A whole-class subject, or one of the student's group. */
export const openTo = (cs: { groupId: string | null }, groupId: string | null) => cs.groupId === null || cs.groupId === groupId;

/** Whether the student takes the subject at all (as a main subject or as their 4th). */
export const takesSubject = (cs: ChoiceSubject, s: StudentChoices) => {
  if (!openTo(cs, s.groupId)) return false;
  if (cs.subject.religion !== null && cs.subject.religion !== s.religion) return false;
  if (cs.type === "OPTIONAL") return s.fourthId === cs.id;
  if (cs.type === "ELECTIVE") return has(s.mainIds, cs.id) || s.fourthId === cs.id;
  return true;
};

/** Whether the subject is the student's 4th (results count it as the optional subject). */
export const isFourthFor = (cs: { id: string }, s: { fourthId: string | null }) => s.fourthId === cs.id;

/** The student's 4th-subject list: the open fixed 4th subjects and the open electives not taken as main. */
export const fourthOptions = <C extends { id: string; type: SubjectType; groupId: string | null }>(
  subjects: readonly C[],
  s: { groupId: string | null; mainIds: ReadonlySet<string> | readonly string[] },
) =>
  subjects.filter(
    (cs) => openTo(cs, s.groupId) && (cs.type === "OPTIONAL" || (cs.type === "ELECTIVE" && !has(s.mainIds, cs.id))),
  );

/** The open electives a student picks their main subject(s) from. */
export const openElectives = <C extends { type: SubjectType; groupId: string | null }>(subjects: readonly C[], groupId: string | null) =>
  subjects.filter((cs) => cs.type === "ELECTIVE" && openTo(cs, groupId));

export type ElectiveRuleRow = { groupId: string | null; mainCount: number };

/*
 * How many electives a student of this group takes as main: the group's rule, else the
 * whole-class rule, else 1. Never more than leaves one elective for the 4th list.
 */
export const mainCountFor = (rules: readonly ElectiveRuleRow[], groupId: string | null, openCount: number) => {
  const rule = rules.find((r) => groupId !== null && r.groupId === groupId) ?? rules.find((r) => r.groupId === null);
  const count = rule?.mainCount ?? 1;
  if (openCount === 0) return 0;
  return Math.min(count, Math.max(1, openCount - 1));
};

export const loadElectiveRules = (db: Db, academicYearId: string, classId: string) =>
  db.electiveRule.findMany({ where: { academicYearId, classId }, select: { groupId: true, mainCount: true } });

/** The select that brings a student's choices along with an enrollment. */
export const choicesSelect = {
  optionalSubject: { select: { classSubjectId: true } },
  mainSubjects: { select: { classSubjectId: true } },
} as const;

/** An enrollment's choices in the shape takesSubject reads. */
export const choicesOf = (e: {
  groupId: string | null;
  student: { religion: string | null };
  optionalSubject: { classSubjectId: string } | null;
  mainSubjects: { classSubjectId: string }[];
}): StudentChoices => ({
  groupId: e.groupId,
  religion: e.student.religion,
  mainIds: new Set(e.mainSubjects.map((m) => m.classSubjectId)),
  fourthId: e.optionalSubject?.classSubjectId ?? null,
});
