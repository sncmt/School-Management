"use client";

import { ArrowRight, UserRoundPlus, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { keyToDate, todayKey } from "@/lib/school/calendar";
import { useClasses } from "@/lib/school/classes";
import {
  useCreateSubstitution,
  useDeleteSubstitution,
  useFreeTeachers,
  useSectionDay,
  useSubstitutions,
  useTimeLabel,
  type DayEntry,
} from "@/lib/school/routine";
import { cn } from "@/lib/utils";
import { defaultSection, type SectionChoice } from "./ClassRoutine";

/** A date's classes for one section, with a substitute for any of them; and every substitute that day. */
export function Substitutes({
  choice,
  onChoice,
  canManage,
}: {
  choice: SectionChoice;
  onChoice: (choice: SectionChoice) => void;
  canManage: boolean;
}) {
  const t = useTranslations("school.routine.substitutes");
  const tReason = useTranslations("school.calendar.reasons");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const name = useLocalizedName();
  const time = useTimeLabel();
  const classes = useClasses();

  const [date, setDate] = useState(todayKey);
  const [covering, setCovering] = useState<DayEntry | null>(null);

  const chosenClass = classes.data?.items.find((c) => c.id === choice.classId) ?? classes.data?.items[0];
  const sectionId = choice.sectionId ?? defaultSection(chosenClass);
  const realSections = chosenClass?.sections.filter((s) => !s.isDefault) ?? [];
  const day = useSectionDay({ sectionId, date });
  const all = useSubstitutions(date);
  const remove = useDeleteSubstitution();

  const removeSubstitute = (entry: DayEntry) =>
    entry.substitution &&
    remove.mutate(entry.substitution.id, {
      onSuccess: () => toast.success(t("removed")),
      onError: (e) => toast.error(describeError(e)),
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="substitutes-date">{t("date")}</Label>
          <Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-44" id="substitutes-date" />
        </div>
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
      </div>

      {/* the section's day */}
      {day.isPending ? (
        <Skeleton className="h-48" />
      ) : day.isError ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
          <p>{t("loadFailed")}</p>
          <p className="text-xs">{describeError(day.error)}</p>
          <Button variant="outline" size="sm" onClick={() => day.refetch()}>
            {tCommon("tryAgain")}
          </Button>
        </div>
      ) : !day.data.day.isSchoolDay ? (
        <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
          {t("noSchool", { reason: tReason(day.data.day.reason) })}
          {day.data.day.source && ` · ${name(day.data.day.source)}`}
        </p>
      ) : day.data.entries.length === 0 ? (
        <p className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">{t("noClasses")}</p>
      ) : (
        <div className={cn("divide-y rounded-md border transition-opacity", day.isFetching && "opacity-60")}>
          {day.data.entries.map((entry) => {
            const period = day.data.periods.find((p) => p.number === entry.periodNumber);
            return (
              <div key={entry.id} className={cn("flex flex-wrap items-center gap-3 p-3", !entry.held && "opacity-60")}>
                <div className="w-32 shrink-0 text-sm">
                  <div className="font-medium">{period ? name(period) : t("periodN", { n: entry.periodNumber })}</div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {entry.startTime && `${time(entry.startTime)} – ${time(entry.endTime)}`}
                  </div>
                </div>
                <div className="min-w-40 flex-1 text-sm">
                  <div className="font-medium">{name(entry.subject)}</div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={cn(entry.substitution && "line-through")}>
                      {entry.teacher ? name(entry.teacher) : t("noTeacher")}
                    </span>
                    {entry.substitution && (
                      <>
                        <ArrowRight className="size-3" />
                        <span className="font-medium text-foreground">{name(entry.substitution.teacher)}</span>
                        {entry.substitution.note && <span>· {entry.substitution.note}</span>}
                      </>
                    )}
                  </div>
                </div>
                {!entry.held ? (
                  <Badge variant="outline">{t("notHeld")}</Badge>
                ) : canManage ? (
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => setCovering(entry)}>
                      <UserRoundPlus /> {entry.substitution ? t("change") : t("assign")}
                    </Button>
                    {entry.substitution && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={t("remove")}
                        onClick={() => removeSubstitute(entry)}
                        disabled={remove.isPending}
                      >
                        <X />
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* everything covered that day, every section */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">
          {t("allOn", { date: format.dateTime(keyToDate(date), { dateStyle: "medium", timeZone: "UTC" }) })}
        </h3>
        {all.isPending ? (
          <Skeleton className="h-16" />
        ) : !all.data || all.data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noneOn")}</p>
        ) : (
          <ul className="divide-y rounded-md border text-sm">
            {all.data.items.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                <span className="w-28 text-xs text-muted-foreground tabular-nums">
                  {e.startTime && `${time(e.startTime)} – ${time(e.endTime)}`}
                </span>
                <span className="font-medium">
                  {e.class.name}
                  {e.sections.filter((s) => !s.isDefault).length > 0 && ` ${e.sections.filter((s) => !s.isDefault).map((s) => s.name).join(" + ")}`}
                </span>
                <span>{name(e.subject)}</span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  {e.teacher ? name(e.teacher) : t("noTeacher")} <ArrowRight className="size-3" />
                  <span className="text-foreground">{e.substitution && name(e.substitution.teacher)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SubstituteDialog entry={covering} date={date} sectionId={sectionId} onClose={() => setCovering(null)} />
    </div>
  );
}

function SubstituteDialog({
  entry,
  date,
  sectionId,
  onClose,
}: {
  entry: DayEntry | null;
  date: string;
  sectionId: string | undefined;
  onClose: () => void;
}) {
  const t = useTranslations("school.routine.substitutes.dialog");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const name = useLocalizedName();
  const time = useTimeLabel();
  const free = useFreeTeachers(entry && sectionId ? { date, sectionId, periodNumber: entry.periodNumber } : null);
  const save = useCreateSubstitution();
  const [teacherId, setTeacherId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setTeacherId("");
    setNote("");
    setError(null);
    onClose();
  };

  const submit = () => {
    if (!entry) return;
    if (!teacherId) return setError(t("chooseTeacher"));
    save.mutate(
      { entryId: entry.id, date, teacherId, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(t("saved"));
          close();
        },
        onError: (e) => setError(describeError(e)),
      },
    );
  };

  return (
    <Dialog open={!!entry} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-md">
        {entry && (
          <>
            <DialogHeader>
              <DialogTitle>{t("title")}</DialogTitle>
              <DialogDescription>
                {name(entry.subject)} · {time(entry.startTime)} – {time(entry.endTime)}
                {entry.teacher && ` · ${t("instead", { name: name(entry.teacher) })}`}
              </DialogDescription>
            </DialogHeader>
            <FormError message={error ?? (free.isError ? describeError(free.error) : null)} />
            <div className="space-y-2">
              <Label required>{t("freeTeachers")}</Label>
              {free.isPending ? (
                <Skeleton className="h-24" />
              ) : free.data && free.data.free.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noneFree")}</p>
              ) : (
                <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-1">
                  {free.data?.free.map(({ teacher, periodsToday }) => (
                    <label
                      key={teacher.id}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted",
                        teacherId === teacher.id && "bg-primary/10",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="substitute"
                          className="size-4 accent-primary"
                          checked={teacherId === teacher.id}
                          onChange={() => setTeacherId(teacher.id)}
                        />
                        {name(teacher)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t("periodsToday", { count: periodsToday, n: format.number(periodsToday) })}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">{t("freeHint")}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-note">{t("note")}</Label>
              <Input id="sub-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={t("notePlaceholder")} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={close} disabled={save.isPending}>
                {t("cancel")}
              </Button>
              <Button onClick={submit} disabled={save.isPending}>
                {save.isPending ? t("saving") : t("save")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
