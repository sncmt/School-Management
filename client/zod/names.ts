import { z } from "zod";

// Names of things a school creates (groups, its own subjects, exams...): the name in the
// school's language is required, the other is optional. Mirrors server/src/app/shared/names.ts.
// Messages are translation keys; <FormMessage> shows them in the current language.

export type SchoolLanguage = "EN" | "BN";

export type NamesInput = { nameEn: string; nameBn: string };
// "" becomes null: no name in that language
export type NamesOutput = { nameEn: string | null; nameBn: string | null };

/** nameEn + nameBn fields for a school whose language is `language`. */
export const schoolNameFields = (language: SchoolLanguage, max: 50 | 100 = 100) => {
  const tooLong = max === 50 ? "validation.max50" : "validation.max100";
  const required = (message: string) => z.string().trim().min(1, message).max(max, tooLong);
  const optional = z
    .string()
    .trim()
    .max(max, tooLong)
    .transform((v) => v || null);

  return language === "BN"
    ? { nameBn: required("validation.banglaNameRequired"), nameEn: optional }
    : { nameEn: required("validation.englishNameRequired"), nameBn: optional };
};

/** A form that is only the two names. */
export const schoolNamesSchema = (language: SchoolLanguage, max: 50 | 100 = 100) =>
  z.object(schoolNameFields(language, max)) as unknown as z.ZodType<NamesOutput, NamesInput>;
