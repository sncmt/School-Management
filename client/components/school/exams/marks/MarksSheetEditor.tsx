"use client";

import { Info, Keyboard, Save } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useSaveMarksSheet, type MarkInput, type MarksSheet } from "@/lib/school/marks";
import { cn } from "@/lib/utils";
import { checkDraft, isBlank, sameDraft, toDraft, type CellCheck, type CellDraft } from "./markCell";
import { MarkCellInput } from "./MarkCellInput";

type Item = MarksSheet["items"][number];

/*
 * Marks of one subject for one section, as a register: the subject (full and pass marks, each
 * part's, how far along), then a row per student (roll, name, the mark box right beside it, absent,
 * pass or fail as typed), in two columns from 1280px (1536px for a subject in parts) so no box
 * sits far from its name. Enter moves
 * to the next box. The save bar stays at the bottom of the window.
 */
export function MarksSheetEditor({ examSubjectId, sheet }: { examSubjectId: string; sheet: MarksSheet }) {
  const t = useTranslations("school.exams.marks");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const name = useLocalizedName();
  const save = useSaveMarksSheet();
  const subject = { fullMarks: sheet.fullMarks, parts: sheet.parts };
  const n = (v: string | number) => format.number(Number(v));

  const initial = useMemo(() => new Map(sheet.items.map((i) => [i.enrollmentId, toDraft(subject, i)])), [sheet]); // eslint-disable-line react-hooks/exhaustive-deps
  const [drafts, setDrafts] = useState<Map<string, CellDraft>>(initial);

  const checks = new Map<string, CellCheck>(sheet.items.map((i) => [i.enrollmentId, checkDraft(subject, drafts.get(i.enrollmentId)!)]));
  const changed = sheet.items.filter((i) => !sameDraft(drafts.get(i.enrollmentId)!, initial.get(i.enrollmentId)!));
  const invalid = changed.filter((i) => !checks.get(i.enrollmentId)!.ok);
  // a cleared mark can't be "unsaved": the server keeps it, so only filled-in marks are sent
  const toSend = changed.filter((i) => checks.get(i.enrollmentId)!.ok && !isBlank(drafts.get(i.enrollmentId)!));
  const done = sheet.items.filter((i) => !isBlank(drafts.get(i.enrollmentId)!)).length;
  const absent = sheet.items.filter((i) => drafts.get(i.enrollmentId)!.absent).length;
  const total = sheet.items.length;

  const errorText = (c: CellCheck) =>
    c.ok ? null : c.error === "tooHigh" ? t("errors.tooHigh", { max: c.max ?? 0 }) : c.error === "partMissing" ? t("errors.partMissing", { part: c.part ?? "" }) : t("errors.number");

  // pass or fail as the result will count it: the total reaches the pass mark, and every part its own
  const verdict = (c: CellCheck): "pass" | "fail" | null => {
    if (!c.ok || !c.input || c.input.isAbsent) return null;
    const parts = c.input.parts;
    const sum = parts ? Object.values(parts).reduce((s, v) => s + v, 0) : (c.input.total ?? 0);
    const partsPass = sheet.parts.every((p) => !parts || (parts[p.name] ?? 0) >= Number(p.passMarks));
    return sum >= Number(sheet.passMarks) && partsPass ? "pass" : "fail";
  };

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

  // Enter in a mark box moves to the next box (the next part, or the next student)
  const nextOnEnter = (e: KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (e.key !== "Enter" || !target.hasAttribute("data-mark")) return;
    e.preventDefault();
    const boxes = [...e.currentTarget.querySelectorAll<HTMLInputElement>("input[data-mark]:not(:disabled)")];
    boxes[boxes.indexOf(target as HTMLInputElement) + 1]?.focus();
  };

  // the marks column is as wide as its boxes: one box and the absent pill, or a box per part, the total and the pill
  const marksWidth = sheet.parts.length === 0 ? "9.75rem" : `${sheet.parts.length * 4.25 + 6.5}rem`;
  const half = Math.ceil(total / 2);
  const columns = [sheet.items.slice(0, half), sheet.items.slice(half)].filter((c) => c.length > 0);

  const head = (
    <div className="grid items-end gap-x-3 border-b border-border/70 px-2.5 pt-2 pb-2 text-[13px] font-semibold text-muted-foreground [grid-template-columns:var(--marks-cols)]">
      <span className="text-right">{t("roll")}</span>
      <span>{t("student")}</span>
      {sheet.parts.length === 0 ? (
        <span className="w-[5.25rem] text-center leading-tight">
          {t("marks")}
          <span className="block text-xs font-normal">{t("outOf", { full: n(sheet.fullMarks) })}</span>
        </span>
      ) : (
        <span className="flex gap-1.5">
          {sheet.parts.map((p) => (
            <span key={p.name} className="w-[3.875rem] truncate text-center leading-tight" title={p.name}>
              {p.name}
              <span className="block text-xs font-normal">{n(p.fullMarks)}</span>
            </span>
          ))}
        </span>
      )}
      <span className="max-sm:hidden" />
    </div>
  );

  const row = (item: Item) => {
    const check = checks.get(item.enrollmentId)!;
    const result = verdict(check);
    return (
      <li
        key={item.enrollmentId}
        className="grid items-center gap-x-3 gap-y-1 rounded-lg border-b border-border/60 px-2.5 py-2 transition-colors [grid-template-columns:var(--marks-cols)] focus-within:border-transparent focus-within:bg-brand-soft/70 focus-within:shadow-[inset_3px_0_0_var(--navy)]"
      >
        <span className="text-right text-[15px] text-muted-foreground tabular-nums">{item.rollNumber ?? "—"}</span>
        <div className="min-w-0">
          <div className="line-clamp-2 text-base leading-tight font-semibold">{name(item.student)}</div>
          {item.group && <div className="truncate text-xs text-muted-foreground">{name(item.group)}</div>}
          {!check.ok && <div className="text-xs font-semibold text-destructive">{errorText(check)}</div>}
        </div>
        <MarkCellInput
          subject={subject}
          draft={drafts.get(item.enrollmentId)!}
          onChange={(d) => setDrafts((all) => new Map(all).set(item.enrollmentId, d))}
          disabled={!sheet.canEdit}
          invalid={!check.ok}
        />
        <span className={cn("text-[13px] font-semibold max-sm:col-start-2 max-sm:row-start-2", result === "pass" ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>
          {result && t(result === "pass" ? "pass" : "fail")}
        </span>
      </li>
    );
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* the subject: what it's out of, and how far along */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-border/60 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-[1.375rem] leading-tight font-bold text-navy">{name(sheet.subject)}</h2>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-[13px]">
            <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-navy">{t("fullPass", { full: n(sheet.fullMarks), pass: n(sheet.passMarks) })}</span>
            {sheet.parts.map((p) => (
              <span key={p.name} className="rounded-full bg-brand-soft px-2.5 py-0.5 text-navy">
                {t("part", { name: p.name, full: n(p.fullMarks), pass: n(p.passMarks) })}
              </span>
            ))}
          </div>
        </div>
        <div className="min-w-56 flex-1 sm:max-w-md">
          <div className="mb-1.5 flex justify-between gap-3 text-[13.5px] text-muted-foreground">
            <span>{t("progress", { done, total })}</span>
            {absent > 0 && <span>{t("absentCount", { count: n(absent) })}</span>}
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
            <span className="h-full bg-navy transition-[width]" style={{ width: total ? `${((done - absent) / total) * 100}%` : 0 }} />
            <span className="h-full bg-destructive transition-[width]" style={{ width: total ? `${(absent / total) * 100}%` : 0 }} />
          </div>
        </div>
      </div>

      {!sheet.canEdit && sheet.cannotEditReason && (
        <div className="mx-4 mt-4 flex items-start gap-2 rounded-md border bg-muted/50 p-3 text-sm sm:mx-5">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          {sheet.cannotEditReason}
        </div>
      )}

      {sheet.items.length === 0 ? (
        <p className="m-4 rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground sm:m-5">{t("noStudents")}</p>
      ) : (
        // the register: one column, two from 1280px; each row's mark box sits right after the name
        <div
          onKeyDown={nextOnEnter}
          style={{ ["--marks-cols" as string]: `2.75rem minmax(0,15rem) ${marksWidth} 3.5rem` }}
          className={cn("grid gap-x-8 px-2 pt-1 pb-4 max-sm:[--marks-cols:2rem_minmax(0,1fr)_auto]! sm:px-3", sheet.parts.length === 0 ? "xl:grid-cols-2" : "2xl:grid-cols-2")}
        >
          {columns.map((items, i) => (
            <div key={i} className={cn("min-w-0", i === 1 && (sheet.parts.length === 0 ? "max-xl:[&>div:first-child]:hidden" : "max-2xl:[&>div:first-child]:hidden"))}>
              {head}
              <ul>{items.map(row)}</ul>
            </div>
          ))}
        </div>
      )}

      {/* the save bar: always in view at the bottom of the window (above the phone's bottom bar) */}
      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 rounded-b-2xl border-t border-border/70 bg-card/95 px-4 py-3 backdrop-blur sm:px-5 md:bottom-0">
        <p className="flex items-center gap-2 text-[13.5px] text-muted-foreground max-md:hidden">
          <Keyboard className="size-4 shrink-0" />
          {t("enterHint")}
        </p>
        {sheet.canEdit && (
          <div className="ml-auto flex items-center gap-3 max-sm:w-full max-sm:justify-between">
            {toSend.length > 0 && <span className="text-sm font-semibold text-navy">{t("newMarks", { count: toSend.length })}</span>}
            <Button onClick={submit} disabled={save.isPending || toSend.length === 0 || invalid.length > 0} className="h-10 px-5">
              <Save /> {save.isPending ? t("saving") : toSend.length ? t("saveCount", { count: toSend.length }) : t("save")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
