"use client";

import { CreditCard } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { StandingBadge } from "@/components/platform/subscriptions/StandingBadge";
import { usePeriodLabel } from "@/lib/platform/subscriptions";
import { useMySubscription } from "@/lib/school/subscription";
import { Panel } from "./panels";

const SHOWN = 6;

/** The school's subscription to the platform (super admin only): its plan, where it stands, the payments recorded. */
export function SubscriptionPanel() {
  const t = useTranslations("school.home.subscription");
  const tPlans = useTranslations("platform.subscriptions.plans");
  const period = usePeriodLabel();
  const format = useFormatter();
  const { data, isPending, isError } = useMySubscription(true);
  const [all, setAll] = useState(false);

  return (
    <Panel title={t("title")} action={data && <StandingBadge currentPaid={data.currentPaid} />}>
      {isPending ? (
        <Skeleton className="h-24 w-full" />
      ) : isError ? (
        <p className="text-sm text-muted-foreground">{t("loadFailed")}</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <div>
              <div className="text-xs text-muted-foreground">{t("plan")}</div>
              <div className="text-lg font-semibold">{data.plan ? tPlans(data.plan) : "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t("paidThrough")}</div>
              <div className="text-lg font-semibold">{data.paidThrough ? period(data.paidThrough) : "—"}</div>
            </div>
          </div>

          {data.payments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
              <CreditCard className="size-7 text-muted-foreground/50" />
              {t("none")}
            </div>
          ) : (
            <>
              <ul className="divide-y rounded-lg border">
                {(all ? data.payments : data.payments.slice(0, SHOWN)).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <div>
                      <div className="font-medium">{period(p)}</div>
                      <div className="text-xs text-muted-foreground">
                        {t("paidOn", { date: format.dateTime(new Date(p.paidOn), { dateStyle: "medium", timeZone: "UTC" }) })}
                      </div>
                    </div>
                    {p.amount && <span className="font-medium tabular-nums">৳{format.number(Number(p.amount))}</span>}
                  </li>
                ))}
              </ul>
              {data.payments.length > SHOWN && (
                <button type="button" onClick={() => setAll((v) => !v)} className="text-xs font-medium text-muted-foreground hover:text-foreground">
                  {all ? t("showFewer") : t("showAll", { count: data.payments.length })}
                </button>
              )}
            </>
          )}
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
        </div>
      )}
    </Panel>
  );
}
