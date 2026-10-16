"use client";

import { Ban, ChevronLeft, ChevronRight, MoreHorizontal, ReceiptText } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
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
import { useCan } from "@/lib/auth/hooks";
import { bangladeshDay } from "@/lib/dates";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { bdDayEnd, bdDayStart, useCancelPayment, usePayments, type PaymentList, type PaymentListQuery, type PaymentMethod } from "@/lib/school/collection";
import { useMoney } from "@/lib/school/finance";
import { cn } from "@/lib/utils";
import { ListState } from "../shared";
import { ReceiptDialog } from "./ReceiptDialog";

const ALL = "all";
const PAGE_SIZE = 20;

/** Every payment taken: by day range, method and status, with the total collected. */
export function PaymentsTab() {
  const t = useTranslations("school.finance.payments");
  const money = useMoney();
  const today = bangladeshDay(new Date().toISOString());
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [method, setMethod] = useState<PaymentMethod | typeof ALL>(ALL);
  const [status, setStatus] = useState<"SUCCESS" | "CANCELLED" | typeof ALL>(ALL);
  const [page, setPage] = useState(1);
  const query: PaymentListQuery = {
    page,
    limit: PAGE_SIZE,
    ...(from ? { from: bdDayStart(from) } : {}),
    ...(to ? { to: bdDayEnd(to) } : {}),
    ...(method !== ALL ? { method } : {}),
    ...(status !== ALL ? { status } : {}),
  };
  const payments = usePayments(query);
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label htmlFor="pay-from">{t("from")}</Label>
          <Input id="pay-from" type="date" value={from} max={to || today} onChange={(e) => reset(setFrom)(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pay-to">{t("to")}</Label>
          <Input id="pay-to" type="date" value={to} min={from} max={today} onChange={(e) => reset(setTo)(e.target.value)} className="w-40" />
        </div>
        <Select value={method} onValueChange={(v) => reset(setMethod)(v as PaymentMethod)}>
          <SelectTrigger className="w-44" aria-label={t("method")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allMethods")}</SelectItem>
            <SelectItem value="CASH">{t("methods.CASH")}</SelectItem>
            <SelectItem value="MOBILE_BANKING">{t("methods.MOBILE_BANKING")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => reset(setStatus)(v as "SUCCESS")}>
          <SelectTrigger className="w-40" aria-label={t("status")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allStatuses")}</SelectItem>
            <SelectItem value="SUCCESS">{t("statuses.SUCCESS")}</SelectItem>
            <SelectItem value="CANCELLED">{t("statuses.CANCELLED")}</SelectItem>
          </SelectContent>
        </Select>
        {payments.data && (
          <div className="ml-auto text-right">
            <div className="text-xs text-muted-foreground">{t("collected")}</div>
            <div className="text-xl font-semibold tabular-nums">{money(payments.data.summary.collected)}</div>
          </div>
        )}
      </div>

      <PaymentsTable data={payments.data} isPending={payments.isPending} isFetching={payments.isFetching} error={payments.error} onRetry={() => payments.refetch()} showStudent />
      {payments.data && payments.data.meta.totalPages > 1 && (
        <Pager page={page} totalPages={payments.data.meta.totalPages} onPage={setPage} />
      )}
    </div>
  );
}

export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  const t = useTranslations("school.finance.payments");
  const format = useFormatter();
  return (
    <div className="flex items-center justify-end gap-2 text-sm">
      <span className="text-muted-foreground">{t("page", { page: format.number(page), total: format.number(totalPages) })}</span>
      <Button variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label={t("previous")}>
        <ChevronLeft />
      </Button>
      <Button variant="outline" size="icon" className="size-8" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label={t("next")}>
        <ChevronRight />
      </Button>
    </div>
  );
}

/** Payments with their receipt and, for those allowed, cancelling. */
export function PaymentsTable({
  data,
  isPending,
  isFetching,
  error,
  onRetry,
  showStudent,
}: {
  data: PaymentList | undefined;
  isPending: boolean;
  isFetching: boolean;
  error: unknown;
  onRetry: () => void;
  showStudent?: boolean;
}) {
  const t = useTranslations("school.finance.payments");
  const format = useFormatter();
  const name = useLocalizedName();
  const money = useMoney();
  const can = useCan();
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<PaymentList["items"][number] | null>(null);

  return (
    <>
      <ListState isPending={isPending} error={error} onRetry={onRetry} empty={data?.items.length === 0 ? t("empty") : null}>
        <div className={cn("rounded-md border", isFetching && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.receipt")}</TableHead>
                <TableHead>{t("columns.date")}</TableHead>
                {showStudent && <TableHead>{t("columns.student")}</TableHead>}
                <TableHead>{t("columns.method")}</TableHead>
                <TableHead className="text-right">{t("columns.amount")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((p) => {
                const cancelled = p.status === "CANCELLED";
                return (
                  <TableRow key={p.id} className={cn(cancelled && "text-muted-foreground")}>
                    <TableCell>
                      <button type="button" className="cursor-pointer font-mono text-sm underline-offset-4 hover:underline" onClick={() => setReceiptId(p.id)}>
                        {p.receiptNo}
                      </button>
                      {cancelled && (
                        <Badge variant="outline" className="ml-2 border-rose-300 text-rose-700 dark:text-rose-400">
                          {t("statuses.CANCELLED")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format.dateTime(new Date(p.paidAt), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" })}
                    </TableCell>
                    {showStudent && (
                      <TableCell>
                        <div className="font-medium">{name(p.student)}</div>
                        <div className="text-xs text-muted-foreground">{p.student.admissionNo}</div>
                      </TableCell>
                    )}
                    <TableCell className="text-sm">
                      {t(`methods.${p.method}`)}
                      {p.transactionRef && <div className="font-mono text-xs text-muted-foreground">{p.transactionRef}</div>}
                    </TableCell>
                    <TableCell className={cn("text-right font-medium tabular-nums", cancelled && "line-through")}>{money(p.amount)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8" aria-label={t("actions")}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setReceiptId(p.id)}>
                            <ReceiptText /> {t("receipt")}
                          </DropdownMenuItem>
                          {!cancelled && can("payment:cancel") && (
                            <DropdownMenuItem variant="destructive" onSelect={() => setCancelling(p)}>
                              <Ban /> {t("cancel")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </ListState>

      <ReceiptDialog paymentId={receiptId} onClose={() => setReceiptId(null)} />
      <CancelPaymentDialog payment={cancelling} onClose={() => setCancelling(null)} />
    </>
  );
}

function CancelPaymentDialog({ payment, onClose }: { payment: PaymentList["items"][number] | null; onClose: () => void }) {
  const t = useTranslations("school.finance.payments.cancelDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const money = useMoney();
  const cancel = useCancelPayment();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setReason("");
    setError(null);
    onClose();
  };
  const submit = () => {
    if (reason.trim().length < 3) return setError(t("reasonRequired"));
    cancel.mutate(
      { paymentId: payment!.id, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(t("done", { no: payment!.receiptNo }));
          close();
        },
        onError: (e) => setError(describeError(e)),
      },
    );
  };

  return (
    <Dialog open={!!payment} onOpenChange={(open) => !open && !cancel.isPending && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title", { no: payment?.receiptNo ?? "" })}</DialogTitle>
          <DialogDescription>{t("description", { amount: money(payment?.amount) })}</DialogDescription>
        </DialogHeader>
        <FormError message={error} />
        <div className="space-y-1.5">
          <Label htmlFor="cancel-reason" required>
            {t("reason")}
          </Label>
          <Input id="cancel-reason" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder={t("reasonPlaceholder")} autoFocus />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={cancel.isPending}>
            {tCommon("cancel")}
          </Button>
          <Button variant="destructive" onClick={submit} disabled={cancel.isPending}>
            <Ban /> {cancel.isPending ? t("working") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
