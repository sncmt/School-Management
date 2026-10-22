"use client";

import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  usePeriodLabel,
  useRemoveSubscriptionPayment,
  useSchoolSubscription,
  useSetSubscriptionPlan,
  type SubscriptionPayment,
  type SubscriptionPlan,
} from "@/lib/platform/subscriptions";
import { PlanPicker } from "./PaymentFields";
import { RecordPaymentDialog } from "./RecordPaymentDialog";
import { StandingBadge } from "./StandingBadge";

/** One school's plan, where it stands, and every payment recorded (record more, or remove a mistake). */
export function SchoolSubscriptionView({ schoolId }: { schoolId: string }) {
  const t = useTranslations("platform.subscriptions");
  const name = useLocalizedName();
  const period = usePeriodLabel();
  const format = useFormatter();
  const describeError = useErrorMessage();
  const { data, isPending, isError, error } = useSchoolSubscription(schoolId);
  const setPlan = useSetSubscriptionPlan();
  const [recording, setRecording] = useState(false);
  const [removing, setRemoving] = useState<SubscriptionPayment | null>(null);
  const remove = useRemoveSubscriptionPayment();

  if (isPending) return <Skeleton className="h-96 rounded-xl" />;
  if (isError) return <p className="text-sm text-muted-foreground">{describeError(error)}</p>;

  const changePlan = (plan: SubscriptionPlan) =>
    plan !== data.plan &&
    setPlan.mutate({ schoolId, plan }, { onSuccess: () => toast.success(t("planChanged")), onError: (e) => toast.error(describeError(e)) });

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/subscriptions">
          <ArrowLeft /> {t("back")}
        </Link>
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{name(data.school)}</h1>
          <p className="text-sm text-muted-foreground">
            {data.school.subdomain}
            {data.school.activationDate && ` · ${t("activatedOn", { date: format.dateTime(new Date(data.school.activationDate), { dateStyle: "medium" }) })}`}
          </p>
        </div>
        <Button onClick={() => setRecording(true)}>
          <Plus /> {t("record")}
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        <section className="h-fit space-y-4 rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("plan")}</p>
            <PlanPicker value={data.plan} onChange={changePlan} disabled={setPlan.isPending} />
            <p className="text-xs text-muted-foreground">{t("planChangeHint")}</p>
          </div>
          <dl className="space-y-2 border-t pt-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{t("columns.current")}</dt>
              <dd>
                <StandingBadge currentPaid={data.currentPaid} />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{t("columns.paidThrough")}</dt>
              <dd className="font-medium">{data.paidThrough ? period(data.paidThrough) : "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
          <Table>
            <TableHeader>
              <TableRow>
                {(["period", "plan", "amount", "paidOn", "note"] as const).map((c) => (
                  <TableHead key={c} className="first:pl-5">
                    {t(`payments.${c}`)}
                  </TableHead>
                ))}
                <TableHead className="w-12 pr-5">
                  <span className="sr-only">{t("payments.remove")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.payments.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">
                    {t("payments.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                data.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="py-3 pl-5 font-medium">{period(p)}</TableCell>
                    <TableCell className="py-3">{t(`plans.${p.plan}`)}</TableCell>
                    <TableCell className="py-3 tabular-nums">{p.amount ? `৳${format.number(Number(p.amount))}` : "—"}</TableCell>
                    <TableCell className="py-3">{format.dateTime(new Date(p.paidOn), { dateStyle: "medium", timeZone: "UTC" })}</TableCell>
                    <TableCell className="max-w-56 py-3 whitespace-normal text-muted-foreground">{p.note || "—"}</TableCell>
                    <TableCell className="py-3 pr-5">
                      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-destructive" onClick={() => setRemoving(p)} aria-label={t("payments.remove")}>
                        <Trash2 />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </section>
      </div>

      <RecordPaymentDialog open={recording} school={{ ...data.school, subscriptionPlan: data.plan }} onClose={() => setRecording(false)} />

      <AlertDialog open={!!removing} onOpenChange={(open) => !open && !remove.isPending && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeTitle", { period: removing ? period(removing) : "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("removeText")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (!removing) return;
                remove.mutate(removing.id, {
                  onSuccess: () => {
                    toast.success(t("removed"));
                    setRemoving(null);
                  },
                  onError: (err) => toast.error(describeError(err)),
                });
              }}
            >
              {t("payments.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

