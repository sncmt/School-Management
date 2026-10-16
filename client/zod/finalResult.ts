import { z } from "zod";
import { toAsciiDigits } from "@/lib/i18n/digits";
import type { FinalMethod } from "@/lib/school/finalResults";
import { schoolNameFields, type SchoolLanguage } from "./names";

// Mirrors createFormula / updateFormula in server/src/app/modules/exam/finalResult.validation.ts.
// Number fields are typed as text (either digit set) and checked here.

export type FormulaFormInput = {
  classId: string;
  nameEn: string;
  nameBn: string;
  attendanceFrom: string;
  attendanceTo: string;
  components: { nameEn: string; nameBn: string; weight: string; method: FinalMethod; bestCount: string; examIds: string[] }[];
};

export type FormulaFormValues = {
  classId: string;
  nameEn: string | null;
  nameBn: string | null;
  attendanceFrom: string;
  attendanceTo: string;
  components: { nameEn: string | null; nameBn: string | null; weight: number; method: FinalMethod; bestCount?: number; examIds: string[] }[];
};

const weight = z
  .string()
  .trim()
  .transform(toAsciiDigits)
  .pipe(
    z
      .string()
      .min(1, "validation.numberRequired")
      .regex(/^\d+(\.\d{1,2})?$/, "validation.decimal2")
      .transform(Number)
      .pipe(z.number().gt(0, "validation.weightRange").max(100, "validation.weightRange")),
  );

/* The text of a weight as a number, or 0 while it is not one yet (for the running total). */
export const weightOf = (text: string) => {
  const n = Number(toAsciiDigits(text.trim()));
  return Number.isFinite(n) ? n : 0;
};

/** A final result: names, the optional attendance period and weighted components adding up to 100. */
export const formulaFormSchema = (language: SchoolLanguage) =>
  z
    .object({
      classId: z.string().min(1, "validation.classRequired"),
      ...schoolNameFields(language, 100),
      attendanceFrom: z.string(),
      attendanceTo: z.string(),
      components: z
        .array(
          z.object({
            ...schoolNameFields(language, 100),
            weight,
            method: z.enum(["AVERAGE", "BEST"]),
            bestCount: z.string().trim().transform(toAsciiDigits),
            examIds: z.array(z.string()).min(1, "validation.chooseExams"),
          }),
        )
        .min(1),
    })
    .superRefine((v, ctx) => {
      v.components.forEach((c, i) => {
        if (c.method !== "BEST") return;
        const n = Number(c.bestCount);
        if (!/^\d+$/.test(c.bestCount) || n < 1 || n > c.examIds.length) {
          ctx.addIssue({ code: "custom", path: ["components", i, "bestCount"], message: "validation.bestCountRange" });
        }
      });
      const total = v.components.reduce((s, c) => s + c.weight, 0);
      if (Math.abs(total - 100) > 1e-6) {
        ctx.addIssue({ code: "custom", path: ["components", "root"], message: "validation.weightTotal" });
      }
      const examIds = v.components.flatMap((c) => c.examIds);
      if (new Set(examIds).size !== examIds.length) {
        ctx.addIssue({ code: "custom", path: ["components", "root"], message: "validation.examTwice" });
      }
      if (!!v.attendanceFrom !== !!v.attendanceTo) {
        ctx.addIssue({ code: "custom", path: ["attendanceTo"], message: "validation.bothDates" });
      } else if (v.attendanceFrom && v.attendanceTo < v.attendanceFrom) {
        ctx.addIssue({ code: "custom", path: ["attendanceTo"], message: "validation.dateOrder" });
      }
    })
    .transform((v) => ({
      ...v,
      components: v.components.map(({ bestCount, ...c }) => ({
        ...c,
        ...(c.method === "BEST" ? { bestCount: Number(bestCount) } : {}),
      })),
    })) as unknown as z.ZodType<FormulaFormValues, FormulaFormInput>;
