import { z } from "zod";

// Mirrors nationalHolidayBody in server/src/app/modules/calendar/calendar.validation.ts.
// Messages are translation keys; <FormMessage> shows them in the current language.

const MAX_DAYS = 60;
const DAY_MS = 86_400_000;

// <input type="date"> gives YYYY-MM-DD, or "" when empty
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validation.dateRequired");

export const holidayFormSchema = z
  .object({
    nameEn: z.string().trim().min(1, "validation.englishNameRequired").max(100, "validation.max100"),
    nameBn: z.string().trim().min(1, "validation.banglaNameRequired").max(100, "validation.max100"),
    description: z
      .string()
      .trim()
      .max(500, "validation.max500")
      .transform((v) => v || undefined),
    fromDate: date,
    toDate: date,
  })
  .refine((v) => v.toDate >= v.fromDate, { path: ["toDate"], message: "validation.dateOrder" })
  // only once both dates are filled in ("" parses to NaN)
  .refine((v) => !v.fromDate || !v.toDate || (Date.parse(v.toDate) - Date.parse(v.fromDate)) / DAY_MS <= MAX_DAYS, {
    path: ["toDate"],
    message: "validation.holidayTooLong",
  });

export type HolidayFormInput = z.input<typeof holidayFormSchema>;
export type HolidayFormValues = z.output<typeof holidayFormSchema>;
