"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalizedName } from "@/lib/i18n/names";
import { keyToDate, todayKey, useCalendarMonth } from "@/lib/school/calendar";
import { cn } from "@/lib/utils";
import { useWeekdayName, WEEK_ORDER } from "../calendar/shared";

const pad = (n: number) => String(n).padStart(2, "0");

/** A month of the school calendar: today circled, school holidays and weekly days off marked. */
export function MiniCalendar() {
  const t = useTranslations("school.home.calendar");
  const format = useFormatter();
  const name = useLocalizedName();
  const weekday = useWeekdayName();
  const today = todayKey();
  const [ym, setYm] = useState(() => today.slice(0, 7));
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const month = useCalendarMonth({ from: `${ym}-01`, to: `${ym}-${pad(last)}` });
  const move = (step: number) => {
    const d = new Date(Date.UTC(y, m - 1 + step, 1));
    setYm(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`);
  };
  // empty cells before the 1st, the week starting on Saturday
  const lead = WEEK_ORDER.indexOf(keyToDate(`${ym}-01`).getUTCDay() as (typeof WEEK_ORDER)[number]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" size="icon" className="size-8 rounded-full bg-brand text-brand-foreground hover:bg-brand/85" onClick={() => move(-1)} aria-label={t("previous")}>
          <ChevronLeft />
        </Button>
        <span className="font-semibold">{format.dateTime(new Date(Date.UTC(y, m - 1, 1)), { month: "long", year: "numeric", timeZone: "UTC" })}</span>
        <Button variant="ghost" size="icon" className="size-8 rounded-full bg-muted" onClick={() => move(1)} aria-label={t("next")}>
          <ChevronRight />
        </Button>
      </div>

      {month.isPending ? (
        <Skeleton className="h-56" />
      ) : (
        <div className={cn("grid grid-cols-7 gap-y-1 text-center text-sm", month.isFetching && "opacity-60")}>
          {WEEK_ORDER.map((d) => (
            <div key={d} className="pb-1 text-xs font-medium text-muted-foreground">
              {weekday(d, "short")}
            </div>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <div key={`lead-${i}`} />
          ))}
          {month.data?.days.map((day) => {
            const isToday = day.date === today;
            const off = !day.teachers.isSchoolDay || day.isWeeklyHoliday;
            const holiday = day.events.find((e) => e.kind === "HOLIDAY");
            return (
              <div key={day.date} className="flex justify-center">
                <span
                  title={holiday ? name(holiday) : undefined}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full tabular-nums",
                    isToday
                      ? "bg-sidebar font-semibold text-white"
                      : holiday
                        ? "bg-rose-100 font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                        : off
                          ? "text-rose-600/80 dark:text-rose-400/80"
                          : "text-foreground",
                  )}
                >
                  {format.number(Number(day.date.slice(8)))}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-sidebar" /> {t("today")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-rose-200 dark:bg-rose-900" /> {t("holiday")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-rose-600/80">12</span> {t("weeklyOff")}
        </span>
      </div>
    </div>
  );
}
