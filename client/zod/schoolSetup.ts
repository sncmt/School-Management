import { z } from "zod";
import { toAsciiDigits } from "@/lib/i18n/digits";

// Mirrors the server's academicYear.validation.ts and class.validation.ts.
// Messages are translation keys; <FormMessage> shows them in the current language.

// <input type="date"> gives YYYY-MM-DD, or "" when empty
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validation.dateRequired");

export const academicYearFormSchema = z
  .object({
    // a year named in Bangla digits ("২০২৭") is stored as "2027"
    name: z.string().trim().min(1, "validation.yearNameRequired").max(50).transform(toAsciiDigits),
    startDate: date,
    endDate: date,
    // create only: make the new year the current one
    isCurrent: z.boolean(),
  })
  .refine((v) => !v.startDate || !v.endDate || v.endDate > v.startDate, {
    path: ["endDate"],
    message: "validation.endAfterStart",
  });

export const classFormSchema = z.object({
  name: z.string().trim().min(1, "validation.classNameRequired").max(50),
  // typed as text so Bangla digits work too
  numericLevel: z
    .string()
    .trim()
    .min(1, "validation.levelRequired")
    .transform((v) => Number(toAsciiDigits(v)))
    .pipe(z.number("validation.levelRange").int("validation.levelRange").min(0, "validation.levelRange").max(30, "validation.levelRange")),
});

export type AcademicYearFormInput = z.input<typeof academicYearFormSchema>;
export type AcademicYearFormValues = z.output<typeof academicYearFormSchema>;
export type ClassFormInput = z.input<typeof classFormSchema>;
export type ClassFormValues = z.output<typeof classFormSchema>;
