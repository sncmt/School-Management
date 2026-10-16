"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { partsTotal, typeTotal, type CellDraft, type CellSubject } from "./markCell";

/** One student's mark in one subject: a total box (type A for absent), or a box per part. */
export function MarkCellInput({
  subject,
  draft,
  onChange,
  disabled,
  invalid,
  compact,
}: {
  subject: CellSubject;
  draft: CellDraft;
  onChange: (draft: CellDraft) => void;
  disabled?: boolean;
  invalid?: boolean;
  compact?: boolean;
}) {
  const t = useTranslations("school.exams.marks");
  const box = cn("text-center tabular-nums", compact ? "h-8 w-16 px-1" : "h-9 w-20", invalid && "border-destructive");

  const absentToggle = (
    <label className={cn("flex cursor-pointer items-center gap-1 text-xs text-muted-foreground", disabled && "cursor-default")}>
      <input
        type="checkbox"
        className="size-3.5 accent-destructive"
        checked={draft.absent}
        disabled={disabled}
        onChange={(e) => onChange({ ...draft, absent: e.target.checked })}
      />
      {t("absentShort")}
    </label>
  );

  if (subject.parts.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={draft.absent ? t("absentLetter") : draft.total}
          onChange={(e) =>
            onChange(
              typeTotal(
                draft,
                // the box shows the absent letter itself: typing after it (a number) replaces it
                draft.absent && e.target.value.startsWith(t("absentLetter"))
                  ? e.target.value.slice(t("absentLetter").length) || e.target.value
                  : e.target.value,
              ),
            )
          }
          onFocus={(e) => e.target.select()}
          inputMode="decimal"
          disabled={disabled}
          aria-label={t("marks")}
          className={cn(box, draft.absent && "font-semibold text-destructive")}
        />
        {!compact && absentToggle}
      </div>
    );
  }

  const total = partsTotal(draft);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {subject.parts.map((p) => (
        <Input
          key={p.name}
          value={draft.absent ? "" : (draft.parts[p.name] ?? "")}
          onChange={(e) => onChange({ ...draft, absent: false, parts: { ...draft.parts, [p.name]: e.target.value } })}
          onFocus={(e) => e.target.select()}
          inputMode="decimal"
          disabled={disabled || draft.absent}
          placeholder={p.name}
          title={`${p.name} (${Number(p.fullMarks)})`}
          aria-label={p.name}
          className={box}
        />
      ))}
      {!compact && !draft.absent && total !== null && (
        <span className="text-sm font-medium tabular-nums">= {total}</span>
      )}
      {absentToggle}
    </div>
  );
}
