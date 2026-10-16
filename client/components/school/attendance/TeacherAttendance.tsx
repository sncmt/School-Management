"use client";

import { CheckCheck, Info, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  useSaveTeacherSheet,
  useTeacherSheet,
  type AttendanceStatus,
  type TeacherSheet,
} from "@/lib/school/attendance";
import { todayKey } from "@/lib/school/calendar";
import { StudentAvatar } from "../students/StudentAvatar";
import { StatusToggle, TallyLine } from "./shared";

/** The teachers' attendance for a date: everyone starts present (or on leave), mark the rest. */
export function TeacherAttendance({ date, onDate }: { date: string; onDate: (date: string) => void }) {
  const t = useTranslations("school.attendance.teachers");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const sheet = useTeacherSheet(date);

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
      {sheet.isPending ? (
        <Skeleton className="h-64" />
      ) : sheet.isError ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
          <p>{t("loadFailed")}</p>
          <p className="text-xs">{describeError(sheet.error)}</p>
          <Button variant="outline" size="sm" onClick={() => sheet.refetch()}>
            {tCommon("tryAgain")}
          </Button>
        </div>
      ) : (
        <Editor key={`${sheet.data.date}-${sheet.data.taken}-${sheet.dataUpdatedAt}`} sheet={sheet.data} />
      )}
    </div>
  );
}

type Mark = { status: AttendanceStatus; note: string };

function Editor({ sheet }: { sheet: TeacherSheet }) {
  const t = useTranslations("school.attendance.teachers");
  const tRoll = useTranslations("school.attendance.rollCall");
  const tReason = useTranslations("school.calendar.reasons");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const save = useSaveTeacherSheet();

  const initial = useMemo(() => new Map(sheet.items.map((i) => [i.teacher.id, { status: i.status, note: i.note ?? "" }])), [sheet]);
  const [marks, setMarks] = useState<Map<string, Mark>>(initial);
  const changed = sheet.items.some((i) => {
    const m = marks.get(i.teacher.id)!;
    return m.status !== i.status || m.note.trim() !== (i.note ?? "");
  });
  const set = (teacherId: string, patch: Partial<Mark>) =>
    setMarks((all) => new Map(all).set(teacherId, { ...all.get(teacherId)!, ...patch }));

  const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 } as Record<AttendanceStatus, number>;
  for (const m of marks.values()) counts[m.status]++;
  const percentage = marks.size ? Math.round(((counts.PRESENT + counts.LATE) / marks.size) * 10_000) / 100 : null;

  const blocked = !sheet.canTake
    ? !sheet.day.isSchoolDay
      ? tRoll("dayOff", { reason: tReason(sheet.day.reason) })
      : sheet.date > todayKey()
        ? tRoll("future")
        : tRoll("tooOld")
    : null;

  const submit = () =>
    save.mutate(
      {
        date: sheet.date,
        records: sheet.items.map((i) => {
          const m = marks.get(i.teacher.id)!;
          return { teacherId: i.teacher.id, status: m.status, ...(m.note.trim() ? { note: m.note.trim() } : {}) };
        }),
      },
      { onSuccess: () => toast.success(t("saved")), onError: (e) => toast.error(describeError(e)) },
    );

  if (sheet.items.length === 0) {
    return <p className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">{t("noTeachers")}</p>;
  }

  return (
    <div className="space-y-3">
      {blocked && (
        <div className="flex items-start gap-2 rounded-md border bg-muted/50 p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          {blocked}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
        <div className="space-y-1">
          <TallyLine counts={counts} percentage={percentage} />
          <div className="text-xs text-muted-foreground">{sheet.taken ? t("taken") : tRoll("notTaken")}</div>
        </div>
        {sheet.canTake && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMarks(new Map([...marks].map(([id, m]) => [id, { ...m, status: "PRESENT" as const }])))}
            >
              <CheckCheck /> {tRoll("allPresent")}
            </Button>
            <Button size="sm" onClick={submit} disabled={save.isPending || (sheet.taken && !changed)}>
              <Save /> {save.isPending ? tRoll("saving") : sheet.taken ? tRoll("saveChanges") : tRoll("save")}
            </Button>
          </div>
        )}
      </div>
      <ul className="divide-y rounded-md border">
        {sheet.items.map((item) => {
          const mark = marks.get(item.teacher.id)!;
          return (
            <li key={item.teacher.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
              <StudentAvatar photo={item.teacher.photo} />
              <div className="min-w-40 flex-1">
                <div className="font-medium leading-tight">{name(item.teacher)}</div>
                <div className="text-xs text-muted-foreground">
                  {item.teacher.designation}
                  {item.teacher.status === "ON_LEAVE" && ` · ${t("onLeave")}`}
                </div>
              </div>
              {(mark.status !== "PRESENT" || mark.note) && (
                <Input
                  value={mark.note}
                  onChange={(e) => set(item.teacher.id, { note: e.target.value })}
                  placeholder={tRoll("notePlaceholder")}
                  maxLength={200}
                  disabled={!sheet.canTake}
                  className="h-8 w-48"
                  aria-label={tRoll("note")}
                />
              )}
              <StatusToggle value={mark.status} onChange={(status) => set(item.teacher.id, { status })} disabled={!sheet.canTake} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
