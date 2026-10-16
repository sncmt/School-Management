"use client";

import { TriangleAlert } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useWorkload } from "@/lib/school/routine";
import { useWeekdayName, WEEK_ORDER } from "../calendar/shared";

/** Every working teacher's periods per day and per week; click one to see their week. */
export function Workload({ onTeacher }: { onTeacher: (id: string) => void }) {
  const t = useTranslations("school.routine.workload");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const name = useLocalizedName();
  const weekday = useWeekdayName();
  const { data, isPending, isError, error, refetch } = useWorkload();

  if (isPending) return <Skeleton className="h-64" />;
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
        <p>{t("loadFailed")}</p>
        <p className="text-xs">{describeError(error)}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {tCommon("tryAgain")}
        </Button>
      </div>
    );
  }

  // only days that have classes, to keep the table narrow
  const days = WEEK_ORDER.filter((d) => data.items.some((i) => i.perDay[d]?.periods > 0));

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("description", { year: data.academicYear.name })}</p>
      {data.unassigned > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
          <TriangleAlert className="size-4 shrink-0 text-amber-600" />
          {t("unassigned", { count: data.unassigned })}
        </div>
      )}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("teacher")}</TableHead>
              {days.map((d) => (
                <TableHead key={d} className="text-center">
                  {weekday(d, "short")}
                </TableHead>
              ))}
              <TableHead className="text-center">{t("week")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={days.length + 2} className="h-24 text-center text-muted-foreground">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((item) => (
                <TableRow key={item.teacher.id}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => onTeacher(item.teacher.id)}
                      className="cursor-pointer text-left font-medium hover:underline"
                    >
                      {name(item.teacher)}
                    </button>
                    {item.teacher.designation && (
                      <div className="text-xs text-muted-foreground">{item.teacher.designation}</div>
                    )}
                  </TableCell>
                  {days.map((d) => (
                    <TableCell key={d} className="text-center tabular-nums">
                      {item.perDay[d].periods ? format.number(item.perDay[d].periods) : "—"}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-semibold tabular-nums">{format.number(item.periodsPerWeek)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
