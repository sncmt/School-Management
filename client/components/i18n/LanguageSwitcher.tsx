"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE, localeLabels, locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** The current language and a way to change it; the choice is remembered on this site only. */
export const useLocaleChoice = () => {
  const current = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const choose = (locale: Locale) => {
    if (locale === current) return;
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    // re-render the server components in the new language, keeping client state
    startTransition(() => router.refresh());
  };
  return { current: current as Locale, choose, pending };
};

/** বাংলা | English toggle. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common");
  const { current, choose, pending } = useLocaleChoice();

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={cn("inline-flex rounded-md border p-0.5 text-sm", pending && "opacity-60", className)}
    >
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          onClick={() => choose(locale)}
          aria-pressed={locale === current}
          className={cn(
            "rounded px-2.5 py-1 text-muted-foreground hover:text-foreground",
            locale === current && "bg-muted font-medium text-foreground",
          )}
        >
          {localeLabels[locale]}
        </button>
      ))}
    </div>
  );
}
