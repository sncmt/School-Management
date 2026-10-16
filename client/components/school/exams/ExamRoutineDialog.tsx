"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toAsciiDigits } from "@/lib/i18n/digits";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useExamRoutine, useSetExamRoutine, type ExamRoutine } from "@/lib/school/exams";
import { cn } from "@/lib/utils";

export type RoutineTarget = { examId: string; classId: string; className: string };

export function ExamRoutineDialog({ target, canEdit, onClose }: { target: RoutineTarget | null; canEdit: boolean; onClose: () => void }) {
  const t = useTranslations("school.exams.routine");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const routine = useExamRoutine(target ? { examId: target.examId, classId: target.classId } : null);

  return (
    <Dialog open={!!target} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{t("title", { class: target?.className ?? "" })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {routine.isPending ? (
          <Skeleton className="h-64" />
        ) : routine.isError ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <p>{describeError(routine.error)}</p>
            <Button variant="outline" size="sm" onClick={() => routine.refetch()}>
              {tCommon("tryAgain")}
            </Button>
          </div>
        ) : (
          <RoutineEditor key={routine.dataUpdatedAt} routine={routine.data} canEdit={canEdit} onDone={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

type Row = {
  classSubjectId: string;
  label: string;
  inRoutine: boolean;
  included: boolean;
  date: string;
  startTime: string;
  endTime: string;
  // the marks used unless changed: the routine's own, else the subject's setup (null = none)
  fullMarks: string | null;
  passMarks: string | null;
  hasParts: boolean;
  ownMarks: boolean;
  newFull: string;
  newPass: string;
};

const num = (v: string) => Number(toAsciiDigits(v.trim()));

function RoutineEditor({ routine, canEdit, onDone }: { routine: ExamRoutine; canEdit: boolean; onDone: () => void }) {
  const t = useTranslations("school.exams.routine");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const name = useLocalizedName();
  const save = useSetExamRoutine();
  const single = routine.exam.type === "SINGLE";
  const editable = canEdit && routine.status !== "PUBLISHED";

  const subjectLabel = (s: { subject: { nameEn: string | null; nameBn: string | null }; group: { nameEn: string | null; nameBn: string | null } | null; type: string }) =>
    [name(s.subject), s.group && name(s.group), s.type === "OPTIONAL" && t("optional")].filter(Boolean).join(" · ");

  const initial = useMemo<Row[]>(
    () => [
      ...routine.subjects.map((s) => ({
        classSubjectId: s.classSubjectId,
        label: subjectLabel({ subject: s.classSubject.subject, group: s.classSubject.group, type: s.classSubject.type }),
        inRoutine: true,
        included: true,
        date: s.date,
        startTime: s.startTime ?? "",
        endTime: s.endTime ?? "",
        fullMarks: s.fullMarks,
        passMarks: s.passMarks,
        hasParts: s.parts.length > 0,
        ownMarks: false,
        newFull: "",
        newPass: "",
      })),
      ...routine.notInRoutine.map((cs) => ({
        classSubjectId: cs.id,
        label: subjectLabel(cs),
        inRoutine: false,
        included: false,
        date: "",
        startTime: "",
        endTime: "",
        fullMarks: cs.fullMarks,
        passMarks: cs.passMarks,
        hasParts: cs.parts.length > 0,
        ownMarks: cs.fullMarks === null,
        newFull: "",
        newPass: "",
      })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- built once per loaded routine
    [routine],
  );
  const [rows, setRows] = useState(initial);
  const [examDate, setExamDate] = useState(routine.date ?? "");
  const [error, setError] = useState<string | null>(null);

  const set = (i: number, patch: Partial<Row>) => setRows((all) => all.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const marksText = (full: string | null, pass: string | null) =>
    full === null ? t("noMarks") : t("marks", { full: format.number(Number(full)), pass: format.number(Number(pass)) });

  const submit = () => {
    setError(null);
    const chosen = rows.filter((r) => r.included);
    if (chosen.length === 0) return setError(t("errors.none"));
    if (single && !examDate) return setError(t("errors.examDate"));
    for (const r of chosen) {
      if (!single && !r.date) return setError(t("errors.date", { subject: r.label }));
      if (!!r.startTime !== !!r.endTime || (r.startTime && r.endTime <= r.startTime)) return setError(t("errors.times", { subject: r.label }));
      if (r.ownMarks) {
        const full = num(r.newFull);
        const pass = num(r.newPass);
        if (!(full > 0) || !(pass > 0) || pass > full) return setError(t("errors.marks", { subject: r.label }));
      }
    }
    save.mutate(
      {
        examId: routine.exam.id,
        classId: routine.class.id,
        body: {
          ...(single ? { date: examDate } : {}),
          subjects: chosen.map((r) => ({
            classSubjectId: r.classSubjectId,
            ...(single ? {} : { date: r.date }),
            ...(r.startTime ? { startTime: r.startTime, endTime: r.endTime } : {}),
            ...(r.ownMarks ? { fullMarks: num(r.newFull), passMarks: num(r.newPass) } : {}),
          })),
        },
      },
      { onSuccess: () => { toast.success(t("saved")); onDone(); }, onError: (e) => setError(describeError(e)) },
    );
  };

  return (
    <div className="space-y-4">
      <FormError message={error} />
      {routine.status !== "ROUTINE" && (
        <p className="rounded-md border bg-muted/50 p-3 text-sm">{routine.status === "PUBLISHED" ? t("publishedNote") : t("marksEntryNote")}</p>
      )}

      {single && (
        <div className="grid gap-2">
          <Label required>{t("examDate")}</Label>
          <Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className="w-44" disabled={!editable} />
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="w-10 p-2" />
              <th className="p-2 text-left font-medium">{t("subject")}</th>
              {!single && <th className="p-2 text-left font-medium">{t("date")}</th>}
              <th className="p-2 text-left font-medium">{t("time")}</th>
              <th className="p-2 text-left font-medium">{t("marksHead")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r, i) => (
              <tr key={r.classSubjectId} className={cn(!r.included && "text-muted-foreground")}>
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={r.included}
                    disabled={!editable}
                    onChange={(e) => set(i, { included: e.target.checked })}
                    aria-label={r.label}
                  />
                </td>
                <td className="p-2 font-medium">{r.label}</td>
                {!single && (
                  <td className="p-2">
                    <Input type="date" value={r.date} onChange={(e) => set(i, { date: e.target.value })} disabled={!editable || !r.included} className="h-8 w-40" />
                  </td>
                )}
                <td className="p-2">
                  <div className="flex items-center gap-1">
                    <Input type="time" value={r.startTime} onChange={(e) => set(i, { startTime: e.target.value })} disabled={!editable || !r.included} className="h-8 w-28" aria-label={t("start")} />
                    <span>–</span>
                    <Input type="time" value={r.endTime} onChange={(e) => set(i, { endTime: e.target.value })} disabled={!editable || !r.included} className="h-8 w-28" aria-label={t("end")} />
                  </div>
                </td>
                <td className="p-2">
                  {r.ownMarks ? (
                    <div className="flex items-center gap-1">
                      <Input value={r.newFull} onChange={(e) => set(i, { newFull: e.target.value })} inputMode="decimal" placeholder={t("full")} className="h-8 w-20" disabled={!editable || !r.included} aria-label={t("full")} />
                      <Input value={r.newPass} onChange={(e) => set(i, { newPass: e.target.value })} inputMode="decimal" placeholder={t("pass")} className="h-8 w-20" disabled={!editable || !r.included} aria-label={t("pass")} />
                      {r.fullMarks !== null && editable && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => set(i, { ownMarks: false })}>
                          {t("useSetup")}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tabular-nums">{marksText(r.fullMarks, r.passMarks)}</span>
                      {r.hasParts && <Badge variant="outline">{t("withParts")}</Badge>}
                      {editable && r.included && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => set(i, { ownMarks: true, newFull: r.fullMarks ? String(Number(r.fullMarks)) : "", newPass: r.passMarks ? String(Number(r.passMarks)) : "" })}>
                          {t("change")}
                        </Button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">{t("hint")}</p>

      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={save.isPending}>
          {editable ? t("cancel") : t("close")}
        </Button>
        {editable && (
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending ? t("saving") : t("save")}
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}
