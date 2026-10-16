"use client";

import { Info, Save } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useSaveMarksSheet, type MarkInput, type MarksSheet } from "@/lib/school/marks";
import { checkDraft, isBlank, sameDraft, toDraft, type CellCheck, type CellDraft } from "./markCell";
import { MarkCellInput } from "./MarkCellInput";

/** Marks of one subject for one section: a row per student. */
export function MarksSheetEditor({ examSubjectId, sheet }: { examSubjectId: string; sheet: MarksSheet }) {
  const t = useTranslations("school.exams.marks");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const name = useLocalizedName();
  const save = useSaveMarksSheet();
  const subject = { fullMarks: sheet.fullMarks, parts: sheet.parts };

  const initial = useMemo(() => new Map(sheet.items.map((i) => [i.enrollmentId, toDraft(subject, i)])), [sheet]); // eslint-disable-line react-hooks/exhaustive-deps
  const [drafts, setDrafts] = useState<Map<string, CellDraft>>(initial);

  const checks = new Map<string, CellCheck>(sheet.items.map((i) => [i.enrollmentId, checkDraft(subject, drafts.get(i.enrollmentId)!)]));
  const changed = sheet.items.filter((i) => !sameDraft(drafts.get(i.enrollmentId)!, initial.get(i.enrollmentId)!));
  const invalid = changed.filter((i) => !checks.get(i.enrollmentId)!.ok);
  // a cleared mark can't be "unsaved": the server keeps it, so only filled-in marks are sent
  const toSend = changed.filter((i) => checks.get(i.enrollmentId)!.ok && !isBlank(drafts.get(i.enrollmentId)!));
  const done = sheet.items.filter((i) => !isBlank(drafts.get(i.enrollmentId)!)).length;

  const errorText = (c: CellCheck) =>
    c.ok ? null : c.error === "tooHigh" ? t("errors.tooHigh", { max: c.max ?? 0 }) : c.error === "partMissing" ? t("errors.partMissing", { part: c.part ?? "" }) : t("errors.number");

  const submit = () =>
    save.mutate(
      {
        examSubjectId,
        sectionId: sheet.section.id,
        marks: toSend.flatMap((i) => {
          const c = checks.get(i.enrollmentId)!;
          return c.ok && c.input ? [{ enrollmentId: i.enrollmentId, ...(c.input as MarkInput) }] : [];
        }),
      },
      { onSuccess: () => toast.success(t("saved", { count: toSend.length })), onError: (e) => toast.error(describeError(e)) },
    );

  return (
    <div className="space-y-3">
      {!sheet.canEdit && sheet.cannotEditReason && (
        <div className="flex items-start gap-2 rounded-md border bg-muted/50 p-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          {sheet.cannotEditReason}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
        <div className="text-sm">
          <div className="font-medium">
            {name(sheet.subject)} · {t("fullPass", { full: format.number(Number(sheet.fullMarks)), pass: format.number(Number(sheet.passMarks)) })}
          </div>
          {sheet.parts.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {sheet.parts.map((p) => t("part", { name: p.name, full: format.number(Number(p.fullMarks)), pass: format.number(Number(p.passMarks)) })).join(" · ")}
            </div>
          )}
          <div className="text-xs text-muted-foreground">{t("progress", { done, total: sheet.items.length })}</div>
        </div>
        {sheet.canEdit && (
          <Button size="sm" onClick={submit} disabled={save.isPending || toSend.length === 0 || invalid.length > 0}>
            <Save /> {save.isPending ? t("saving") : toSend.length ? t("saveCount", { count: toSend.length }) : t("save")}
          </Button>
        )}
      </div>

      {sheet.items.length === 0 ? (
        <p className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">{t("noStudents")}</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {sheet.items.map((item) => {
            const check = checks.get(item.enrollmentId)!;
            return (
              <li key={item.enrollmentId} className="flex flex-wrap items-center gap-3 px-3 py-2">
                <span className="w-8 text-sm text-muted-foreground tabular-nums">{item.rollNumber ?? "—"}</span>
                <div className="min-w-40 flex-1">
                  <div className="font-medium leading-tight">{name(item.student)}</div>
                  {item.group && <div className="text-xs text-muted-foreground">{name(item.group)}</div>}
                </div>
                <div className="space-y-1">
                  <MarkCellInput
                    subject={subject}
                    draft={drafts.get(item.enrollmentId)!}
                    onChange={(d) => setDrafts((all) => new Map(all).set(item.enrollmentId, d))}
                    disabled={!sheet.canEdit}
                    invalid={!check.ok}
                  />
                  {!check.ok && <p className="text-xs text-destructive">{errorText(check)}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">{t("hint")}</p>
    </div>
  );
}
