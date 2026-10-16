import { z } from "zod";
import { toAsciiDigits } from "@/lib/i18n/digits";

// Mirrors scaleBody in server/src/app/modules/grading/grading.validation.ts.
// Number fields are typed as text (either digit set) and checked here.

const decimal = (min: number, max: number) =>
  z
    .string()
    .trim()
    .transform(toAsciiDigits)
    .pipe(
      z
        .string()
        .min(1, "validation.numberRequired")
        .regex(/^\d+(\.\d{1,2})?$/, "validation.decimal2")
        .transform(Number)
        .pipe(z.number().min(min, "validation.numberRange").max(max, "validation.numberRange")),
    );

const grade = z.string().trim().min(1, "validation.gradeRequired").max(10, "validation.max10");

export type ScaleFormInput = {
  name: string;
  description: string;
  maxGpa: string;
  failGrade: string;
  failIfAnyCompulsoryFails: boolean;
  optionalBonusEnabled: boolean;
  optionalBonusThreshold: string;
  markBands: { minPercent: string; grade: string; point: string }[];
  gpaBands: { minGpa: string; grade: string }[];
};

export type ScaleFormValues = {
  name: string;
  description: string;
  maxGpa: number;
  failGrade: string;
  failIfAnyCompulsoryFails: boolean;
  optionalBonusEnabled: boolean;
  optionalBonusThreshold: number;
  markBands: { minPercent: number; grade: string; point: number }[];
  gpaBands: { minGpa: number; grade: string }[];
};

const unique = <T>(items: T[], key: (i: T) => unknown) => new Set(items.map(key)).size === items.length;

export const scaleFormSchema = z
  .object({
    name: z.string().trim().min(1, "validation.nameRequired").max(50, "validation.max50"),
    description: z.string().trim().max(300, "validation.max300"),
    maxGpa: decimal(1, 10),
    failGrade: grade,
    failIfAnyCompulsoryFails: z.boolean(),
    optionalBonusEnabled: z.boolean(),
    optionalBonusThreshold: decimal(0, 10),
    markBands: z
      .array(z.object({ minPercent: decimal(0, 100), grade, point: decimal(0, 10) }))
      .min(2, "validation.bandsMin")
      .max(20),
    gpaBands: z.array(z.object({ minGpa: decimal(0, 10), grade })).min(2, "validation.bandsMin").max(20),
  })
  .superRefine((v, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: "custom", path, message });

    if (!v.markBands.some((b) => b.minPercent === 0)) issue(["markBands"], "validation.markBandZero");
    else if (!unique(v.markBands, (b) => b.minPercent) || !unique(v.markBands, (b) => b.grade)) {
      issue(["markBands"], "validation.bandsUnique");
    } else {
      const sorted = [...v.markBands].sort((a, b) => a.minPercent - b.minPercent);
      if (!sorted.every((b, i) => i === 0 || b.point >= sorted[i - 1].point)) issue(["markBands"], "validation.pointsRise");
    }
    v.markBands.forEach((b, i) => {
      if (b.point > v.maxGpa) issue(["markBands", i, "point"], "validation.aboveMaxGpa");
    });

    if (!v.gpaBands.some((b) => b.minGpa === 0)) issue(["gpaBands"], "validation.gpaBandZero");
    else if (!unique(v.gpaBands, (b) => b.minGpa) || !unique(v.gpaBands, (b) => b.grade)) {
      issue(["gpaBands"], "validation.bandsUnique");
    }
    v.gpaBands.forEach((b, i) => {
      if (b.minGpa > v.maxGpa) issue(["gpaBands", i, "minGpa"], "validation.aboveMaxGpa");
    });

    if (v.optionalBonusThreshold > v.maxGpa) issue(["optionalBonusThreshold"], "validation.aboveMaxGpa");
  }) as unknown as z.ZodType<ScaleFormValues, ScaleFormInput>;
