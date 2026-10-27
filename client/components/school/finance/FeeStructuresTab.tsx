"use client";

import { Copy, MoreHorizontal, Pencil, Plus, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useAcademicYears, type AcademicYear } from "@/lib/school/academicYears";
import { useClasses } from "@/lib/school/classes";
import {
  useCopyFeeStructures,
  useFeeStructures,
  useMoney,
  useMonthName,
  useSyncFeeStructure,
  type FeeStructure,
  type StructureSync,
} from "@/lib/school/finance";
import { cn } from "@/lib/utils";
import { FeeStructureDialog } from "./FeeStructureDialog";
import { ListState, NameCell } from "./shared";

/* The calendar months of an academic year, in order: [1..12], or [7..12, 1..6] for a July year. */
export const yearMonths = (year: Pick<AcademicYear, "startDate" | "endDate">) => {
  const start = new Date(year.startDate);
  const end = new Date(year.endDate);
  const months: number[] = [];
  let y = start.getUTCFullYear();
  let m = start.getUTCMonth() + 1;
  while ((y < end.getUTCFullYear() || (y === end.getUTCFullYear() && m <= end.getUTCMonth() + 1)) && months.length < 12) {
    months.push(m);
    if (m === 12) {
      m = 1;
      y++;
    } else m++;
  }
  return months;
};

/* What one student pays for this fee over the year. */
const yearTotal = (s: FeeStructure, months: number[]) => {
  if (s.feeType.frequency === "ONE_TIME") return Number(s.amount);
  if (s.monthlyAmounts.length === 0) return Number(s.amount) * months.length;
  const by = new Map(s.monthlyAmounts.map((m) => [m.month, Number(m.amount)]));
  return months.reduce((sum, m) => sum + (by.get(m) ?? 0), 0);
};

/* After saving or repairing: what happened to the fees students already have. */
export const useSyncToast = () => {
  const t = useTranslations("school.finance.structures");
  return (sync: StructureSync) => {
    if (sync.updated > 0 || sync.removed > 0) toast.info(t("syncDone", { updated: sync.updated, removed: sync.removed }));
    if (sync.blocked.length > 0) toast.warning(t("syncBlocked", { count: sync.blocked.length }), { duration: 10_000 });
  };
};

/** What each class pays in a year: one row per fee type. */
export function FeeStructuresTab({ canManage, canSync, onOpenFeeTypes }: { canManage: boolean; canSync: boolean; onOpenFeeTypes?: () => void }) {
  const t = useTranslations("school.finance.structures");
  const tTypes = useTranslations("school.finance.feeTypes");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const money = useMoney();
  const monthName = useMonthName();
  const years = useAcademicYears();
  const classes = useClasses();
  const sync = useSyncFeeStructure();
  const copy = useCopyFeeStructures();
  const [copying, setCopying] = useState(false);
  const syncToast = useSyncToast();
  const [yearId, setYearId] = useState<string | undefined>();
  const [classId, setClassId] = useState<string | undefined>();
  // undefined: closed; null: a new fee; a structure: change it
  const [editing, setEditing] = useState<FeeStructure | null | undefined>();

  const year = years.data?.find((y) => y.id === yearId) ?? years.data?.find((y) => y.isCurrent) ?? years.data?.[0];
  // the year just before the chosen one: its class fees can be copied in
  const previousYear = year
    ? [...(years.data ?? [])].filter((y) => y.startDate < year.startDate).sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
    : undefined;
  const schoolClass = classes.data?.items.find((c) => c.id === classId) ?? classes.data?.items[0];
  const structures = useFeeStructures(year && schoolClass ? { academicYearId: year.id, classId: schoolClass.id } : null);
  const months = year ? yearMonths(year) : [];

  // "৳500 a month", or the parts of the year: "Jan–Apr ৳700 · May–Dec ৳800"
  const amountText = (s: FeeStructure) => {
    if (s.feeType.frequency === "ONE_TIME") return money(s.amount);
    if (s.monthlyAmounts.length === 0) return t("perMonth", { amount: money(s.amount) });
    const by = new Map(s.monthlyAmounts.map((m) => [m.month, m.amount]));
    const parts: string[] = [];
    let i = 0;
    while (i < months.length) {
      const amount = by.get(months[i]);
      let j = i;
      while (j + 1 < months.length && by.get(months[j + 1]) === amount) j++;
      if (amount !== undefined) {
        const range = i === j ? monthName(months[i], "short") : `${monthName(months[i], "short")}–${monthName(months[j], "short")}`;
        parts.push(`${range} ${money(amount)}`);
      }
      i = j + 1;
    }
    return parts.join(" · ");
  };

  const repair = (s: FeeStructure) =>
    sync.mutate(s.id, {
      onSuccess: (r) => {
        toast.success(t("synced", { name: name(s.feeType) }));
        syncToast(r);
      },
      onError: (e) => toast.error(describeError(e)),
    });

  const items = structures.data ?? [];
  const total = items.reduce((sum, s) => sum + yearTotal(s, months), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <Select value={year?.id ?? ""} onValueChange={setYearId}>
          <SelectTrigger className="w-40" label={t("year")} required>
            <SelectValue placeholder={t("year")} />
          </SelectTrigger>
          <SelectContent>
            {years.data?.map((y) => (
              <SelectItem key={y.id} value={y.id}>
                {y.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={schoolClass?.id ?? ""} onValueChange={setClassId}>
          <SelectTrigger className="w-40" label={t("class")} required>
            <SelectValue placeholder={t("class")} />
          </SelectTrigger>
          <SelectContent>
            {classes.data?.items.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canManage && year && schoolClass && (
          <div className="ml-auto flex gap-2">
            {previousYear && (
              <Button variant="outline" onClick={() => setCopying(true)}>
                <Copy /> {t("copyFrom", { year: previousYear.name })}
              </Button>
            )}
            <Button onClick={() => setEditing(null)}>
              <Plus /> {t("add")}
            </Button>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{t("description")}</p>

      {!year || !schoolClass ? (
        <p className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">{t("setupFirst")}</p>
      ) : (
        <ListState
          isPending={structures.isPending}
          error={structures.error}
          onRetry={() => structures.refetch()}
          empty={items.length === 0 ? t("empty", { class: schoolClass.name, year: year.name }) : null}
        >
          <div className={cn("rounded-md border", structures.isFetching && "opacity-60")}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.feeType")}</TableHead>
                  <TableHead>{t("columns.frequency")}</TableHead>
                  <TableHead>{t("columns.amount")}</TableHead>
                  <TableHead className="text-right">{t("columns.yearTotal")}</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => (
                  <TableRow key={s.id} className={cn(!s.feeType.isActive && "text-muted-foreground")}>
                    <TableCell>
                      <NameCell record={s.feeType} />
                      <div className="text-xs text-muted-foreground">
                        {t("intoFund", { fund: name(s.feeType.fund) })}
                        {s.feeType.appliesTo !== "ALL" && ` · ${tTypes(`appliesTo.${s.feeType.appliesTo}`)}`}
                        {!s.feeType.isActive && ` · ${tTypes("inactive")}`}
                      </div>
                    </TableCell>
                    <TableCell>{tTypes(`frequencies.${s.feeType.frequency}`)}</TableCell>
                    <TableCell className="tabular-nums">{amountText(s)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{money(yearTotal(s, months))}</TableCell>
                    <TableCell>
                      {(canManage || canSync) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8" aria-label={t("actions")}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64">
                            {canManage && (
                              <DropdownMenuItem onSelect={() => setEditing(s)}>
                                <Pencil /> {t("edit")}
                              </DropdownMenuItem>
                            )}
                            {canSync && (
                              <DropdownMenuItem onSelect={() => repair(s)} disabled={sync.isPending}>
                                <RefreshCw /> {t("sync")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>{t("perStudent")}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{money(total)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </ListState>
      )}

      <AlertDialog open={copying} onOpenChange={(open) => !open && !copy.isPending && setCopying(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("copyTitle", { from: previousYear?.name ?? "", to: year?.name ?? "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("copyDescription", { from: previousYear?.name ?? "", to: year?.name ?? "" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={copy.isPending}>{t("cancel")}</AlertDialogCancel>
            <Button
              disabled={copy.isPending}
              onClick={() =>
                year &&
                copy.mutate(
                  { toAcademicYearId: year.id, ...(previousYear ? { fromAcademicYearId: previousYear.id } : {}) },
                  {
                    onSuccess: (r) => {
                      toast.success(
                        r.copied > 0
                          ? t("copied", { count: r.copied, from: r.from.name, to: r.to.name, students: r.studentsWithFees })
                          : t("nothingToCopy", { from: r.from.name }),
                      );
                      if (r.skipped > 0) toast.info(t("copySkipped", { count: r.skipped }));
                      setCopying(false);
                    },
                    onError: (e) => {
                      toast.error(describeError(e));
                      setCopying(false);
                    },
                  },
                )
              }
            >
              <Copy /> {copy.isPending ? t("copying") : t("copy")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {year && schoolClass && (
        <FeeStructureDialog
          open={editing !== undefined}
          structure={editing ?? null}
          year={year}
          schoolClass={schoolClass}
          taken={items.map((s) => s.feeTypeId)}
          onClose={() => setEditing(undefined)}
          onOpenFeeTypes={onOpenFeeTypes}
        />
      )}
    </div>
  );
}
