"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useSectionRegister } from "@/lib/school/attendance";
import { keyToDate, todayKey } from "@/lib/school/calendar";
import { cn } from "@/lib/utils";
import { SectionPicker, useSectionChoice, type SectionChoice } from "../SectionPicker";
import { StudentAvatar } from "../students/StudentAvatar";
import { formatPercent, STATUS_STYLES } from "./shared";

/** A section's month: students down, days across, as in the paper register. */
export function MonthlyRegister({ choice, onChoice }: { choice: SectionChoice; onChoice: (choice: SectionChoice) => void }) {
  const t = useTranslations("school.attendance.register");
  const tShort = useTranslations("school.attendance.short");
  const tReason = useTranslations("school.calendar.reasons");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const name = useLocalizedName();
  const [month, setMonth] = useState(() => todayKey().slice(0, 7));
  const { sectionId } = useSectionChoice(choice);
  const { data, isPending, isError, error, isFetching, refetch } = useSectionRegister({ sectionId, month });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="register-month">{t("month")}</Label>
          <Input
            type="month"
            value={month}
            max={todayKey().slice(0, 7)}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            className="w-44"
            id="register-month"
          />
        </div>
        <SectionPicker choice={choice} onChange={onChoice} />
        {data && <span className="pb-2 text-sm text-muted-foreground">{t("daysTaken", { count: data.daysTaken })}</span>}
      </div>

      {isPending && !!sectionId ? (
        <Skeleton className="h-96" />
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
          <p>{t("loadFailed")}</p>
          <p className="text-xs">{describeError(error)}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {tCommon("tryAgain")}
          </Button>
        </div>
      ) : !data || data.students.length === 0 ? (
        <p className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className={cn("overflow-x-auto rounded-md border transition-opacity", isFetching && "opacity-60")}>
          <table className="border-collapse text-xs">
            <thead>
              <tr className="bg-muted/50">
                {/* roll and student stay in view while the days scroll */}
                <th className="sticky left-0 z-10 w-12 min-w-12 border-b bg-muted p-2 text-center font-medium">{t("roll")}</th>
                <th className="sticky left-12 z-10 min-w-52 border-b border-l bg-muted p-2 text-left font-medium">{t("student")}</th>
                {data.days.map((d) => {
                  const off = !d.day.isSchoolDay;
                  return (
                    <th
                      key={d.date}
                      title={off ? tReason(d.day.reason) : undefined}
                      className={cn("w-8 min-w-8 border-b border-l p-1 text-center font-medium", off && "bg-muted text-muted-foreground")}
                    >
                      <div>{format.dateTime(keyToDate(d.date), { day: "numeric", timeZone: "UTC" })}</div>
                      <div className="font-normal text-muted-foreground">
                        {format.dateTime(keyToDate(d.date), { weekday: "narrow", timeZone: "UTC" })}
                      </div>
                    </th>
                  );
                })}
                <th className="border-b border-l p-2 text-center font-medium">{tShort("ABSENT")}</th>
                <th className="border-b border-l p-2 text-center font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((row) => (
                <tr key={row.student.id} className="hover:bg-muted/30">
                  <td className="sticky left-0 z-10 w-12 min-w-12 border-b bg-background p-2 text-center text-muted-foreground tabular-nums">
                    {row.rollNumber ?? "—"}
                  </td>
                  <td className="sticky left-12 z-10 border-b border-l bg-background px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <StudentAvatar photo={row.student.photo} name={name(row.student)} className="size-7 text-[13px]" />
                      <span className="font-medium">{name(row.student)}</span>
                    </div>
                  </td>
                  {data.days.map((d) => {
                    const status = row.statuses[d.date];
                    return (
                      <td
                        key={d.date}
                        className={cn(
                          "border-b border-l text-center",
                          !d.day.isSchoolDay ? "bg-muted/60" : status && STATUS_STYLES[status].cell,
                        )}
                      >
                        {status ? tShort(status) : ""}
                      </td>
                    );
                  })}
                  <td className="border-b border-l p-1 text-center tabular-nums">{format.number(row.summary.ABSENT)}</td>
                  <td className="border-b border-l p-1 text-center font-semibold tabular-nums">
                    {row.summary.percentage !== null ? formatPercent(format, row.summary.percentage) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.students.length > 0 && <p className="text-xs text-muted-foreground">{t("legend")}</p>}
    </div>
  );
}
