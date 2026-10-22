"use client";

import { CircleCheck, CircleX, Clock, Home, ReceiptText, TriangleAlert } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useMoney } from "@/lib/school/finance";
import { usePayResult } from "@/lib/school/onlinePayment";
import { cn } from "@/lib/utils";
import { ReceiptDialog } from "../finance/collect/ReceiptDialog";

/** Where SSLCommerz sends the guardian back: paid (with the receipt), not paid, or still waiting. */
export function PaymentResult({ tranId }: { tranId: string }) {
  const t = useTranslations("school.family.payResult");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const name = useLocalizedName();
  const money = useMoney();
  const { data, isPending, error } = usePayResult(tranId);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  if (isPending) return <Skeleton className="mx-auto h-72 max-w-lg rounded-xl" />;
  if (error) return <p className="mx-auto max-w-lg rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{describeError(error)}</p>;

  const paid = data.status === "PAID";
  const waiting = data.status === "PENDING";
  const Icon = paid ? CircleCheck : waiting ? Clock : CircleX;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <section className="space-y-4 rounded-xl border bg-card p-6 text-center shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
        <Icon className={cn("mx-auto size-12", paid ? "text-[#0ca30c]" : waiting ? "text-[#fab219]" : "text-[#d03b3b]")} />
        <div>
          <h1 className="text-xl font-semibold">{t(`title.${data.status}`)}</h1>
          <p className="text-sm text-muted-foreground">{t(`hint.${data.status}`)}</p>
        </div>
        <dl className="mx-auto max-w-xs space-y-1 text-left text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("student")}</dt>
            <dd className="font-medium">{name(data.student)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t("amount")}</dt>
            <dd className="font-medium tabular-nums">{money(data.total)}</dd>
          </div>
          {Number(data.charge) > 0 && (
            <div className="flex justify-between gap-4 text-xs">
              <dt className="text-muted-foreground">{t("ofWhichCharge")}</dt>
              <dd className="tabular-nums">{money(data.charge)}</dd>
            </div>
          )}
          {data.payment && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("receipt")}</dt>
              <dd className="font-mono font-medium">{data.payment.receiptNo}</dd>
            </div>
          )}
          {data.paidAt && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t("paidAt")}</dt>
              <dd>{format.dateTime(new Date(data.paidAt), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" })}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4 text-xs">
            <dt className="text-muted-foreground">{t("reference")}</dt>
            <dd className="font-mono">{data.tranId}</dd>
          </div>
        </dl>
        {paid && Number(data.refundAmount) > 0 && (
          <p className="flex items-start gap-2 rounded-lg bg-[#fab219]/15 p-3 text-left text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[#8a5a00]" />
            {t("refund", { amount: money(data.refundAmount) })}
          </p>
        )}
      </section>
      <div className="flex flex-wrap justify-center gap-2">
        {data.payment && (
          <Button onClick={() => setReceiptId(data.payment!.id)}>
            <ReceiptText /> {t("viewReceipt")}
          </Button>
        )}
        <Button variant="outline" asChild>
          <Link href="/fees">{t("allPayments")}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <Home /> {t("home")}
          </Link>
        </Button>
      </div>
      <ReceiptDialog paymentId={receiptId} onClose={() => setReceiptId(null)} family />
    </div>
  );
}
