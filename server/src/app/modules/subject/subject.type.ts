import type { z } from "zod";
import { SubjectValidation } from "./subject.validation";

// one shape for both lists: a school's names may be null, the platform's never are
export type CreateSubjectPayload = z.infer<typeof SubjectValidation.createSchoolSubject>;
export type UpdateSubjectPayload = z.infer<typeof SubjectValidation.updateSchoolSubject>;
export type ListSubjectsQuery = z.infer<typeof SubjectValidation.listSubjectsQuery>;
