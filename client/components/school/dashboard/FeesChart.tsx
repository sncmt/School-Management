"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { useMoney, useMonthName } from "@/lib/school/finance";
import { cn } from "@/lib/utils";

type Month = { month: string; collected: string; spent: string };

// the two series: categorical slots 1 and 2 of the validated palette (light / dark steps)
const SERIES = [
  { key: "collected", swatch: "bg-[#2a78d6] dark:bg-[#3987e5]" },
  { key: "spent", swatch: "bg-[#eb6834] dark:bg-[#d95926]" },
] as const;

const PLOT_HEIGHT = 200;

/* A round top for the axis: 1, 2, 2.5 or 5 times a power of ten, at least the largest value. */
const niceMax = (value: number) => {
  if (value <= 0) return 1000;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * power >= value)!;
  return step * power;
};

/**
 * Fees collected and money spent, month by month: grouped columns from one baseline, a
 * tooltip per month on hover (and keyboard focus), and the numbers as a table for screen readers.
 */
export function FeesChart({ months }: { months: Month[] }) {
  const t = useTranslations("school.home.chart");
  const format = useFormatter();
  const money = useMoney();
  const monthName = useMonthName();
  const [hover, setHover] = useState<number | null>(null);

  const rows = months.map((m) => ({ ...m, values: { collected: Number(m.collected), spent: Number(m.spent) } }));
  const max = niceMax(Math.max(0, ...rows.flatMap((r) => [r.values.collected, r.values.spent])));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const empty = rows.every((r) => r.values.collected === 0 && r.values.spent === 0);
  const label = (m: string, style: "short" | "long" = "short") => {
    const [y, mo] = m.split("-").map(Number);
    return `${monthName(mo, style)}${style === "long" ? ` ${format.number(y, { useGrouping: false })}` : ""}`;
  };
  const compact = (v: number) => format.number(v, { notation: "compact", maximumFractionDigits: 1 });

  return (
    <div>
      {/* legend: always there for two series */}
      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-2 text-muted-foreground">
            <span className={cn("size-3 rounded-sm", s.swatch)} />
            {t(s.key)}
          </span>
        ))}
      </div>

      <div className="relative flex" role="img" aria-label={t("aria")}>
        {/* the one axis, quiet */}
        <div className="relative w-12 shrink-0 text-right text-[11px] text-muted-foreground" style={{ height: PLOT_HEIGHT }}>
          {ticks.map((v) => (
            <span key={v} className="absolute right-2 -translate-y-1/2 tabular-nums" style={{ bottom: `${(v / max) * 100}%` }}>
              {compact(v)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          <div className="relative" style={{ height: PLOT_HEIGHT }}>
            {ticks.map((v) => (
              <div
                key={v}
                className={cn("absolute inset-x-0 border-t", v === 0 ? "border-border" : "border-dashed border-border/60")}
                style={{ bottom: `${(v / max) * 100}%` }}
              />
            ))}
            {empty && (
              <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">{t("empty")}</p>
            )}
            <div className="absolute inset-0 flex">
              {rows.map((r, i) => (
                <div
                  key={r.month}
                  tabIndex={0}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className="group relative flex flex-1 items-end justify-center gap-[2px] outline-none"
                  aria-label={`${label(r.month, "long")}: ${t("collected")} ${money(r.collected)}, ${t("spent")} ${money(r.spent)}`}
                >
                  {/* the hover band: bigger than the marks */}
                  <div className={cn("absolute inset-x-1 inset-y-0 rounded-md transition-colors", hover === i && "bg-muted/60")} />
                  {SERIES.map((s) => (
                    <div
                      key={s.key}
                      className={cn("relative w-[18px] rounded-t-[4px] transition-opacity", s.swatch, hover !== null && hover !== i && "opacity-40")}
                      style={{ height: `${(r.values[s.key] / max) * 100}%` }}
                    />
                  ))}
                  {hover === i && (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-max -translate-x-1/2 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
                      <div className="mb-1 font-medium text-foreground">{label(r.month, "long")}</div>
                      {SERIES.map((s) => (
                        <div key={s.key} className="flex items-center gap-2 text-muted-foreground">
                          <span className={cn("size-2.5 rounded-sm", s.swatch)} />
                          <span className="flex-1">{t(s.key)}</span>
                          <span className="font-medium text-foreground tabular-nums">{money(r[s.key])}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 flex">
            {rows.map((r) => (
              <span key={r.month} className="flex-1 text-center text-xs text-muted-foreground">
                {label(r.month)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* the same numbers for screen readers */}
      <table className="sr-only">
        <caption>{t("aria")}</caption>
        <thead>
          <tr>
            <th>{t("month")}</th>
            <th>{t("collected")}</th>
            <th>{t("spent")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.month}>
              <td>{label(r.month, "long")}</td>
              <td>{money(r.collected)}</td>
              <td>{money(r.spent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
