import { useLocale } from "next-intl";
import { useCallback } from "react";
import type { Locale } from "@/i18n/config";

export type BilingualName = { nameEn?: string | null; nameBn?: string | null };

/** A record's name in the given language, falling back to the other one when it's empty. */
export const pickName = (item: BilingualName, locale: Locale) =>
  (locale === "bn" ? item.nameBn || item.nameEn : item.nameEn || item.nameBn) ?? "";

/** `name(subject)` -> the subject's name in the current language. */
export const useLocalizedName = () => {
  const locale = useLocale();
  return useCallback((item: BilingualName) => pickName(item, locale), [locale]);
};
