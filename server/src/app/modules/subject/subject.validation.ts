import { z } from "zod";
import { Religion } from "../../../../generated/prisma/enums";
import { idSchema } from "../../shared/financeSchemas";
import { schoolLanguageNames } from "../../shared/names";

/*
 * Names: the shared NCTB list needs both (every school reads it, in either
 * language); a school's own subject needs the name in the school's language,
 * which the service checks, and the other is optional.
 */
const nameEn = z
  .string({ error: "English name is required!" })
  .trim()
  .min(1, "English name is required!")
  .max(100, "English name cannot exceed 100 characters");

const nameBn = z
  .string({ error: "Bangla name is required!" })
  .trim()
  .min(1, "Bangla name is required!")
  .max(100, "Bangla name cannot exceed 100 characters");

const platformNames = { nameEn, nameBn };
const schoolNames = schoolLanguageNames(100);

// NCTB code such as "101"
const code = z
  .string()
  .trim()
  .min(1)
  .max(20, "Code cannot exceed 20 characters")
  .regex(/^[A-Za-z0-9-]+$/, "Code: letters, digits and dashes only");

const religionNotPaper = {
  message: "A religion subject cannot be a paper",
  path: ["religion"],
};

const createFields = {
  code: code.optional(),
  // set for a paper: "Bangla 1st Paper" -> "Bangla"
  parentId: z.string().trim().min(1).optional(),
  // set for a religion subject: "Islam and Moral Education" -> ISLAM
  religion: z.enum(Religion).optional(),
};

// missing = leave as it is, null = clear
const updateFields = {
  code: code.nullable().optional(),
  parentId: z.string().trim().min(1).nullable().optional(),
  religion: z.enum(Religion).nullable().optional(),
};

const createSubject = z
  .strictObject({ ...platformNames, ...createFields })
  .refine((d) => !(d.parentId && d.religion), religionNotPaper);

const createSchoolSubject = z
  .strictObject({ ...schoolNames, ...createFields })
  .refine((d) => !(d.parentId && d.religion), religionNotPaper);

const updateSubject = z
  .strictObject({ nameEn: nameEn.optional(), nameBn: nameBn.optional(), ...updateFields })
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field to update" })
  .refine((d) => !(d.parentId && d.religion), religionNotPaper);

const updateSchoolSubject = z
  .strictObject({ ...schoolNames, ...updateFields })
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field to update" })
  .refine((d) => !(d.parentId && d.religion), religionNotPaper);

const subjectIdParams = z.object({ subjectId: idSchema("Subject id") });

const listSubjectsQuery = z.object({
  search: z.string().trim().min(1).optional(),
  // PLATFORM = the shared NCTB list, SCHOOL = this school's own subjects
  source: z.enum(["PLATFORM", "SCHOOL"]).optional(),
});

export const SubjectValidation = {
  createSubject,
  createSchoolSubject,
  updateSubject,
  updateSchoolSubject,
  subjectIdParams,
  listSubjectsQuery,
};
