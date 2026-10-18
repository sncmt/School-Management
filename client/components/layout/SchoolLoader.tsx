"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** The loading screen: a small open book turning a page (see .sl-* in globals.css). */
export function SchoolLoader({ className }: { className?: string }) {
  const t = useTranslations("common");
  return (
    <div role="status" className={cn("flex flex-col items-center justify-center gap-4 p-6", className)}>
      <div className="sl-book" aria-hidden>
        <div className="sl-page sl-left" />
        <div className="sl-page sl-right" />
        <div className="sl-page sl-right sl-flip" />
      </div>
      <p className="text-sm text-muted-foreground">{t("loading")}</p>
    </div>
  );
}
