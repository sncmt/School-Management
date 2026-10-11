import { z } from "zod";
import { toAsciiDigits } from "@/lib/i18n/digits";

// Mirrors the server's section.validation.ts.
// Messages are translation keys; <FormMessage> shows them in the current language.

const sectionName = z.string().trim().min(1, "validation.sectionNameRequired").max(50, "validation.sectionNameTooLong");

/** "A, B , c" -> ["A", "B", "c"]; a Bangla comma (،) or a semicolon works too. */
export const splitSectionNames = (text: string) =>
  text
    .split(/[,،;]/)
    .map((n) => n.trim())
    .filter(Boolean);

export const addSectionsSchema = z.object({
  classIds: z.array(z.string()).min(1, "validation.chooseClasses"),
  names: z
    .string()
    .transform(splitSectionNames)
    .pipe(
      z
        .array(sectionName)
        .min(1, "validation.sectionNamesRequired")
        .max(20)
        // "A" and "a" are the same name
        .refine((names) => new Set(names.map((n) => n.toLowerCase())).size === names.length, "validation.sectionNamesRepeated"),
    ),
});

export const renameSectionSchema = z.object({ name: sectionName });

// <input type="time"> gives "HH:mm", or "" when empty
const time = z.string().regex(/^(\d{2}:\d{2})?$/);

export const sectionSettingsSchema = z
  .object({
    classTeacherMembershipId: z.string(), // "" = none
    capacity: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : Number(toAsciiDigits(v))))
      .pipe(
        z
          .number("validation.capacityInvalid")
          .int("validation.capacityInvalid")
          .min(1, "validation.capacityInvalid")
          .max(500, "validation.capacityInvalid")
          .nullable(),
      ),
    startTime: time,
    endTime: time,
    periodTemplateId: z.string(), // "" = none
  })
  .refine((v) => !v.startTime === !v.endTime, { path: ["endTime"], message: "validation.bothTimes" })
  .refine((v) => !v.startTime || !v.endTime || v.endTime > v.startTime, {
    path: ["endTime"],
    message: "validation.endTimeAfterStart",
  });

export type AddSectionsInput = z.input<typeof addSectionsSchema>;
export type AddSectionsValues = z.output<typeof addSectionsSchema>;
export type SectionSettingsInput = z.input<typeof sectionSettingsSchema>;
export type SectionSettingsValues = z.output<typeof sectionSettingsSchema>;
