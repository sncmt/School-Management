"use client";

import { CircleAlert, Clock, MoreHorizontal, ReceiptText, RefreshCw, Search, Undo2, Wallet } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useDeferredValue, useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bangladeshDay } from "@/lib/dates";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { bdDayEnd, bdDayStart } from "@/lib/school/collection";
import { useMoney } from "@/lib/school/finance";
import {
  useCheckOnlinePayment,
  useMarkRefund,
  useOnlinePayments,
  type OnlinePaymentListQuery,
  type OnlinePaymentRow,
  type OnlinePaymentStatus,
} from "@/lib/school/onlinePayment";
import { cn } from "@/lib/utils";
import { Pager } from "./collect/PaymentsTab";
import { ReceiptDialog } from "./collect/ReceiptDialog";
import { ListState } from "./shared";

const ALL = "all";
const PAGE_SIZE = 20;
const STATUSES: OnlinePaymentStatus[] = ["PAID", "PENDING", "FAILED", "CANCELLED"];

const STATUS_STYLE: Record<OnlinePaymentStatus, string> = {
  PAID: "border-[#0ca30c]/40 text-[#0a7d0a] dark:text-[#4fd14f]",
  PENDING: "border-[#fab219]/60 text-[#8a5d00] dark:text-[#fac85a]",
  FAILED: "border-rose-300 text-rose-700 dark:text-rose-400",
  CANCELLED: "text-muted-foreground",
};

/** Every payment guardians made (or started) online, what SSLCommerz said, and refunds to give. */
export function OnlinePaymentsList() {
  const t = useTranslations("school.finance.online.list");
  const money = useMoney();
  const today = bangladeshDay(new Date().toISOString());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState<OnlinePaymentStatus | typeof ALL>(ALL);
  const [refund, setRefund] = useState<"OWED" | "DONE" | typeof ALL>(ALL);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [page, setPage] = useState(1);
  const query: OnlinePaymentListQuery = {
    page,
    limit: PAGE_SIZE,
    ...(from ? { from: bdDayStart(from) } : {}),
    ...(to ? { to: bdDayEnd(to) } : {}),
    ...(status !== ALL ? { status } : {}),
    ...(refund !== ALL ? { refund } : {}),
    ...(deferredSearch ? { search: deferredSearch } : {}),
  };
  const list = useOnlinePayments(query);
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };
  const summary = list.data?.summary;

  return (
    <div className="space-y-3">
      {/* what needs the office, whatever the filters */}
      {summary && (summary.refundsOwed.count > 0 || summary.pending > 0) && (
        <div className="flex flex-wrap gap-2">
          {summary.refundsOwed.count > 0 && (
            <button
              type="button"
              onClick={() => {
                reset(setRefund)("OWED");
                setStatus(ALL);
              }}
              className="inline-flex items-center gap-2 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-left text-sm text-rose-800 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <CircleAlert className="size-4 shrink-0" />
              {t("refundsOwed", { count: summary.refundsOwed.count, amount: money(summary.refundsOwed.amount) })}
            </button>
          )}
          {summary.pending > 0 && (
            <button
              type="button"
              onClick={() => {
                reset(setStatus)("PENDING");
                setRefund(ALL);
              }}
              className="inline-flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <Clock className="size-4 shrink-0" />
              {t("pending", { count: summary.pending })}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="relative w-full sm:w-60">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => reset(setSearch)(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="pl-8" maxLength={80} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="online-from">{t("from")}</Label>
          <Input id="online-from" type="date" value={from} max={to || today} onChange={(e) => reset(setFrom)(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="online-to">{t("to")}</Label>
          <Input id="online-to" type="date" value={to} min={from} max={today} onChange={(e) => reset(setTo)(e.target.value)} className="w-40" />
        </div>
        <Select value={status} onValueChange={(v) => reset(setStatus)(v as OnlinePaymentStatus)}>
          <SelectTrigger className="w-40" aria-label={t("status")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allStatuses")}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`statuses.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={refund} onValueChange={(v) => reset(setRefund)(v as "OWED")}>
          <SelectTrigger className="w-40" aria-label={t("refund")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allRefunds")}</SelectItem>
            <SelectItem value="OWED">{t("refunds.OWED")}</SelectItem>
            <SelectItem value="DONE">{t("refunds.DONE")}</SelectItem>
          </SelectContent>
        </Select>
        {summary && (
          <div className="ml-auto text-right">
            <div className="text-xs text-muted-foreground">{t("received", { count: summary.paid.count })}</div>
            <div className="text-xl font-semibold tabular-nums">{money(summary.paid.total)}</div>
            {Number(summary.paid.charge) > 0 && <div className="text-xs text-muted-foreground">{t("ofWhichCharge", { amount: money(summary.paid.charge) })}</div>}
          </div>
        )}
      </div>

      <OnlineTable rows={list.data?.items} isPending={list.isPending} isFetching={list.isFetching} error={list.error} onRetry={() => list.refetch()} />
      {list.data && list.data.meta.totalPages > 1 && <Pager page={page} totalPages={list.data.meta.totalPages} onPage={setPage} />}
    </div>
  );
}

function OnlineTable({
  rows,
  isPending,
  isFetching,
  error,
  onRetry,
}: {
  rows: OnlinePaymentRow[] | undefined;
  isPending: boolean;
  isFetching: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const t = useTranslations("school.finance.online.list");
  const format = useFormatter();
  const name = useLocalizedName();
  const money = useMoney();
  const describeError = useErrorMessage();
  const checkPayment = useCheckOnlinePayment();
  const markRefund = useMarkRefund();
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [refunding, setRefunding] = useState<OnlinePaymentRow | null>(null);
  const when = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" });

  const check = (row: OnlinePaymentRow) =>
    checkPayment.mutate(row.id, {
      onSuccess: (r) => (r.status === "PENDING" ? toast.info(t("stillWaiting")) : toast.success(t(`checked.${r.status}`))),
      onError: (e) => toast.error(describeError(e)),
    });
  const undo = (row: OnlinePaymentRow) =>
    markRefund.mutate({ id: row.id, refunded: false }, { onSuccess: () => toast.success(t("refundUndone")), onError: (e) => toast.error(describeError(e)) });

  return (
    <>
      <ListState isPending={isPending} error={error} onRetry={onRetry} empty={rows?.length === 0 ? t("empty") : null}>
        <div className={cn("rounded-md border", isFetching && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.date")}</TableHead>
                <TableHead>{t("columns.student")}</TableHead>
                <TableHead className="text-right">{t("columns.amount")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead>{t("columns.sslcommerz")}</TableHead>
                <TableHead>{t("columns.receipt")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows?.map((row) => {
                const owed = Number(row.refundAmount) > 0;
                const canCheck = row.status === "PENDING";
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {when(row.createdAt)}
                      {row.paidAt && <div className="text-xs text-muted-foreground">{t("paidAt", { time: when(row.paidAt) })}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{name(row.student)}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.student.admissionNo}
                        {row.payer && ` · ${t("by", { name: row.payer.fullname })}`}
                      </div>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap tabular-nums">
                      <div className="font-medium">{money(row.total)}</div>
                      {Number(row.charge) > 0 && <div className="text-xs text-muted-foreground">{t("feesAndCharge", { fees: money(row.feeAmount), charge: money(row.charge) })}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge variant="outline" className={STATUS_STYLE[row.status]}>
                          {t(`statuses.${row.status}`)}
                        </Badge>
                        {row.sandbox && (
                          <Badge variant="outline" className="text-muted-foreground">
                            {t("test")}
                          </Badge>
                        )}
                      </div>
                      {row.failReason && row.status !== "PAID" && <div className="mt-1 max-w-48 text-xs text-muted-foreground">{row.failReason}</div>}
                      {owed && (
                        <div className={cn("mt-1 text-xs font-medium", row.refundedAt ? "text-muted-foreground" : "text-rose-700 dark:text-rose-400")}>
                          {row.refundedAt ? t("refunded", { amount: money(row.refundAmount) }) : t("toRefund", { amount: money(row.refundAmount) })}
                        </div>
                      )}
                      {row.refundNote && <div className="mt-0.5 max-w-56 text-xs text-muted-foreground">{row.refundNote}</div>}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-mono">{row.tranId}</div>
                      {row.bankTranId && <div className="font-mono text-muted-foreground">{t("bankRef", { ref: row.bankTranId })}</div>}
                      {row.cardType && <div className="text-muted-foreground">{row.cardType}</div>}
                    </TableCell>
                    <TableCell>
                      {row.payment ? (
                        <>
                          <button type="button" className="cursor-pointer font-mono text-sm underline-offset-4 hover:underline" onClick={() => setReceiptId(row.payment!.id)}>
                            {row.payment.receiptNo}
                          </button>
                          {row.payment.status === "CANCELLED" && (
                            <Badge variant="outline" className="ml-2 border-rose-300 text-rose-700 dark:text-rose-400">
                              {t("receiptCancelled")}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(canCheck || owed || row.payment) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8" aria-label={t("actions")}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canCheck && (
                              <DropdownMenuItem disabled={checkPayment.isPending} onSelect={() => check(row)}>
                                <RefreshCw /> {t("check")}
                              </DropdownMenuItem>
                            )}
                            {row.payment && (
                              <DropdownMenuItem onSelect={() => setReceiptId(row.payment!.id)}>
                                <ReceiptText /> {t("receipt")}
                              </DropdownMenuItem>
                            )}
                            {owed && !row.refundedAt && (
                              <DropdownMenuItem onSelect={() => setRefunding(row)}>
                                <Wallet /> {t("markRefunded")}
                              </DropdownMenuItem>
                            )}
                            {owed && row.refundedAt && (
                              <DropdownMenuItem disabled={markRefund.isPending} onSelect={() => undo(row)}>
                                <Undo2 /> {t("undoRefund")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </ListState>

      <ReceiptDialog paymentId={receiptId} onClose={() => setReceiptId(null)} />
      <RefundDialog row={refunding} onClose={() => setRefunding(null)} />
    </>
  );
}

function RefundDialog({ row, onClose }: { row: OnlinePaymentRow | null; onClose: () => void }) {
  const t = useTranslations("school.finance.online.list.refundDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const money = useMoney();
  const markRefund = useMarkRefund();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setNote("");
    setError(null);
    onClose();
  };
  const submit = () =>
    markRefund.mutate(
      { id: row!.id, refunded: true, ...(note.trim() ? { note: note.trim() } : {}) },
      {
        onSuccess: () => {
          toast.success(t("done"));
          close();
        },
        onError: (e) => setError(describeError(e)),
      },
    );

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && !markRefund.isPending && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title", { amount: money(row?.refundAmount) })}</DialogTitle>
          <DialogDescription>{t("description", { tranId: row?.tranId ?? "" })}</DialogDescription>
        </DialogHeader>
        <FormError message={error} />
        <div className="space-y-1.5">
          <Label htmlFor="refund-note">{t("note")}</Label>
          <Input id="refund-note" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder={t("notePlaceholder")} autoFocus />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={markRefund.isPending}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={submit} disabled={markRefund.isPending}>
            <Wallet /> {markRefund.isPending ? t("working") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
