import { z } from "zod";
import { schoolNameFields, type SchoolLanguage } from "./names";

// Mirrors createExam / updateExam in server/src/app/modules/exam/exam.validation.ts.

export type ExamFormInput = {
  nameEn: string;
  nameBn: string;
  type: "SINGLE" | "MULTIPLE";
  allClasses: boolean;
  classIds: string[];
  attendanceFrom: string;
  attendanceTo: string;
};
export type ExamFormValues = Omit<ExamFormInput, "nameEn" | "nameBn"> & { nameEn: string | null; nameBn: string | null };

/** An exam; the name in the school's language is required. */
export const examFormSchema = (language: SchoolLanguage) =>
  z
    .object({
      ...schoolNameFields(language, 100),
      type: z.enum(["SINGLE", "MULTIPLE"]),
      allClasses: z.boolean(),
      classIds: z.array(z.string()),
      attendanceFrom: z.string(),
      attendanceTo: z.string(),
    })
    .superRefine((v, ctx) => {
      if (!v.allClasses && v.classIds.length === 0) {
        ctx.addIssue({ code: "custom", path: ["classIds"], message: "validation.chooseClasses" });
      }
      if (!!v.attendanceFrom !== !!v.attendanceTo) {
        ctx.addIssue({ code: "custom", path: ["attendanceTo"], message: "validation.bothDates" });
      } else if (v.attendanceFrom && v.attendanceTo < v.attendanceFrom) {
        ctx.addIssue({ code: "custom", path: ["attendanceTo"], message: "validation.dateOrder" });
      }
    }) as unknown as z.ZodType<ExamFormValues, ExamFormInput>;
