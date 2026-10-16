"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useWorkingTeachers } from "@/lib/school/pickers";
import { useTeacherWeek, useTimeLabel } from "@/lib/school/routine";
import { cn } from "@/lib/utils";
import { useWeekdayName, WEEK_ORDER } from "../calendar/shared";

/** One teacher's week: every class they teach, day by day, in time order. */
export function TeacherRoutine({
  teacherId,
  onTeacher,
}: {
  teacherId: string | undefined;
  onTeacher: (id: string) => void;
}) {
  const t = useTranslations("school.routine.teacherRoutine");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const time = useTimeLabel();
  const weekday = useWeekdayName();
  const teachers = useWorkingTeachers();
  const chosen = teacherId ?? teachers.data?.[0]?.id;
  const week = useTeacherWeek(chosen);

  if (teachers.isSuccess && teachers.data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("noTeachers")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={chosen ?? ""} onValueChange={onTeacher}>
          <SelectTrigger className="w-64" aria-label={t("teacher")}>
            <SelectValue placeholder={t("teacher")} />
          </SelectTrigger>
          <SelectContent>
            {teachers.data?.map((teacher) => (
              <SelectItem key={teacher.id} value={teacher.id}>
                {name(teacher)}
                {teacher.designation ? ` · ${teacher.designation}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {week.data && (
          <span className="text-sm text-muted-foreground">{t("perWeek", { count: week.data.periodsPerWeek })}</span>
        )}
      </div>

      {week.isPending ? (
        <Skeleton className="h-64" />
      ) : week.isError ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
          <p>{t("loadFailed")}</p>
          <p className="text-xs">{describeError(week.error)}</p>
          <Button variant="outline" size="sm" onClick={() => week.refetch()}>
            {tCommon("tryAgain")}
          </Button>
        </div>
      ) : week.data.periodsPerWeek === 0 ? (
        <p className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", week.isFetching && "opacity-60")}>
          {WEEK_ORDER.map((d) => {
            const classes = week.data.entries.filter((e) => e.weekday === d);
            if (classes.length === 0) return null;
            return (
              <div key={d} className="rounded-md border">
                <div className="flex items-center justify-between border-b bg-muted/50 px-3 py-2 text-sm font-medium">
                  {weekday(d)}
                  <Badge variant="secondary">{t("periods", { count: classes.length })}</Badge>
                </div>
                <ul className="divide-y text-sm">
                  {classes.map((e) => (
                    <li key={e.id} className="px-3 py-2">
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {e.startTime ? `${time(e.startTime)} – ${time(e.endTime)}` : t("noTime")}
                      </div>
                      <div className="font-medium">{name(e.subject)}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.class.name}
                        {e.sections.filter((s) => !s.isDefault).length > 0 &&
                          ` ${e.sections.filter((s) => !s.isDefault).map((s) => s.name).join(" + ")}`}
                        {e.group && ` · ${name(e.group)}`}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
