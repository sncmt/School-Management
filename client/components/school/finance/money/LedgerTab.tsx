"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowDownLeft, ArrowUpRight, Scale } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { StatCard } from "@/components/data/StatCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocalizedName } from "@/lib/i18n/names";
import { bdDayEnd, bdDayStart } from "@/lib/school/collection";
import { useFunds, useMoney } from "@/lib/school/finance";
import { useLedger, type LedgerEntry, type LedgerSource } from "@/lib/school/ledger";
import { cn } from "@/lib/utils";
import { Pager } from "../collect/PaymentsTab";
import { ListState } from "../shared";
import { DayRange, thisMonth } from "./DayRange";

const ALL = "all";
const SOURCES: LedgerSource[] = ["PAYMENT", "PAYMENT_REVERSAL", "MANUAL_DEPOSIT", "EXPENSE", "ADJUSTMENT", "TRANSFER"];
const isIn = (e: LedgerEntry) => e.type === "INCOME" || e.type === "TRANSFER_IN";

/** Every money movement of the funds: fee payments, deposits, expenses, transfers, reversals. */
export function LedgerTab() {
  const t = useTranslations("school.finance.ledger");
  const format = useFormatter();
  const name = useLocalizedName();
  const money = useMoney();
  const funds = useFunds();
  const [range, setRange] = useState(thisMonth);
  const [fundId, setFundId] = useState(ALL);
  const [source, setSource] = useState<LedgerSource | typeof ALL>(ALL);
  const [page, setPage] = useState(1);
  const ledger = useLedger({
    page,
    limit: 30,
    from: bdDayStart(range.from),
    to: bdDayEnd(range.to),
    ...(fundId !== ALL ? { fundId } : {}),
    ...(source !== ALL ? { source } : {}),
  });
  const s = ledger.data?.summary;
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <DayRange value={range} onChange={reset(setRange)} idPrefix="ledger" />
        <Select value={fundId} onValueChange={reset(setFundId)}>
          <SelectTrigger className="w-44" label={t("fund")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allFunds")}</SelectItem>
            {funds.data?.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {name(f)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={(v) => reset(setSource)(v as LedgerSource)}>
          <SelectTrigger className="w-48" label={t("kind")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allKinds")}</SelectItem>
            {SOURCES.map((src) => (
              <SelectItem key={src} value={src}>
                {t(`sources.${src}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {s && (
        <div className="grid gap-2 sm:grid-cols-3">
          <Tile icon={ArrowDownLeft} label={t("totalIn")} value={money(s.totalIn)} />
          <Tile icon={ArrowUpRight} label={t("totalOut")} value={money(s.totalOut)} />
          <Tile icon={Scale} label={t("net")} value={money(s.net)} />
        </div>
      )}

      <ListState isPending={ledger.isPending} error={ledger.error} onRetry={() => ledger.refetch()} empty={ledger.data?.items.length === 0 ? t("empty") : null}>
        <div className={cn("rounded-md border", ledger.isFetching && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.date")}</TableHead>
                <TableHead>{t("columns.fund")}</TableHead>
                <TableHead>{t("columns.what")}</TableHead>
                <TableHead className="text-right">{t("columns.in")}</TableHead>
                <TableHead className="text-right">{t("columns.out")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.data?.items.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {format.dateTime(new Date(e.transactionDate), { dateStyle: "medium", timeZone: "Asia/Dhaka" })}
                  </TableCell>
                  <TableCell className="text-sm">{name(e.fund)}</TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">
                      {e.source === "TRANSFER" ? t(isIn(e) ? "transferIn" : "transferOut") : t(`sources.${e.source}`)}
                      {e.category && <span className="font-normal text-muted-foreground"> · {e.category}</span>}
                    </div>
                    {e.description && <div className="text-xs text-muted-foreground">{e.description}</div>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{isIn(e) ? money(e.amount) : ""}</TableCell>
                  <TableCell className="text-right tabular-nums">{isIn(e) ? "" : money(e.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ListState>
      {ledger.data && ledger.data.meta.totalPages > 1 && <Pager page={page} totalPages={ledger.data.meta.totalPages} onPage={setPage} />}
    </div>
  );
}

/** A total at the top of a finance page: the shared stat card (icon, label, amount, a line under it). */
export function Tile({ icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub?: string }) {
  return <StatCard icon={icon} label={label} value={value} sub={sub} />;
}
