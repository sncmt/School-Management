import { z } from "zod";
import { schoolNameFields, type SchoolLanguage } from "./names";

// Mirrors templateBody in server/src/app/modules/routine/routine.validation.ts.
// Messages are translation keys; <FormMessage> shows them in the current language.

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "validation.timeRequired");

export type PeriodInput = { nameEn: string; nameBn: string; startTime: string; endTime: string; isBreak: boolean };
export type TemplateFormInput = { nameEn: string; nameBn: string; periods: PeriodInput[] };
export type TemplateFormValues = {
  nameEn: string | null;
  nameBn: string | null;
  periods: (Omit<PeriodInput, "nameEn" | "nameBn"> & { nameEn: string | null; nameBn: string | null })[];
};

/*
 * A bell schedule. The template and each period are named in the school's language;
 * periods are numbered by their order and must follow one another without overlapping.
 */
export const templateFormSchema = (language: SchoolLanguage) =>
  z
    .object({
      ...schoolNameFields(language, 50),
      periods: z
        .array(
          z
            .object({ ...schoolNameFields(language, 50), startTime: time, endTime: time, isBreak: z.boolean() })
            .refine((p) => !p.startTime || !p.endTime || p.endTime > p.startTime, {
              path: ["endTime"],
              message: "validation.endTimeAfterStart",
            }),
        )
        .min(1, "validation.periodsRequired")
        .max(20, "validation.periodsMax"),
    })
    .superRefine((v, ctx) => {
      v.periods.forEach((p, i) => {
        const before = v.periods[i - 1];
        if (before && p.startTime && before.endTime && p.startTime < before.endTime) {
          ctx.addIssue({ code: "custom", path: ["periods", i, "startTime"], message: "validation.periodOverlap" });
        }
      });
    }) as unknown as z.ZodType<TemplateFormValues, TemplateFormInput>;

/*
 * Special hours for some days (Ramadan timing, an exam day). Each rule covers the whole
 * school, a class or a section ("school" | "class:<id>" | "section:<id>"), once each.
 */
export const overrideFormSchema = z
  .object({
    academicYearId: z.string().min(1, "validation.yearRequired"),
    name: z.string().trim().min(1, "validation.nameRequired").max(100, "validation.max100"),
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validation.dateRequired"),
    toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validation.dateRequired"),
    rules: z
      .array(
        z
          .object({ target: z.string().min(1), startTime: time, endTime: time, periodTemplateId: z.string() })
          .refine((r) => !r.startTime || !r.endTime || r.endTime > r.startTime, {
            path: ["endTime"],
            message: "validation.endTimeAfterStart",
          }),
      )
      .min(1, "validation.rulesRequired"),
  })
  .superRefine((v, ctx) => {
    if (v.fromDate && v.toDate && v.toDate < v.fromDate) {
      ctx.addIssue({ code: "custom", path: ["toDate"], message: "validation.dateOrder" });
    }
    const seen = new Set<string>();
    v.rules.forEach((r, i) => {
      if (seen.has(r.target)) ctx.addIssue({ code: "custom", path: ["rules", i, "target"], message: "validation.targetTwice" });
      seen.add(r.target);
    });
  });

export type OverrideFormInput = z.input<typeof overrideFormSchema>;
export type OverrideFormValues = z.output<typeof overrideFormSchema>;
