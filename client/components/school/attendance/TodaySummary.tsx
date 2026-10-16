"use client";

import { ClipboardCheck, Eye } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCan } from "@/lib/auth/hooks";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useDaySummary } from "@/lib/school/attendance";
import { todayKey } from "@/lib/school/calendar";
import { cn } from "@/lib/utils";
import { formatPercent, TallyLine } from "./shared";

/** A day at a glance: every section's roll call and the teachers. */
export function TodaySummary({
  date,
  onDate,
  onOpen,
}: {
  date: string;
  onDate: (date: string) => void;
  // open a section's roll call
  onOpen: (classId: string, sectionId: string) => void;
}) {
  const t = useTranslations("school.attendance.today");
  const tReason = useTranslations("school.calendar.reasons");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const name = useLocalizedName();
  const can = useCan();
  const { data, isPending, isError, error, isFetching, refetch } = useDaySummary(date);

  return (
    <div className="space-y-4">
      <Input
        type="date"
        value={date}
        max={todayKey()}
        onChange={(e) => e.target.value && onDate(e.target.value)}
        className="w-44"
        aria-label={t("date")}
      />

      {isPending ? (
        <Skeleton className="h-64" />
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
          <p>{t("loadFailed")}</p>
          <p className="text-xs">{describeError(error)}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {tCommon("tryAgain")}
          </Button>
        </div>
      ) : (
        <div className={cn("space-y-4 transition-opacity", isFetching && "opacity-60")}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat
              title={t("present")}
              value={data.students.percentage !== null ? formatPercent(format, data.students.percentage) : "—"}
              hint={t("presentOf", {
                present: format.number(data.students.PRESENT + data.students.LATE),
                total: format.number(data.students.onRoll),
              })}
            />
            <Stat
              title={t("absent")}
              value={format.number(data.students.ABSENT)}
              hint={t("lateLeave", { late: format.number(data.students.LATE), leave: format.number(data.students.LEAVE) })}
              alert={data.students.ABSENT > 0}
            />
            <Stat
              title={t("rollCalls")}
              value={`${format.number(data.students.sectionsTaken)} / ${format.number(data.students.sectionsTaken + data.students.sectionsPending)}`}
              hint={
                data.students.sectionsPending > 0 ? t("pending", { count: data.students.sectionsPending }) : t("allTaken")
              }
              alert={data.students.sectionsPending > 0}
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.section")}</TableHead>
                  <TableHead className="text-center">{t("columns.onRoll")}</TableHead>
                  <TableHead>{t("columns.attendance")}</TableHead>
                  <TableHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.students.sections.map((s) => (
                  <TableRow key={s.section.id}>
                    <TableCell className="font-medium">
                      {s.class.name}
                      {!s.section.isDefault && ` ${s.section.name}`}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{format.number(s.onRoll)}</TableCell>
                    <TableCell>
                      {!s.day.isSchoolDay ? (
                        <span className="text-sm text-muted-foreground">
                          {tReason(s.day.reason)}
                          {s.day.source && ` · ${name(s.day.source)}`}
                        </span>
                      ) : s.onRoll === 0 ? (
                        <span className="text-sm text-muted-foreground">{t("noStudents")}</span>
                      ) : s.counts ? (
                        <TallyLine counts={s.counts} percentage={s.percentage} />
                      ) : (
                        <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400">
                          {t("notTaken")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.day.isSchoolDay && s.onRoll > 0 && can("attendance:mark") && (
                        <Button variant={s.taken ? "ghost" : "outline"} size="sm" onClick={() => onOpen(s.class.id, s.section.id)}>
                          {s.taken ? <Eye /> : <ClipboardCheck />}
                          {s.taken ? t("open") : t("take")}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("teachers")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {!data.teachers.day.isSchoolDay ? (
                <span className="text-muted-foreground">{tReason(data.teachers.day.reason)}</span>
              ) : data.teachers.taken ? (
                <TallyLine
                  counts={data.teachers}
                  percentage={
                    data.teachers.onRoll
                      ? Math.round(((data.teachers.PRESENT + data.teachers.LATE) / data.teachers.onRoll) * 10_000) / 100
                      : null
                  }
                />
              ) : (
                <span className="text-muted-foreground">{t("teachersNotTaken", { count: data.teachers.onRoll })}</span>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Stat({ title, value, hint, alert }: { title: string; value: string; hint: string; alert?: boolean }) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-6">
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className={cn("text-3xl font-semibold tabular-nums", alert && "text-amber-600")}>{value}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}
