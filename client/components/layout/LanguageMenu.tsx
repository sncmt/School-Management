"use client";

import { Check, ChevronDown, Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocaleChoice } from "@/components/i18n/LanguageSwitcher";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { localeLabels, locales } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { topBarButton } from "./topBar";

/** The top bar's language picker: a globe, the language's name and a small arrow. */
export function LanguageMenu() {
  const t = useTranslations("common");
  const { current, choose, pending } = useLocaleChoice();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(topBarButton, "w-9 sm:w-auto sm:px-3", pending && "opacity-60")}
        aria-label={t("language")}
      >
        <Globe className="size-4" />
        <span className="hidden font-medium sm:inline" lang={current}>
          {localeLabels[current]}
        </span>
        <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
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
