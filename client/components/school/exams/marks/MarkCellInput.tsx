"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { partsTotal, typeTotal, type CellDraft, type CellSubject } from "./markCell";

/*
 * One student's mark in one subject: a total box (type অ / A for absent), or a box per part.
 * Full size (the subject sheet), the boxes are big and bold and show what's in them: empty white,
 * filled in the accent's tint, absent in red, a mistake with a red edge; each carries data-mark,
 * so Enter can move to the next one. Compact (the whole-section grid) they stay small and plain.
 */
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
  const box = (filled: boolean, wide: boolean) =>
    cn(
      "text-center tabular-nums",
      compact
        ? "h-8 w-16 px-1"
        : cn(
            "h-11 rounded-lg border-[1.5px] border-foreground/20 bg-card px-1 text-xl font-bold shadow-none placeholder:text-base placeholder:font-normal placeholder:text-muted-foreground/50 focus-visible:border-navy focus-visible:ring-[3px] focus-visible:ring-brand/25 md:text-xl dark:bg-card",
            wide ? "w-[5.25rem]" : "w-[3.875rem] text-lg md:text-lg",
            filled && "border-brand/40 bg-brand-soft/50 text-navy dark:bg-brand-soft/20",
          ),
      invalid && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
    );

  // full size: a small pill that turns red when on; compact: the old tick box
  const absentToggle = compact ? (
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
  ) : (
    <label
      className={cn(
        "inline-flex h-7 shrink-0 cursor-pointer items-center rounded-full border border-border bg-card px-2.5 text-[13px] text-muted-foreground transition-colors select-none hover:border-foreground/30",
        "has-checked:border-destructive has-checked:bg-destructive has-checked:font-semibold has-checked:text-white",
        "has-focus-visible:ring-2 has-focus-visible:ring-destructive/40",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
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
          data-mark=""
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
          placeholder={compact ? undefined : "—"}
          aria-label={t("marks")}
          className={cn(
            box(draft.total.trim() !== "", true),
            draft.absent && (compact ? "font-semibold text-destructive" : "border-destructive/40 bg-destructive/10 text-destructive dark:bg-destructive/15"),
          )}
        />
        {!compact && absentToggle}
      </div>
    );
  }

  const total = partsTotal(draft);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {subject.parts.map((p, i) => (
        <Input
          key={p.name}
          data-mark=""
          // absent shows once, in the first part's box
          value={draft.absent ? (i === 0 && !compact ? t("absentLetter") : "") : (draft.parts[p.name] ?? "")}
          onChange={(e) => onChange({ ...draft, absent: false, parts: { ...draft.parts, [p.name]: e.target.value } })}
          onFocus={(e) => e.target.select()}
          inputMode="decimal"
          disabled={disabled || draft.absent}
          placeholder={compact ? p.name : "—"}
          title={`${p.name} (${Number(p.fullMarks)})`}
          aria-label={p.name}
          className={cn(
            box((draft.parts[p.name] ?? "").trim() !== "", false),
            draft.absent && !compact && i === 0 && "border-destructive/40 bg-destructive/10 text-destructive opacity-100 dark:bg-destructive/15",
          )}
        />
      ))}
      {!compact && !draft.absent && total !== null && <span className="min-w-10 text-[15px] font-bold text-navy tabular-nums">= {total}</span>}
      {absentToggle}
    </div>
  );
}
