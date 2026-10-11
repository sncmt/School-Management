import { z } from "zod";
import { RELIGIONS, type Religion } from "@/lib/subjects";
import { schoolNameFields, type SchoolLanguage } from "./names";

// Mirrors the subject schemas in server/src/app/modules/subject/subject.validation.ts.
// Messages are translation keys; <FormMessage> shows them in the current language.

/*
 * One form for both lists. Names differ: the shared NCTB list needs both (every school
 * reads it, in either language); a school's own subject needs the school's language.
 */
const platformNames = {
  nameEn: z.string().trim().min(1, "validation.subjectNameEnRequired").max(100, "validation.max100"),
  nameBn: z.string().trim().min(1, "validation.subjectNameBnRequired").max(100, "validation.max100"),
};

const otherFields = {
  code: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[A-Za-z0-9-]{1,20}$/.test(v), "validation.codeFormat")
    .transform((v) => v || null),
  kind: z.enum(["main", "paper", "religion"]),
  parentId: z.string(),
  religion: z.enum([...RELIGIONS, ""]),
};

type KindFields = { kind: "main" | "paper" | "religion"; parentId: string; religion: Religion | "" };

// a paper needs its main subject, a religion subject its religion
const kindRules = (v: KindFields, ctx: z.RefinementCtx) => {
  if (v.kind === "paper" && !v.parentId) {
    ctx.addIssue({ code: "custom", path: ["parentId"], message: "validation.parentRequired" });
  }
  if (v.kind === "religion" && !v.religion) {
    ctx.addIssue({ code: "custom", path: ["religion"], message: "validation.religionRequired" });
  }
};

// only the field that matches the type is kept; the others are cleared
const keepMatchingKind = <T extends KindFields>({ kind, parentId, religion, ...rest }: T) => ({
  ...rest,
  parentId: kind === "paper" ? parentId : null,
  religion: kind === "religion" && religion ? religion : null,
});

export const subjectFormSchema = z
  .object({ ...platformNames, ...otherFields })
  .superRefine(kindRules)
  .transform(keepMatchingKind);

export const schoolSubjectFormSchema = (language: SchoolLanguage) =>
  z
    .object({ ...schoolNameFields(language, 100), ...otherFields })
    .superRefine(kindRules)
    .transform(keepMatchingKind) as unknown as z.ZodType<SubjectFormValues, SubjectFormInput>;

export type SubjectFormInput = z.input<typeof subjectFormSchema>;
// a school subject's name in the other language can be null
export type SubjectFormValues = Omit<z.output<typeof subjectFormSchema>, "nameEn" | "nameBn"> & {
  nameEn: string | null;
  nameBn: string | null;
};
