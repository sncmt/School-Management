import { z } from "zod";
import { trackSchema } from "../../shared/academicYears";
import { idSchema } from "../../shared/financeSchemas";

const optionalId = z.string().trim().min(1).optional();

// the full list of teachers for one subject in one section; it replaces what was there
// (an empty list removes all of them)
const setSubjectTeachers = z.strictObject({
  sectionId: idSchema("Section"),
  classSubjectId: idSchema("Class subject"),
  teacherIds: z
    .array(idSchema("Teacher"))
    .max(10, "Too many teachers for one subject")
    .refine((ids) => new Set(ids).size === ids.length, "The same teacher is listed twice"),
});

const listQuery = z.object({
  // defaults to the current academic year (of the class's or section's track, or of this track)
  academicYearId: optionalId,
  track: trackSchema.optional(),
  classId: optionalId,
  sectionId: optionalId,
  teacherId: optionalId,
});

export const SubjectTeacherValidation = {
  setSubjectTeachers,
  listQuery,
};
