"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** This month's (or year's) subscription: paid, due, or no plan chosen yet. */
export function StandingBadge({ currentPaid }: { currentPaid: boolean | null }) {
  const t = useTranslations("platform.subscriptions.standing");
  const key = currentPaid === null ? "noPlan" : currentPaid ? "paid" : "due";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        key === "paid" && "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-950/40 dark:text-emerald-300",
        key === "due" && "bg-red-50 text-red-700 ring-red-600/15 dark:bg-red-950/40 dark:text-red-300",
        key === "noPlan" && "bg-muted text-muted-foreground ring-border",
      )}
    >
      <span className={cn("size-1.5 rounded-full", key === "paid" ? "bg-emerald-500" : key === "due" ? "bg-red-500" : "bg-muted-foreground/60")} />
      {t(key)}
    </span>
  );
}
