"use client";

import { CalendarCheck, CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  keyToDate,
  monthRange,
  todayKey,
  useCalendarMonth,
  type CalendarDay,
  type DayStatus,
} from "@/lib/school/calendar";
import { useClasses } from "@/lib/school/classes";
import { cn } from "@/lib/utils";
import type { EntryDefaults } from "./EntryFormDialog";
import { DAY_REASONS, DAY_STYLES, useWeekdayName, WEEK_ORDER } from "./shared";

const TEACHERS = "teachers"; // the Select's value for "the whole school (teachers)"

export function MonthView({ canManage, onAdd }: { canManage: boolean; onAdd: (defaults: EntryDefaults) => void }) {
  const t = useTranslations("school.calendar.month");
  const tReason = useTranslations("school.calendar.reasons");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const weekday = useWeekdayName();
  const describeError = useErrorMessage();
  const classes = useClasses();

  const today = todayKey();
  const [cursor, setCursor] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) }));
  const [classId, setClassId] = useState<string>(TEACHERS);
  const [openDay, setOpenDay] = useState<CalendarDay | null>(null);

  const range = monthRange(cursor.year, cursor.month);
  const { data, isPending, isError, error, isFetching, refetch } = useCalendarMonth({
    ...range,
    classId: classId === TEACHERS ? undefined : classId,
  });

  const move = (delta: number) =>
    setCursor(({ year, month }) => {
      const m = month - 1 + delta;
      return { year: year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 + 1 };
    });

  // blank cells before the 1st, so it lands under its weekday (weeks start on Saturday)
  const lead = WEEK_ORDER.indexOf(keyToDate(range.from).getUTCDay() as (typeof WEEK_ORDER)[number]);
  const statusOf = (day: CalendarDay): DayStatus => day.students ?? day.teachers;
  const schoolDays = data?.days.filter((d) => statusOf(d).isSchoolDay).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8" onClick={() => move(-1)} aria-label={t("previous")}>
            <ChevronLeft />
          </Button>
          <span className="min-w-40 text-center text-lg font-semibold">
            {format.dateTime(keyToDate(range.from), { month: "long", year: "numeric", timeZone: "UTC" })}
          </span>
          <Button variant="outline" size="icon" className="size-8" onClick={() => move(1)} aria-label={t("next")}>
            <ChevronRight />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCursor({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) })}
          >
            {t("today")}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("showFor")}</span>
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TEACHERS}>{t("teachers")}</SelectItem>
              {classes.data?.items.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {t("forClass", { name: c.name })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {DAY_REASONS.map((reason) => (
          <span key={reason} className="flex items-center gap-1.5">
            <span className={cn("size-3 rounded-sm", DAY_STYLES[reason].dot)} />
            {tReason(reason)}
          </span>
        ))}
        {data && <span className="ml-auto font-medium text-foreground">{t("schoolDays", { count: schoolDays })}</span>}
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-2 rounded-md border py-12 text-center text-sm text-muted-foreground">
          <p>{t("loadFailed")}</p>
          <p className="text-xs">{describeError(error)}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {tCommon("tryAgain")}
          </Button>
        </div>
      ) : (
        <div className={cn("transition-opacity", isFetching && !isPending && "opacity-60")}>
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {WEEK_ORDER.map((d) => (
              <div key={d} className="py-1">
                <span className="hidden sm:inline">{weekday(d, "long")}</span>
                <span className="sm:hidden">{weekday(d, "short")}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: lead }, (_, i) => (
              <div key={`lead-${i}`} />
            ))}
            {isPending || !data
              ? Array.from({ length: 30 }, (_, i) => <Skeleton key={i} className="h-20 sm:h-24" />)
              : data.days.map((day) => (
                  <DayCell key={day.date} day={day} status={statusOf(day)} isToday={day.date === today} onOpen={() => setOpenDay(day)} />
                ))}
          </div>
        </div>
      )}

      <DayDialog
        day={openDay}
        status={openDay ? statusOf(openDay) : null}
        canManage={canManage}
        onClose={() => setOpenDay(null)}
        onAdd={(defaults) => {
          setOpenDay(null);
          onAdd(defaults);
        }}
      />
    </div>
  );
}

function DayCell({
  day,
  status,
  isToday,
  onOpen,
}: {
  day: CalendarDay;
  status: DayStatus;
  isToday: boolean;
  onOpen: () => void;
}) {
  const format = useFormatter();
  const name = useLocalizedName();
  const date = keyToDate(day.date);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex h-20 cursor-pointer flex-col items-start gap-0.5 overflow-hidden rounded-md border p-1.5 text-left transition-shadow hover:ring-2 hover:ring-ring/40 sm:h-24",
        DAY_STYLES[status.reason].cell,
        isToday && "ring-2 ring-primary",
      )}
    >
      <span className={cn("text-sm font-semibold", isToday && "text-primary")}>
        {format.dateTime(date, { day: "numeric", timeZone: "UTC" })}
      </span>
      {day.events.slice(0, 2).map((event) => (
        <span key={`${event.source}-${event.id}`} className="line-clamp-1 w-full text-[13px] leading-tight">
          {name(event)}
        </span>
      ))}
      {day.events.length > 2 && <span className="text-[13px] text-muted-foreground">+{day.events.length - 2}</span>}
    </button>
  );
}

function DayDialog({
  day,
  status,
  canManage,
  onClose,
  onAdd,
}: {
  day: CalendarDay | null;
  status: DayStatus | null;
  canManage: boolean;
  onClose: () => void;
  onAdd: (defaults: EntryDefaults) => void;
}) {
  const t = useTranslations("school.calendar.month");
  const tReason = useTranslations("school.calendar.reasons");
  const tType = useTranslations("school.calendar.holidayTypes");
  const format = useFormatter();
  const name = useLocalizedName();
  const classes = useClasses();
  const className = (id: string) => classes.data?.items.find((c) => c.id === id)?.name ?? "";

  return (
    <Dialog open={!!day} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {day && status && (
          <>
            <DialogHeader>
              <DialogTitle>{format.dateTime(keyToDate(day.date), { dateStyle: "full", timeZone: "UTC" })}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">
                <span className={cn("inline-block size-3 rounded-sm", DAY_STYLES[status.reason].dot)} />
                {tReason(status.reason)}
                {status.source && <span>· {name(status.source)}</span>}
              </DialogDescription>
            </DialogHeader>

            {/* whole-school answer next to the class one, when a class is shown */}
            {day.students && (
              <p className="text-sm text-muted-foreground">
                {day.teachers.isSchoolDay ? t("teachersWork") : t("teachersOff")}
              </p>
            )}

            {day.events.length > 0 ? (
              <ul className="space-y-2">
                {day.events.map((event) => (
                  <li key={`${event.source}-${event.id}`} className="rounded-md border p-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{name(event)}</span>
                      <Badge variant="outline">
                        {event.kind === "WORKING_DAY" ? t("workingDay") : event.type ? tType(event.type) : ""}
                      </Badge>
                      {event.source === "NATIONAL" && <Badge variant="secondary">{t("national")}</Badge>}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {event.allClasses ? t("allClasses") : event.classIds.map(className).filter(Boolean).join(", ")}
                      {event.kind === "HOLIDAY" && !event.teachersOff && ` · ${t("teachersStillWork")}`}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t("nothingOn")}</p>
            )}

            {canManage && (
              <DialogFooter className="gap-2 sm:justify-start">
                <Button variant="outline" size="sm" onClick={() => onAdd({ date: day.date, kind: "HOLIDAY" })}>
                  <CalendarPlus /> {t("addHoliday")}
                </Button>
                <Button variant="outline" size="sm" onClick={() => onAdd({ date: day.date, kind: "WORKING_DAY" })}>
                  <CalendarCheck /> {t("addWorkingDay")}
                </Button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
