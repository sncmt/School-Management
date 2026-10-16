"use client";

import { CheckCheck, HandCoins } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bangladeshDay } from "@/lib/dates";
import { toAsciiDigits } from "@/lib/i18n/digits";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useClasses } from "@/lib/school/classes";
import { usePayableFees, useRecordPayment, type PaymentMethod } from "@/lib/school/collection";
import { useMoney } from "@/lib/school/finance";
import { cn } from "@/lib/utils";
import { FeeStatusBadge, ListState, useFeeLabel } from "../shared";
import { ReceiptDialog } from "./ReceiptDialog";

const parseAmount = (text: string) => {
  const v = toAsciiDigits(text.trim());
  return /^\d+(\.\d{1,2})?$/.test(v) ? Number(v) : NaN;
};

/** Take a payment: tick the fees being paid (part of a fee is fine), then the method. */
export function PayView({ studentId }: { studentId: string }) {
  const t = useTranslations("school.finance.collect.pay");
  const describeError = useErrorMessage();
  const money = useMoney();
  const feeLabel = useFeeLabel();
  const payable = usePayableFees(studentId);
  // one-time fees of another year show which year they are from
  const currentYearId = useClasses().data?.academicYear?.id;
  const record = useRecordPayment();
  const today = bangladeshDay(new Date().toISOString());
  // the ticked fees and the amount being paid on each
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [ref, setRef] = useState("");
  const [day, setDay] = useState(today);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const items = payable.data?.items ?? [];
  const selected = items.filter((f) => amounts[f.id] !== undefined);
  const invalid = selected.filter((f) => {
    const n = parseAmount(amounts[f.id]);
    return !(n > 0) || n > f.remaining;
  });
  const total = selected.reduce((sum, f) => sum + (parseAmount(amounts[f.id]) || 0), 0);

  const toggle = (id: string, remaining: number, on: boolean) =>
    setAmounts((a) => {
      const next = { ...a };
      if (on) next[id] = String(remaining);
      else delete next[id];
      return next;
    });
  const selectDue = () => setAmounts(Object.fromEntries(items.filter((f) => f.isDue).map((f) => [f.id, String(f.remaining)])));

  const submit = () =>
    record.mutate(
      {
        studentId,
        method,
        ...(method === "MOBILE_BANKING" ? { transactionRef: ref.trim() } : {}),
        // today: now; an earlier day: midday of that day in Bangladesh
        ...(day !== today ? { paidAt: `${day}T12:00:00+06:00` } : {}),
        allocations: selected.map((f) => {
          const n = parseAmount(amounts[f.id]);
          return n === f.remaining ? { studentFeeId: f.id } : { studentFeeId: f.id, amount: n };
        }),
      },
      {
        onSuccess: (payment) => {
          toast.success(t("done", { amount: money(payment.amount), no: payment.receiptNo }));
          setAmounts({});
          setRef("");
          setReceiptId(payment.id);
        },
        onError: (e) => toast.error(describeError(e)),
      },
    );

  const canSubmit = selected.length > 0 && invalid.length === 0 && (method === "CASH" || ref.trim().length >= 3) && !record.isPending;

  return (
    <div className="space-y-3">
      <ListState isPending={payable.isPending} error={payable.error} onRetry={() => payable.refetch()} empty={items.length === 0 ? t("nothingDue") : null}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex gap-4">
            <span>
              {t("dueNow")}: <span className="font-semibold tabular-nums">{money(payable.data?.summary.totalDue)}</span>
            </span>
            <span className="text-muted-foreground">
              {t("allRemaining")}: <span className="tabular-nums">{money(payable.data?.summary.totalRemaining)}</span>
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={selectDue}>
            <CheckCheck /> {t("selectDue")}
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>{t("columns.fee")}</TableHead>
                <TableHead className="text-right">{t("columns.payable")}</TableHead>
                <TableHead className="text-right">{t("columns.paid")}</TableHead>
                <TableHead className="text-right">{t("columns.remaining")}</TableHead>
                <TableHead className="w-36 text-right">{t("columns.paying")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((f) => {
                const on = amounts[f.id] !== undefined;
                const bad = on && invalid.includes(f);
                return (
                  <TableRow key={f.id} className={cn(!f.isDue && !on && "text-muted-foreground")}>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="size-4 cursor-pointer accent-primary"
                        checked={on}
                        onChange={(e) => toggle(f.id, f.remaining, e.target.checked)}
                        aria-label={feeLabel(f, currentYearId)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{feeLabel(f, currentYearId)}</div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <FeeStatusBadge status={f.status} />
                        {!f.isDue && <span className="text-muted-foreground">{t("advance")}</span>}
                        {Number(f.discountAmount) > 0 && (
                          <span className="text-muted-foreground">{t("discounted", { amount: money(f.discountAmount) })}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(f.payable)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(f.paidAmount)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{money(f.remaining)}</TableCell>
                    <TableCell className="text-right">
                      {on && (
                        <Input
                          inputMode="decimal"
                          value={amounts[f.id]}
                          onChange={(e) => setAmounts((a) => ({ ...a, [f.id]: e.target.value }))}
                          className={cn("ml-auto h-8 w-28 text-right tabular-nums", bad && "border-destructive")}
                          aria-invalid={bad}
                          aria-label={t("columns.paying")}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={5} className="text-right">
                  {t("total", { count: selected.length })}
                </TableCell>
                <TableCell className="text-right text-base font-semibold tabular-nums">{money(total)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
        {invalid.length > 0 && <p className="text-sm text-destructive">{t("badAmount")}</p>}

        <div className="flex flex-wrap items-end gap-4 rounded-md border p-3">
          <div className="space-y-1.5">
            <Label>{t("method")}</Label>
            <div className="flex gap-3 text-sm">
              {(["CASH", "MOBILE_BANKING"] as const).map((m) => (
                <label key={m} className="flex cursor-pointer items-center gap-2">
                  <input type="radio" className="size-4 accent-primary" checked={method === m} onChange={() => setMethod(m)} />
                  {t(`methods.${m}`)}
                </label>
              ))}
            </div>
          </div>
          {method === "MOBILE_BANKING" && (
            <div className="space-y-1.5">
              <Label htmlFor="pay-ref" required>
                {t("transactionRef")}
              </Label>
              <Input id="pay-ref" value={ref} onChange={(e) => setRef(e.target.value)} className="w-56" placeholder={t("refPlaceholder")} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="pay-day">{t("date")}</Label>
            <Input id="pay-day" type="date" value={day} max={today} onChange={(e) => setDay(e.target.value || today)} className="w-40" />
          </div>
          <Button className="ml-auto" size="lg" onClick={submit} disabled={!canSubmit}>
            <HandCoins /> {record.isPending ? t("working") : t("submit", { amount: money(total) })}
          </Button>
        </div>
      </ListState>

      <ReceiptDialog paymentId={receiptId} onClose={() => setReceiptId(null)} />
    </div>
  );
}
