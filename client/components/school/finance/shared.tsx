"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useCallback, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import type { FeeStatus } from "@/lib/school/collection";
import { useMonthName } from "@/lib/school/finance";
import { cn } from "@/lib/utils";
import { useSchoolLanguage } from "../NameFields";

/** A record's name in the school's language, with the other language's name under it. */
export function NameCell({ record }: { record: { nameEn: string | null; nameBn: string | null } }) {
  const name = useLocalizedName();
  const language = useSchoolLanguage();
  const main = name(record);
  const other = language === "BN" ? record.nameEn : record.nameBn;
  return (
    <>
      <div className="font-medium">{main}</div>
      {other && other !== main && <div className="text-xs text-muted-foreground">{other}</div>}
    </>
  );
}

/**
 * A fee's line: "Tuition Fee · March 2026", or the fee type alone for a one-time fee (and its
 * note). A one-time fee of another year than `mainYearId` shows its year: "Re-admission Fee (2026)".
 */
export const useFeeLabel = () => {
  const name = useLocalizedName();
  const monthName = useMonthName();
  const format = useFormatter();
  return useCallback(
    (
      fee: {
        feeType: { nameEn: string | null; nameBn: string | null };
        month: number | null;
        year: number | null;
        description?: string | null;
        academicYear?: { id: string; name: string };
      },
      mainYearId?: string,
    ) => {
      const otherYear = !fee.month && fee.academicYear && mainYearId && fee.academicYear.id !== mainYearId;
      const base =
        fee.month && fee.year
          ? `${name(fee.feeType)} · ${monthName(fee.month)} ${format.number(fee.year, { useGrouping: false })}`
          : otherYear
            ? `${name(fee.feeType)} (${fee.academicYear!.name})`
            : name(fee.feeType);
      return fee.description ? `${base} (${fee.description})` : base;
    },
    [name, monthName, format],
  );
};

const STATUS_STYLE: Record<FeeStatus, string> = {
  PAID: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
  PARTIAL: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  UNPAID: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
  WAIVED: "bg-muted text-muted-foreground",
};

export function FeeStatusBadge({ status }: { status: FeeStatus }) {
  const t = useTranslations("school.finance.feeStatus");
  return <span className={cn("inline-flex rounded px-1.5 py-0.5 text-xs font-medium", STATUS_STYLE[status])}>{t(status)}</span>;
}

/** Loading, failed or empty: the states every finance list shares. */
export function ListState({
  isPending,
  error,
  onRetry,
  empty,
  children,
}: {
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  empty: ReactNode | null;
  children: ReactNode;
}) {
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  if (isPending) return <Skeleton className="h-40" />;
  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
        <p>{describeError(error)}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {tCommon("tryAgain")}
        </Button>
      </div>
    );
  }
  if (empty) return <p className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">{empty}</p>;
  return <>{children}</>;
}
