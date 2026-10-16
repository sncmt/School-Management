import { z } from "zod";
import { schoolNameFields, type SchoolLanguage } from "./names";

// Mirrors entryBody / setWeeklyRule in server/src/app/modules/calendar/calendar.validation.ts.
// Messages are translation keys; <FormMessage> shows them in the current language.

const DAY_MS = 86_400_000;
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validation.dateRequired");

export type EntryFormInput = {
  academicYearId: string;
  kind: "HOLIDAY" | "WORKING_DAY";
  type: "PUBLIC" | "SCHOOL" | "VACATION" | "";
  nameEn: string;
  nameBn: string;
  description: string;
  fromDate: string;
  toDate: string;
  allClasses: boolean;
  classIds: string[];
  teachersOff: boolean;
};

export type EntryFormValues = Omit<EntryFormInput, "nameEn" | "nameBn"> & {
  nameEn: string | null;
  nameBn: string | null;
};

/** A school holiday or make-up working day; the name in the school's language is required. */
export const entryFormSchema = (language: SchoolLanguage) =>
  z
    .object({
      ...schoolNameFields(language, 100),
      academicYearId: z.string().min(1, "validation.yearRequired"),
      kind: z.enum(["HOLIDAY", "WORKING_DAY"]),
      type: z.enum(["PUBLIC", "SCHOOL", "VACATION", ""]),
      description: z.string().trim().max(500, "validation.max500"),
      fromDate: date,
      toDate: date,
      allClasses: z.boolean(),
      classIds: z.array(z.string()),
      teachersOff: z.boolean(),
    })
    .superRefine((v, ctx) => {
      if (v.kind === "HOLIDAY" && !v.type) {
        ctx.addIssue({ code: "custom", path: ["type"], message: "validation.holidayTypeRequired" });
      }
      if (!v.allClasses && v.classIds.length === 0) {
        ctx.addIssue({ code: "custom", path: ["classIds"], message: "validation.chooseClasses" });
      }
      if (v.fromDate && v.toDate) {
        if (v.toDate < v.fromDate) {
          ctx.addIssue({ code: "custom", path: ["toDate"], message: "validation.dateOrder" });
        } else if (Date.parse(v.toDate) - Date.parse(v.fromDate) > 120 * DAY_MS) {
          ctx.addIssue({ code: "custom", path: ["toDate"], message: "validation.entryTooLong" });
        }
      }
    }) as unknown as z.ZodType<EntryFormValues, EntryFormInput>;

/** A new weekly holiday from a date on. */
export const weeklyRuleSchema = z.object({
  effectiveFrom: date,
  weekdays: z.array(z.number().int().min(0).max(6)).max(6, "validation.oneSchoolDay"),
});

export type WeeklyRuleInput = z.input<typeof weeklyRuleSchema>;
export type WeeklyRuleValues = z.output<typeof weeklyRuleSchema>;
