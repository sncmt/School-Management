import { z } from "zod";
import { toAsciiDigits } from "@/lib/i18n/digits";

// Mirrors setMarks in server/src/app/modules/classSubject/classSubject.validation.ts.
// Messages are translation keys; <FormMessage> shows them in the current language.

const hasMaxTwoDecimals = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

// typed as text so Bangla digits work too
const marks = z
  .string()
  .trim()
  .min(1, "validation.marksRequired")
  .transform((v) => Number(toAsciiDigits(v)))
  .pipe(
    z
      .number("validation.marksInvalid")
      .positive("validation.marksInvalid")
      .max(1000, "validation.marksInvalid")
      .refine(hasMaxTwoDecimals, "validation.marksInvalid"),
  );

const part = z
  .object({
    name: z.string().trim().min(1, "validation.partNameRequired").max(30),
    fullMarks: marks,
    passMarks: marks,
  })
  .refine((p) => p.passMarks <= p.fullMarks, { path: ["passMarks"], message: "validation.passAboveFull" });

export const marksSetupSchema = z
  .object({
    fullMarks: marks,
    passMarks: marks,
    parts: z
      .array(part)
      .max(5)
      .refine((ps) => new Set(ps.map((p) => p.name.toLowerCase())).size === ps.length, "validation.partNamesRepeated"),
    gradingScaleId: z.string(), // "" = the class's scale
  })
  .refine((d) => d.passMarks <= d.fullMarks, { path: ["passMarks"], message: "validation.passAboveFull" })
  .refine((d) => d.parts.length !== 1, { path: ["parts"], message: "validation.partsAtLeastTwo" })
  .refine(
    (d) => d.parts.length === 0 || Math.abs(d.parts.reduce((sum, p) => sum + p.fullMarks, 0) - d.fullMarks) < 1e-6,
    { path: ["parts"], message: "validation.partsSum" },
  )
  .transform(({ gradingScaleId, ...rest }) => ({ ...rest, gradingScaleId: gradingScaleId || null }));

export type MarksSetupInput = z.input<typeof marksSetupSchema>;
export type MarksSetupValues = z.output<typeof marksSetupSchema>;
