/*
 * The two rules of the routine, with no database access.
 */

/* Who a class subject is for, within a section. */
export type Audience = {
  groupId: string | null; // a group subject: only that group's students
  religion: string | null; // a religion subject: only students of that religion
  optionalId: string | null; // an optional (4th) subject: only the students who chose it
};

export const audienceOf = (cs: { id: string; type: string; groupId: string | null; subject: { religion: string | null } }): Audience => ({
  groupId: cs.groupId,
  religion: cs.subject.religion,
  optionalId: cs.type === "OPTIONAL" ? cs.id : null,
});

/*
 * Two classes can share a section's period only when no student is in both: different
 * groups (Physics for Science, Accounting for Business), different religions (Islam,
 * Hindu religion), or different optional subjects (Agriculture, Higher Math).
 */
export const audiencesDisjoint = (a: Audience, b: Audience) =>
  (a.groupId !== null && b.groupId !== null && a.groupId !== b.groupId) ||
  (a.religion !== null && b.religion !== null && a.religion !== b.religion) ||
  (a.optionalId !== null && b.optionalId !== null && a.optionalId !== b.optionalId);

/* Two clock times ("HH:mm") overlap: one starts before the other ends. */
export const timesOverlap = (a: { startTime: string; endTime: string }, b: { startTime: string; endTime: string }) =>
  a.startTime < b.endTime && b.startTime < a.endTime;

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
