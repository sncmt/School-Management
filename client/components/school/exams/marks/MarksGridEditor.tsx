"use client";

import { Info, Save } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useSaveMarksGrid, type MarkInput, type MarksGrid } from "@/lib/school/marks";
import { cn } from "@/lib/utils";
import { checkDraft, isBlank, sameDraft, toDraft, type CellDraft } from "./markCell";
import { MarkCellInput } from "./MarkCellInput";

const key = (enrollmentId: string, examSubjectId: string) => `${enrollmentId}:${examSubjectId}`;

/** A section's whole marks sheet: students down, subjects across (exam:enter_marks). */
export function MarksGridEditor({ examId, grid }: { examId: string; grid: MarksGrid }) {
  const t = useTranslations("school.exams.marks");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const name = useLocalizedName();
  const save = useSaveMarksGrid();
  const subjectOf = useMemo(() => new Map(grid.subjects.map((s) => [s.examSubjectId, s])), [grid]);

  const initial = useMemo(() => {
    const m = new Map<string, CellDraft>();
    for (const st of grid.students) {
      for (const s of grid.subjects) {
        const cell = st.marks[s.examSubjectId];
        if (cell?.sits) m.set(key(st.enrollmentId, s.examSubjectId), toDraft(s, cell));
      }
    }
    return m;
  }, [grid]);
  const [drafts, setDrafts] = useState(initial);

  const changed = [...drafts.entries()].filter(([k, d]) => !sameDraft(d, initial.get(k)!));
  const checked = changed.map(([k, d]) => {
    const [enrollmentId, examSubjectId] = k.split(":");
    return { k, enrollmentId, examSubjectId, d, check: checkDraft(subjectOf.get(examSubjectId)!, d) };
  });
  const invalid = new Set(checked.filter((c) => !c.check.ok).map((c) => c.k));
  const toSend = checked.filter((c) => c.check.ok && !isBlank(c.d));

  const submit = () =>
    save.mutate(
      {
        examId,
        classId: grid.class.id,
        sectionId: grid.section.id,
        marks: toSend.flatMap((c) =>
          c.check.ok && c.check.input ? [{ enrollmentId: c.enrollmentId, examSubjectId: c.examSubjectId, ...(c.check.input as MarkInput) }] : [],
        ),
      },
      { onSuccess: () => toast.success(t("saved", { count: toSend.length })), onError: (e) => toast.error(describeError(e)) },
    );

  return (
    <div className="space-y-3">
      {!grid.canEdit && grid.cannotEditReason && (
        <div className="flex items-start gap-2 rounded-md border bg-muted/50 p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          {grid.cannotEditReason}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
        <span className="text-sm text-muted-foreground">
          {t("gridProgress", { entered: format.number(grid.progress.entered), total: format.number(grid.progress.cells) })}
          {invalid.size > 0 && <span className="ml-2 text-destructive">{t("fixRed", { count: invalid.size })}</span>}
        </span>
        {grid.canEdit && (
          <Button size="sm" onClick={submit} disabled={save.isPending || toSend.length === 0 || invalid.size > 0}>
            <Save /> {save.isPending ? t("saving") : toSend.length ? t("saveCount", { count: toSend.length }) : t("save")}
          </Button>
        )}
      </div>

      {grid.students.length === 0 ? (
        <p className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">{t("noStudents")}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50 text-xs">
                <th className="sticky left-0 z-10 min-w-44 border-b bg-muted p-2 text-left font-medium">{t("student")}</th>
                {grid.subjects.map((s) => (
                  <th key={s.examSubjectId} className={cn("border-b border-l p-2 text-left font-medium", !s.open && "text-muted-foreground")}>
                    <div>{name(s.subject)}</div>
                    <div className="font-normal text-muted-foreground">
                      {s.parts.length ? s.parts.map((p) => `${p.name} ${Number(p.fullMarks)}`).join(" + ") : t("outOf", { full: Number(s.fullMarks) })}
                    </div>
                    {!s.open && <div className="font-normal">{t("opensOn", { date: format.dateTime(new Date(`${s.date}T00:00:00Z`), { dateStyle: "medium", timeZone: "UTC" }) })}</div>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid.students.map((st) => (
                <tr key={st.enrollmentId} className="hover:bg-muted/20">
                  <td className="sticky left-0 z-10 border-b bg-background p-2">
                    <span className="mr-2 text-muted-foreground tabular-nums">{st.rollNumber ?? "—"}</span>
                    <span className="font-medium">{name(st.student)}</span>
                  </td>
                  {grid.subjects.map((s) => {
                    const k = key(st.enrollmentId, s.examSubjectId);
                    const d = drafts.get(k);
                    return (
                      <td key={s.examSubjectId} className="border-b border-l p-1.5 align-top">
                        {!d ? (
                          <span className="block px-2 text-xs text-muted-foreground" title={t("doesNotSit")}>
                            —
                          </span>
                        ) : (
                          <MarkCellInput
                            subject={s}
                            draft={d}
                            onChange={(next) => setDrafts((all) => new Map(all).set(k, next))}
                            disabled={!grid.canEdit || !s.open}
                            invalid={invalid.has(k)}
                            compact
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t("gridHint")}</p>
    </div>
  );
}
