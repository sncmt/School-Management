import type { Site } from "@/lib/tenant";

export const locales = ["bn", "en"] as const;
export type Locale = (typeof locales)[number];

// Set by the language switcher. Host-only, so the choice is per site:
// English on one school's site doesn't change another school or the admin.
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (locales as readonly string[]).includes(value);

// Sites without a school of their own. A school's site defaults to the school's language.
export const siteDefaultLocale: Record<Exclude<Site["type"], "SCHOOL">, Locale> = {
  MARKETING: "bn",
  PLATFORM: "bn",
};

// Used when a school's language can't be loaded
export const fallbackLocale: Locale = "bn";

/** The server's School.language (EN | BN) as a locale. */
export const localeFromSchoolLanguage = (language: "EN" | "BN"): Locale =>
  language === "EN" ? "en" : "bn";

export const localeLabels: Record<Locale, string> = {
  bn: "বাংলা",
  en: "English",
};
