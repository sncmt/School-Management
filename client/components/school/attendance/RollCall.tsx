"use client";

import { CheckCheck, Info, Save } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  useSaveStudentSheet,
  useStudentSheet,
  type AttendanceStatus,
  type StudentSheet,
} from "@/lib/school/attendance";
import { todayKey } from "@/lib/school/calendar";
import { useTimeLabel } from "@/lib/school/routine";
import { StudentAvatar } from "../students/StudentAvatar";
import { SectionPicker, useSectionChoice, type SectionChoice } from "../SectionPicker";
import { StatusToggle, TallyLine } from "./shared";

/** A section's roll call for a date: everyone starts present, mark the rest, save. */
export function RollCall({
  date,
  onDate,
  choice,
  onChoice,
}: {
  date: string;
  onDate: (date: string) => void;
  choice: SectionChoice;
  onChoice: (choice: SectionChoice) => void;
}) {
  const t = useTranslations("school.attendance.rollCall");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const { sectionId } = useSectionChoice(choice);
  const sheet = useStudentSheet({ sectionId, date });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={date}
          max={todayKey()}
          onChange={(e) => e.target.value && onDate(e.target.value)}
          className="w-44"
          aria-label={t("date")}
        />
        <SectionPicker choice={choice} onChange={onChoice} />
      </div>

      {sheet.isPending ? (
        <Skeleton className="h-96" />
      ) : sheet.isError ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
          <p>{t("loadFailed")}</p>
          <p className="text-xs">{describeError(sheet.error)}</p>
          <Button variant="outline" size="sm" onClick={() => sheet.refetch()}>
            {tCommon("tryAgain")}
          </Button>
        </div>
      ) : (
        // a fresh editor for each section, date and save
        <SheetEditor key={`${sheet.data.section.id}-${sheet.data.date}-${sheet.data.session?.updatedAt ?? "new"}`} sheet={sheet.data} />
      )}
    </div>
  );
}

type Mark = { status: AttendanceStatus; note: string };

function SheetEditor({ sheet }: { sheet: StudentSheet }) {
  const t = useTranslations("school.attendance.rollCall");
  const tReason = useTranslations("school.calendar.reasons");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const name = useLocalizedName();
  const time = useTimeLabel();
  const save = useSaveStudentSheet();

  const initial = useMemo(
    () => new Map(sheet.items.map((i) => [i.student.id, { status: i.status, note: i.note ?? "" }])),
    [sheet],
  );
  const [marks, setMarks] = useState<Map<string, Mark>>(initial);
  const changed = sheet.items.some((i) => {
    const m = marks.get(i.student.id)!;
    return m.status !== i.status || m.note.trim() !== (i.note ?? "");
  });

  const set = (studentId: string, patch: Partial<Mark>) =>
    setMarks((all) => new Map(all).set(studentId, { ...all.get(studentId)!, ...patch }));

  const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0 } as Record<AttendanceStatus, number>;
  for (const m of marks.values()) counts[m.status]++;
  const total = marks.size;
  const percentage = total ? Math.round(((counts.PRESENT + counts.LATE) / total) * 10_000) / 100 : null;

  // why the roll call can't be taken: a day off, a future date, or too long ago
  const blocked = !sheet.canTake
    ? !sheet.day.isSchoolDay
      ? `${t("dayOff", { reason: tReason(sheet.day.reason) })}${sheet.day.source ? ` · ${name(sheet.day.source)}` : ""}`
      : sheet.date > todayKey()
        ? t("future")
        : t("tooOld")
    : null;

  const submit = () =>
    save.mutate(
      {
        sectionId: sheet.section.id,
        date: sheet.date,
        records: sheet.items.map((i) => {
          const m = marks.get(i.student.id)!;
          return { studentId: i.student.id, status: m.status, ...(m.note.trim() ? { note: m.note.trim() } : {}) };
        }),
      },
      {
        onSuccess: () => toast.success(t("saved", { absent: counts.ABSENT })),
        onError: (e) => toast.error(describeError(e)),
      },
    );

  if (sheet.items.length === 0) {
    return <p className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">{t("noStudents")}</p>;
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
          <div className="text-xs text-muted-foreground">
            {sheet.taken ? (
              <>
                {t("takenAt", { time: format.dateTime(new Date(sheet.session!.updatedAt), { timeStyle: "short" }) })}
                {sheet.session?.startTime &&
                  ` · ${t("hours", { from: time(sheet.session.startTime), to: time(sheet.session.endTime) })}`}
                {sheet.session?.scheduleNote && ` · ${sheet.session.scheduleNote}`}
              </>
            ) : (
              t("notTaken")
            )}
          </div>
        </div>
        {sheet.canTake && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMarks(new Map([...marks].map(([id, m]) => [id, { ...m, status: "PRESENT" as const }])))}
            >
              <CheckCheck /> {t("allPresent")}
            </Button>
            <Button size="sm" onClick={submit} disabled={save.isPending || (sheet.taken && !changed)}>
              <Save /> {save.isPending ? t("saving") : sheet.taken ? t("saveChanges") : t("save")}
            </Button>
          </div>
        )}
      </div>

      <ul className="divide-y rounded-md border">
        {sheet.items.map((item) => {
          const mark = marks.get(item.student.id)!;
          return (
            <li key={item.student.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
              <span className="w-8 text-sm text-muted-foreground tabular-nums">{item.rollNumber ?? "—"}</span>
              <StudentAvatar photo={item.student.photo} />
              <div className="min-w-40 flex-1">
                <div className="font-medium leading-tight">{name(item.student)}</div>
                <div className="text-xs text-muted-foreground">
                  {t("admission", { no: item.student.admissionNo })}
                  {item.source === "DEVICE" && (
                    <Badge variant="outline" className="ml-2">
                      {t("fromDevice")}
                      {item.checkInAt && ` · ${format.dateTime(new Date(item.checkInAt), { hour: "numeric", minute: "2-digit", timeZone: "Asia/Dhaka" })}`}
                    </Badge>
                  )}
                </div>
              </div>
              {(mark.status !== "PRESENT" || mark.note) && (
                <Input
                  value={mark.note}
                  onChange={(e) => set(item.student.id, { note: e.target.value })}
                  placeholder={t("notePlaceholder")}
                  maxLength={200}
                  disabled={!sheet.canTake}
                  className="h-8 w-48"
                  aria-label={t("note")}
                />
              )}
              <StatusToggle value={mark.status} onChange={(status) => set(item.student.id, { status })} disabled={!sheet.canTake} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
