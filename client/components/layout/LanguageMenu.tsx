"use client";

import { Check, ChevronDown, Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocaleChoice } from "@/components/i18n/LanguageSwitcher";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { localeLabels, locales } from "@/i18n/config";
import { cn } from "@/lib/utils";

/** The top bar's language picker: a globe, the language's name and a small arrow. */
export function LanguageMenu() {
  const t = useTranslations("common");
  const { current, choose, pending } = useLocaleChoice();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn("flex h-9 items-center gap-2 rounded-full px-2 text-sm text-foreground/80 hover:text-foreground", pending && "opacity-60")}
        aria-label={t("language")}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-muted">
          <Globe className="size-4 text-muted-foreground" />
        </span>
        <span className="hidden sm:inline" lang={current}>
          {localeLabels[current]}
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {locales.map((locale) => (
          <DropdownMenuItem key={locale} lang={locale} onSelect={() => choose(locale)}>
            <span className="flex-1">{localeLabels[locale]}</span>
            {locale === current && <Check className="size-4 text-brand" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
