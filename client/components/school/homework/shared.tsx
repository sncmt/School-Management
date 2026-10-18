"use client";

import { useFormatter, useTranslations } from "next-intl";
import { daysFromToday, type CheckStatus, type HomeworkSection } from "@/lib/school/homework";
import { cn } from "@/lib/utils";

/** A day key ("2026-10-18") as "18 Oct", or with the weekday / year. */
export const useDay = () => {
  const format = useFormatter();
  return (day: string, style: "short" | "weekday" | "long" = "short") =>
    format.dateTime(new Date(`${day}T00:00:00Z`), {
      day: "numeric",
      month: "short",
      ...(style === "weekday" ? { weekday: "short" } : style === "long" ? { year: "numeric" } : {}),
      timeZone: "UTC",
    });
};

/** "A, B" for the sections; empty when the class has no sections of its own. */
export const sectionNames = (sections: HomeworkSection[]) =>
  sections
    .filter((s) => !s.isDefault)
    .map((s) => s.name)
    .join(", ");

/** When it is due, from today: "Due today", "Due in 3 days", "Was due 2 days ago". */
export function DueLabel({ dueDate, className, done }: { dueDate: string; className?: string; done?: boolean }) {
  const t = useTranslations("school.homework.due");
  const day = useDay();
  const n = daysFromToday(dueDate);
  const tone = done ? "text-muted-foreground" : n < 0 ? "text-muted-foreground" : n <= 1 ? "text-[#b4271f] dark:text-[#ff7a70]" : "text-foreground";
  const text = n === 0 ? t("today") : n === 1 ? t("tomorrow") : n > 1 ? t("inDays", { count: n }) : t("past", { date: day(dueDate) });
  return <span className={cn("font-medium whitespace-nowrap", tone, className)}>{text}</span>;
}

export const CHECK_STYLES: Record<CheckStatus, { dot: string; chip: string }> = {
  DONE: { dot: "bg-[#0ca30c]", chip: "bg-[#0ca30c]/10 text-[#0a7d0a] dark:text-[#4fd14f] border-[#0ca30c]/30" },
  LATE: { dot: "bg-[#fab219]", chip: "bg-[#fab219]/15 text-[#8a5a00] dark:text-[#ffc94d] border-[#fab219]/40" },
  NOT_DONE: { dot: "bg-[#d03b3b]", chip: "bg-[#d03b3b]/10 text-[#b4271f] dark:text-[#ff7a70] border-[#d03b3b]/30" },
  EXCUSED: { dot: "bg-muted-foreground/50", chip: "bg-muted text-muted-foreground border-border" },
};

/** How a student's homework was ticked, as a dot and a word (never colour alone). */
export function CheckBadge({ status, className }: { status: CheckStatus; className?: string }) {
  const t = useTranslations("school.homework.checks");
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", CHECK_STYLES[status].chip, className)}>
      <span className={cn("size-1.5 rounded-full", CHECK_STYLES[status].dot)} />
      {t(status)}
    </span>
  );
}
