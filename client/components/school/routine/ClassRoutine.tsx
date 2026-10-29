"use client";

import { Coffee, Link2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useClasses, type SchoolClass } from "@/lib/school/classes";
import { useSectionWeek, useTimeLabel, type RoutineEntry } from "@/lib/school/routine";
import { cn } from "@/lib/utils";
import { useWeekdayName, WEEK_ORDER } from "../calendar/shared";
import { RoutineEntryDialog, type EntrySlot } from "./RoutineEntryDialog";

export type SectionChoice = { classId?: string; sectionId?: string };

/** The section a class shows by default: its first named section, or its automatic one. */
export const defaultSection = (c: SchoolClass | undefined) =>
  c?.sections.find((s) => !s.isDefault)?.id ?? c?.sections[0]?.id;

/** One section's weekly timetable: periods down, school days across. */
export function ClassRoutine({
  choice,
  onChoice,
  canManage,
}: {
  choice: SectionChoice;
  onChoice: (choice: SectionChoice) => void;
  canManage: boolean;
}) {
  const t = useTranslations("school.routine.classRoutine");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const time = useTimeLabel();
  const weekday = useWeekdayName();
  const classes = useClasses();
  const [slot, setSlot] = useState<EntrySlot | null>(null);

  const chosenClass = classes.data?.items.find((c) => c.id === choice.classId) ?? classes.data?.items[0];
  const sectionId = choice.sectionId ?? defaultSection(chosenClass);
  const realSections = chosenClass?.sections.filter((s) => !s.isDefault) ?? [];
  const week = useSectionWeek(sectionId);

  const days = WEEK_ORDER.filter((d) => !week.data?.days.find((x) => x.weekday === d)?.isWeeklyHoliday);
  const offDays = WEEK_ORDER.filter((d) => week.data?.days.find((x) => x.weekday === d)?.isWeeklyHoliday);
  const at = (day: number, period: number) =>
    (week.data?.entries ?? []).filter((e) => e.weekday === day && e.periodNumber === period);

  const open = (day: number, periodNumber: number, entry: RoutineEntry | null) => {
    const period = week.data?.periods.find((p) => p.number === periodNumber);
    const section = chosenClass?.sections.find((s) => s.id === sectionId);
    if (!period || !section || !chosenClass) return;
    setSlot({ classId: chosenClass.id, section, sections: chosenClass.sections, weekday: day, period, entry });
  };

  if (classes.isSuccess && classes.data.items.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("noClasses")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <Select
          value={chosenClass?.id ?? ""}
          onValueChange={(classId) => onChoice({ classId, sectionId: defaultSection(classes.data?.items.find((c) => c.id === classId)) })}
        >
          <SelectTrigger className="w-40" label={t("class")} required>
            <SelectValue placeholder={t("class")} />
          </SelectTrigger>
          <SelectContent>
            {classes.data?.items.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {realSections.length > 0 && (
          <Select value={sectionId ?? ""} onValueChange={(id) => onChoice({ classId: chosenClass?.id, sectionId: id })}>
            <SelectTrigger className="w-32" label={t("section")} required>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {realSections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {t("sectionName", { name: s.name })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {week.data?.template && (
          <span className="text-sm text-muted-foreground">
            {t("bellSchedule", { name: name(week.data.template), year: week.data.academicYear.name })}
          </span>
        )}
      </div>

      {week.isPending ? (
        <Skeleton className="h-96" />
      ) : week.isError ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
          <p>{t("loadFailed")}</p>
          <p className="text-xs">{describeError(week.error)}</p>
          <Button variant="outline" size="sm" onClick={() => week.refetch()}>
            {tCommon("tryAgain")}
          </Button>
        </div>
      ) : !week.data.template ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          <p>{t("noBellSchedule")}</p>
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <Link href="/sections">{t("openSections")}</Link>
          </Button>
        </div>
      ) : (
        <div className={cn("overflow-x-auto rounded-md border transition-opacity", week.isFetching && "opacity-60")}>
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="w-36 border-b p-2 text-left font-medium">{t("period")}</th>
                {days.map((d) => (
                  <th key={d} className="border-b border-l p-2 text-left font-medium">
                    {weekday(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {week.data.periods.map((period) =>
                period.isBreak ? (
                  <tr key={period.number} className="bg-muted/40">
                    <td className="border-b p-2 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Coffee className="size-3.5" /> {name(period)}
                      </div>
                      <div className="text-xs tabular-nums">
                        {time(period.startTime)} – {time(period.endTime)}
                      </div>
                    </td>
                    <td colSpan={days.length} className="border-b border-l p-2 text-center text-xs text-muted-foreground">
                      {name(period)}
                    </td>
                  </tr>
                ) : (
                  <tr key={period.number}>
                    <td className="border-b p-2 align-top">
                      <div className="font-medium">{name(period)}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {time(period.startTime)} – {time(period.endTime)}
                      </div>
                    </td>
                    {days.map((d) => {
                      const entries = at(d, period.number);
                      return (
                        <td key={d} className="group border-b border-l p-1 align-top">
                          <div className="flex min-h-14 flex-col gap-1">
                            {entries.map((entry) => (
                              <EntryChip
                                key={entry.id}
                                entry={entry}
                                currentSectionId={sectionId}
                                onClick={canManage ? () => open(d, period.number, entry) : undefined}
                              />
                            ))}
                            {canManage && (
                              <button
                                type="button"
                                onClick={() => open(d, period.number, null)}
                                aria-label={t("addClass")}
                                className={cn(
                                  "flex flex-1 cursor-pointer items-center justify-center rounded border border-dashed text-muted-foreground transition-opacity hover:bg-muted",
                                  // another class can share the period (other groups, religions, optional subjects)
                                  entries.length > 0 ? "min-h-6 opacity-0 group-hover:opacity-100 focus:opacity-100" : "min-h-12",
                                )}
                              >
                                <Plus className="size-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      {week.data && offDays.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("weeklyOff", { days: offDays.map((d) => weekday(d)).join(", ") })}
        </p>
      )}

      <RoutineEntryDialog slot={slot} onClose={() => setSlot(null)} />
    </div>
  );
}

function EntryChip({
  entry,
  currentSectionId,
  onClick,
}: {
  entry: RoutineEntry;
  currentSectionId: string | undefined;
  onClick?: () => void;
}) {
  const t = useTranslations("school.routine.classRoutine");
  const name = useLocalizedName();
  const others = entry.sections.filter((s) => s.id !== currentSectionId && !s.isDefault);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="w-full cursor-pointer rounded border bg-primary/5 px-2 py-1 text-left transition-colors hover:bg-primary/10 disabled:cursor-default disabled:hover:bg-primary/5"
    >
      <div className="font-medium leading-tight">{name(entry.subject)}</div>
      <div className={cn("text-xs leading-tight", entry.teacher ? "text-muted-foreground" : "text-amber-600")}>
        {entry.teacher ? name(entry.teacher) : t("noTeacher")}
      </div>
      {(entry.group || entry.isOptional || others.length > 0) && (
        <div className="mt-0.5 flex flex-wrap gap-x-2 text-[13px] text-muted-foreground">
          {entry.group && <span>{name(entry.group)}</span>}
          {entry.isOptional && <span>{t("optional")}</span>}
          {others.length > 0 && (
            <span className="flex items-center gap-0.5">
              <Link2 className="size-3" />
              {t("withSections", { names: others.map((s) => s.name).join(", ") })}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
