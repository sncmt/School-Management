"use client";

import { useFormatter } from "next-intl";
import { useCallback } from "react";
import type { DayReason, Weekday } from "@/lib/school/calendar";
import { keyToDate } from "@/lib/school/calendar";

// The school week in Bangladesh starts on Saturday.
export const WEEK_ORDER: Weekday[] = [6, 0, 1, 2, 3, 4, 5];

// a Sunday, so day d of the week is this date + d days
const SUNDAY = Date.UTC(2023, 0, 1);

/** Weekday names in the current language: name(5) -> "Friday" / "শুক্রবার". */
export const useWeekdayName = () => {
  const format = useFormatter();
  return useCallback(
    (day: number, width: "long" | "short" = "long") =>
      format.dateTime(new Date(SUNDAY + day * 86_400_000), { weekday: width, timeZone: "UTC" }),
    [format],
  );
};

/** "26 Mar 2027" or "26 Mar – 2 Apr 2027" for a YYYY-MM-DD range. */
export const useDateRange = () => {
  const format = useFormatter();
  return useCallback(
    (from: string, to: string) => {
      const a = keyToDate(from);
      const b = keyToDate(to);
      return from.slice(0, 10) === to.slice(0, 10)
        ? format.dateTime(a, { dateStyle: "medium", timeZone: "UTC" })
        : format.dateTimeRange(a, b, { dateStyle: "medium", timeZone: "UTC" });
    },
    [format],
  );
};

// how each kind of day looks, in the month grid and its legend
export const DAY_STYLES: Record<DayReason, { cell: string; dot: string }> = {
  SCHOOL_DAY: { cell: "bg-background", dot: "bg-background border" },
  WORKING_DAY: {
    cell: "bg-emerald-50 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800",
    dot: "bg-emerald-200 dark:bg-emerald-800",
  },
  HOLIDAY: {
    cell: "bg-amber-50 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800",
    dot: "bg-amber-200 dark:bg-amber-800",
  },
  NATIONAL_HOLIDAY: {
    cell: "bg-rose-50 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800",
    dot: "bg-rose-200 dark:bg-rose-800",
  },
  WEEKLY_HOLIDAY: { cell: "bg-muted/70 text-muted-foreground", dot: "bg-muted-foreground/30" },
};

export const DAY_REASONS: DayReason[] = ["SCHOOL_DAY", "WEEKLY_HOLIDAY", "NATIONAL_HOLIDAY", "HOLIDAY", "WORKING_DAY"];
