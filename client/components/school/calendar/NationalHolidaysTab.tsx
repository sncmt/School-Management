"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  daysInRange,
  todayKey,
  useSchoolNationalHolidays,
  useSetNationalHolidayOff,
  type SchoolNationalHoliday,
} from "@/lib/school/calendar";
import { cn } from "@/lib/utils";
import { useDateRange } from "./shared";

/** The platform's national holidays for a year; the school can stay open on any of them. */
export function NationalHolidaysTab({ canManage }: { canManage: boolean }) {
  const t = useTranslations("school.calendar.national");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const describeError = useErrorMessage();
  const [year, setYear] = useState(() => Number(todayKey().slice(0, 4)));
  const { data, isPending, isError, error, isFetching, refetch } = useSchoolNationalHolidays(year);

  const holidays = data ?? [];
  const openOn = holidays.filter((h) => !h.isOff).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("description")}</p>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" className="size-8" onClick={() => setYear((y) => y - 1)} aria-label={t("previousYear")}>
          <ChevronLeft />
        </Button>
        <span className="min-w-16 text-center text-lg font-semibold">{format.number(year, { useGrouping: false })}</span>
        <Button variant="outline" size="icon" className="size-8" onClick={() => setYear((y) => y + 1)} aria-label={t("nextYear")}>
          <ChevronRight />
        </Button>
        {data && (
          <span className="ml-2 text-sm text-muted-foreground">
            {t("count", { count: holidays.length })}
            {openOn > 0 && ` · ${t("openOn", { count: openOn })}`}
          </span>
        )}
      </div>

      <div className={cn("rounded-md border transition-opacity", isFetching && !isPending && "opacity-60")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.dates")}</TableHead>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead className="w-48">{t("columns.dayOff")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 4 }, (_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 3 }, (_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3} className="h-28 text-center text-muted-foreground">
                  <p>{t("loadFailed")}</p>
                  <p className="text-xs">{describeError(error)}</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
                    {tCommon("tryAgain")}
                  </Button>
                </TableCell>
              </TableRow>
            ) : holidays.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={3} className="h-28 text-center text-muted-foreground">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              holidays.map((holiday) => <HolidayRow key={holiday.id} holiday={holiday} canManage={canManage} />)
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function HolidayRow({ holiday, canManage }: { holiday: SchoolNationalHoliday; canManage: boolean }) {
  const t = useTranslations("school.calendar.national");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const dateRange = useDateRange();
  const setOff = useSetNationalHolidayOff();
  const days = daysInRange(holiday.fromDate, holiday.toDate);

  const toggle = (off: boolean) =>
    setOff.mutate(
      { holidayId: holiday.id, off },
      {
        onSuccess: () => toast.success(t(off ? "nowOff" : "nowOpen", { name: name(holiday) })),
        onError: (e) => toast.error(describeError(e)),
      },
    );

  return (
    <TableRow className={cn(!holiday.isOff && "text-muted-foreground")}>
      <TableCell className="whitespace-nowrap">
        <div>{dateRange(holiday.fromDate, holiday.toDate)}</div>
        {days > 1 && <div className="text-xs text-muted-foreground">{t("days", { count: days })}</div>}
      </TableCell>
      <TableCell>
        <div className={cn("font-medium", !holiday.isOff && "line-through")}>{name(holiday)}</div>
        {holiday.description && <div className="text-xs text-muted-foreground">{holiday.description}</div>}
      </TableCell>
      <TableCell>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={holiday.isOff}
            onCheckedChange={toggle}
            disabled={!canManage || setOff.isPending}
            aria-label={t("columns.dayOff")}
          />
          {holiday.isOff ? t("off") : t("open")}
        </label>
      </TableCell>
    </TableRow>
  );
}
