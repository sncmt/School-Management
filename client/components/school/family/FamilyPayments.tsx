"use client";

import { Clock, ReceiptText, TriangleAlert, Wallet } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useFamilyPayments, useFamilyRole, type FamilyPaymentAttempt, type FamilyPaymentItem } from "@/lib/school/family";
import { useMoney } from "@/lib/school/finance";
import { cn } from "@/lib/utils";
import { Pager } from "../finance/collect/PaymentsTab";
import { ReceiptDialog } from "../finance/collect/ReceiptDialog";

const ALL = "all";
const PAGE_SIZE = 20;

/** The family login's fee payments: each receipt (office or online) to view and print. */
export function FamilyPayments() {
  const t = useTranslations("school.family.payments");
  const { ready, isFamily } = useFamilyRole();
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const [studentId, setStudentId] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const list = useFamilyPayments({ page, limit: PAGE_SIZE, ...(studentId !== ALL ? { studentId } : {}) }, ready && isFamily);

  if (!ready || (isFamily && list.isPending)) return <Skeleton className="h-72 rounded-xl" />;
  if (!isFamily) return <p className="rounded-2xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">{t("familyOnly")}</p>;
  if (list.error) return <p className="rounded-2xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">{describeError(list.error)}</p>;

  const data = list.data!;
  const childName = new Map(data.children.map((c) => [c.id, name(c)]));
  const choose = (id: string) => {
    setStudentId(id);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {data.children.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("child")}>
          {[{ id: ALL, label: t("allChildren") }, ...data.children.map((c) => ({ id: c.id, label: name(c) }))].map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={studentId === c.id}
              onClick={() => choose(c.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                studentId === c.id ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {data.attempts.length > 0 && <Attempts items={data.attempts} childName={data.children.length > 1 ? childName : null} />}

      <section className={cn("overflow-hidden rounded-2xl border border-border/70 bg-card", list.isFetching && "opacity-60")}>
        <h2 className="border-b px-5 py-3 text-sm font-semibold">{t("receipts")}</h2>
        {data.items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="divide-y">
            {data.items.map((p) => (
              <ReceiptRow key={p.id} item={p} childName={data.children.length > 1 ? childName.get(p.studentId) : undefined} onOpen={() => setReceiptId(p.id)} />
            ))}
          </ul>
        )}
      </section>
      {data.meta.totalPages > 1 && <Pager page={page} totalPages={data.meta.totalPages} onPage={setPage} />}

      <ReceiptDialog paymentId={receiptId} onClose={() => setReceiptId(null)} family />
    </div>
  );
}

function ReceiptRow({ item, childName, onOpen }: { item: FamilyPaymentItem; childName?: string; onOpen: () => void }) {
  const t = useTranslations("school.family.payments");
  const tMethods = useTranslations("school.finance.payments.methods");
  const format = useFormatter();
  const money = useMoney();
  const cancelled = item.status === "CANCELLED";
  const refund = item.online && Number(item.online.refundAmount) > 0 ? item.online : null;

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-medium">{item.receiptNo}</span>
          {cancelled && (
            <Badge variant="outline" className="border-rose-300 text-rose-700 dark:text-rose-400">
              {t("cancelled")}
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {format.dateTime(new Date(item.paidAt), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" })} · {tMethods(item.method)}
          {childName && ` · ${childName}`}
        </div>
        {refund && (
          <div className={cn("mt-1 text-xs font-medium", refund.refundedAt ? "text-muted-foreground" : "text-[#8a5a00] dark:text-[#fac85a]")}>
            {refund.refundedAt ? t("refunded", { amount: money(refund.refundAmount) }) : t("toRefund", { amount: money(refund.refundAmount) })}
          </div>
        )}
      </div>
      <div className={cn("text-right font-semibold tabular-nums", cancelled && "text-muted-foreground line-through")}>{money(item.amount)}</div>
      <Button variant="outline" size="sm" onClick={onOpen}>
        <ReceiptText /> {t("receipt")}
      </Button>
    </li>
  );
}

/* Online payments that are not a receipt: still being checked, failed lately, or paid when nothing was owed. */
function Attempts({ items, childName }: { items: FamilyPaymentAttempt[]; childName: Map<string, string> | null }) {
  const t = useTranslations("school.family.payments");
  const format = useFormatter();
  const money = useMoney();

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <h2 className="border-b px-5 py-3 text-sm font-semibold">{t("online")}</h2>
      <ul className="divide-y">
        {items.map((a) => {
          const Icon = a.status === "PENDING" ? Clock : a.status === "PAID" ? Wallet : TriangleAlert;
          return (
            <li key={a.tranId} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3">
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{t(`attempt.${a.status}`)}</div>
                <div className="text-xs text-muted-foreground">
                  {format.dateTime(new Date(a.createdAt), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" })}
                  {childName && ` · ${childName.get(a.studentId) ?? ""}`}
                  {a.status === "PAID" && Number(a.refundAmount) > 0 && ` · ${a.refundedAt ? t("refunded", { amount: money(a.refundAmount) }) : t("toRefund", { amount: money(a.refundAmount) })}`}
                </div>
              </div>
              <span className="font-semibold tabular-nums">{money(a.total)}</span>
              <Link href={`/fees/payment/${a.tranId}`} className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">
                {t("details")}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
