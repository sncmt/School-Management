"use client";

import { useFormatter, useTranslations } from "next-intl";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@/lib/school/attendance";
import { cn } from "@/lib/utils";

// how each status looks: the chosen button, and a cell in the month register
export const STATUS_STYLES: Record<AttendanceStatus, { on: string; cell: string }> = {
  PRESENT: {
    on: "bg-emerald-600 text-white border-emerald-600",
    cell: "text-emerald-700 dark:text-emerald-400",
  },
  ABSENT: { on: "bg-rose-600 text-white border-rose-600", cell: "bg-rose-50 text-rose-700 font-semibold dark:bg-rose-950/40 dark:text-rose-400" },
  LATE: { on: "bg-amber-500 text-white border-amber-500", cell: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  LEAVE: { on: "bg-sky-600 text-white border-sky-600", cell: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400" },
};

/** P / A / L / Lv buttons for one person; only one is on. */
export function StatusToggle({
  value,
  onChange,
  disabled,
}: {
  value: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("school.attendance.statuses");
  const tShort = useTranslations("school.attendance.short");
  return (
    <div className="inline-flex overflow-hidden rounded-md border" role="radiogroup">
      {ATTENDANCE_STATUSES.map((status) => {
        const on = value === status;
        return (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={on}
            title={t(status)}
            disabled={disabled}
            onClick={() => onChange(status)}
            className={cn(
              "min-w-9 cursor-pointer border-l px-2 py-1 text-xs font-semibold transition-colors first:border-l-0 disabled:cursor-not-allowed disabled:opacity-60",
              on ? STATUS_STYLES[status].on : "bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            {tShort(status)}
          </button>
        );
      })}
    </div>
  );
}

/** "P 28 · A 2 · L 1 · Lv 0 · 93%" */
export function TallyLine({
  counts,
  percentage,
  className,
}: {
  counts: Record<AttendanceStatus, number>;
  percentage: number | null;
  className?: string;
}) {
  const tShort = useTranslations("school.attendance.short");
  const format = useFormatter();
  return (
    <span className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-sm tabular-nums", className)}>
      {ATTENDANCE_STATUSES.map((s) => (
        <span key={s} className={cn(counts[s] > 0 && s !== "PRESENT" && STATUS_STYLES[s].cell, "rounded px-1")}>
          {tShort(s)} {format.number(counts[s])}
        </span>
      ))}
      {percentage !== null && <span className="font-semibold">{formatPercent(format, percentage)}</span>}
    </span>
  );
}

/** 93.33 -> "93%" / "৯৩%" */
export const formatPercent = (format: ReturnType<typeof useFormatter>, value: number) =>
  format.number(value / 100, { style: "percent", maximumFractionDigits: 0 });
