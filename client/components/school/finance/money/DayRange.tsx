"use client";

import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bangladeshDay } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type DayRangeValue = { from: string; to: string };

const today = () => bangladeshDay(new Date().toISOString());
/** This month so far, in Bangladesh: the 1st to today. */
export const thisMonth = (): DayRangeValue => {
  const t = today();
  return { from: `${t.slice(0, 8)}01`, to: t };
};

/** From and to days, with quick choices: today, this month, last month, this year. */
export function DayRange({ value, onChange, idPrefix }: { value: DayRangeValue; onChange: (v: DayRangeValue) => void; idPrefix: string }) {
  const t = useTranslations("school.finance.range");
  const max = today();
  const [y, m] = max.split("-").map(Number);
  const lastMonthEnd = new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10);
  const presets: { key: string; range: DayRangeValue }[] = [
    { key: "today", range: { from: max, to: max } },
    { key: "thisMonth", range: thisMonth() },
    { key: "lastMonth", range: { from: `${lastMonthEnd.slice(0, 8)}01`, to: lastMonthEnd } },
    { key: "thisYear", range: { from: `${y}-01-01`, to: max } },
  ];

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-from`}>{t("from")}</Label>
        <Input
          id={`${idPrefix}-from`}
          type="date"
          value={value.from}
          max={value.to || max}
          onChange={(e) => onChange({ ...value, from: e.target.value || value.from })}
          className="w-40"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-to`}>{t("to")}</Label>
        <Input
          id={`${idPrefix}-to`}
          type="date"
          value={value.to}
          min={value.from}
          max={max}
          onChange={(e) => onChange({ ...value, to: e.target.value || value.to })}
          className="w-40"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {presets.map((p) => {
          const on = p.range.from === value.from && p.range.to === value.to;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onChange(p.range)}
              className={cn(
                "h-9 cursor-pointer rounded-md border px-2.5 text-xs transition-colors",
                on ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted",
              )}
            >
              {t(`presets.${p.key}` as "presets.today")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

