"use client";

import { CreditCard } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StandingBadge } from "@/components/platform/subscriptions/StandingBadge";
import { useSchoolMe } from "@/lib/auth/hooks";
import { usePeriodLabel } from "@/lib/platform/subscriptions";
import { useMySubscription } from "@/lib/school/subscription";
import { Panel } from "../dashboard/panels";

/**
 * The school's subscription to the platform (super admin only): its plan, where it stands, and
 * the full history of payments the platform has recorded, newest first.
 */
export function SubscriptionPage() {
  const t = useTranslations("school.subscription");
  const me = useSchoolMe();

  if (me && !me.isSuperAdmin) return <p className="py-12 text-center text-sm text-muted-foreground">{t("superAdminOnly")}</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="space-y-1">
        <h1 className="page-title">{t("title")}</h1>
        <p className="page-subtitle">{t("description")}</p>
      </div>
      {me && <SubscriptionPanel />}
    </div>
  );
}

function SubscriptionPanel() {
  const t = useTranslations("school.subscription");
  const tPlans = useTranslations("platform.subscriptions.plans");
  const period = usePeriodLabel();
  const format = useFormatter();
  const { data, isPending, isError } = useMySubscription(true);

  return (
    <Panel title={t("history")} action={data && <StandingBadge currentPaid={data.currentPaid} />}>
      {isPending ? (
        <Skeleton className="h-32 w-full" />
      ) : isError ? (
        <p className="text-sm text-muted-foreground">{t("loadFailed")}</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-x-10 gap-y-2">
            <Figure label={t("plan")} value={data.plan ? tPlans(data.plan) : "—"} />
            <Figure label={t("paidThrough")} value={data.paidThrough ? period(data.paidThrough) : "—"} />
            <Figure label={t("count")} value={format.number(data.payments.length)} />
          </div>

          {data.payments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              <CreditCard className="size-7 text-muted-foreground/50" />
              {t("none")}
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">{t("columns.period")}</TableHead>
                    <TableHead>{t("columns.plan")}</TableHead>
                    <TableHead className="text-right">{t("columns.amount")}</TableHead>
                    <TableHead className="pr-4">{t("columns.paidOn")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="py-2.5 pl-4 font-medium">{period(p)}</TableCell>
                      <TableCell className="py-2.5">{tPlans(p.plan)}</TableCell>
                      <TableCell className="py-2.5 text-right tabular-nums">{p.amount ? `৳${format.number(Number(p.amount))}` : "—"}</TableCell>
                      <TableCell className="py-2.5 pr-4">{format.dateTime(new Date(p.paidOn), { dateStyle: "medium", timeZone: "UTC" })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
        </div>
      )}
    </Panel>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}
