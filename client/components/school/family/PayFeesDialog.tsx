"use client";

import { CreditCard, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useMoney } from "@/lib/school/finance";
import { usePayOptions, useStartPayment } from "@/lib/school/onlinePayment";
import { useFeeLabel } from "../finance/shared";

/** A child's fees owed now, ticked to pay; then on to SSLCommerz's payment page. */
export function PayFeesDialog({ student, onClose }: { student: { id: string; name: string } | null; onClose: () => void }) {
  const t = useTranslations("school.family.pay");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const money = useMoney();
  const feeLabel = useFeeLabel();
  const options = usePayOptions(student?.id ?? null);
  const start = useStartPayment();
  const [picked, setPicked] = useState<Set<string>>(new Set());

  // every fee owed is ticked to start with
  useEffect(() => {
    if (options.data) setPicked(new Set(options.data.fees.map((f) => f.id)));
  }, [options.data]);

  const fees = options.data?.fees ?? [];
  const feeTotal = fees.filter((f) => picked.has(f.id)).reduce((sum, f) => sum + Number(f.remaining), 0);
  const percent = Number(options.data?.chargePercent ?? 0);
  const charge = Math.round(feeTotal * percent) / 100;
  const total = feeTotal + charge;

  const pay = () =>
    student &&
    start.mutate(
      { studentId: student.id, feeIds: [...picked] },
      {
        // to SSLCommerz: it sends the guardian back to the result page
        onSuccess: (r) => window.location.assign(r.gatewayUrl),
        onError: (e) => toast.error(describeError(e)),
      },
    );

  return (
    <Dialog open={!!student} onOpenChange={(o) => !o && !start.isPending && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{student?.name}</DialogDescription>
        </DialogHeader>
        {options.isPending ? (
          <Skeleton className="h-40" />
        ) : options.error ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{describeError(options.error)}</p>
        ) : !options.data?.enabled ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("off")}</p>
        ) : fees.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("nothing")}</p>
        ) : (
          <div className="space-y-4">
            <ul className="divide-y rounded-md border">
              {fees.map((f) => (
                <li key={f.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={picked.has(f.id)}
                      onChange={(e) =>
                        setPicked((p) => {
                          const next = new Set(p);
                          if (e.target.checked) next.add(f.id);
                          else next.delete(f.id);
                          return next;
                        })
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">{feeLabel(f)}</span>
                    <span className="font-medium tabular-nums">{money(f.remaining)}</span>
                  </label>
                </li>
              ))}
            </ul>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("fees")}</dt>
                <dd className="tabular-nums">{money(feeTotal)}</dd>
              </div>
              {percent > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("charge", { percent })}</dt>
                  <dd className="tabular-nums">{money(charge)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t pt-1 text-base font-semibold">
                <dt>{t("total")}</dt>
                <dd className="tabular-nums">{money(total)}</dd>
              </div>
            </dl>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Lock className="mt-0.5 size-3.5 shrink-0" /> {t("secure")}
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={start.isPending}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={pay} disabled={!options.data?.enabled || picked.size === 0 || total < 10 || start.isPending}>
            <CreditCard /> {start.isPending ? t("starting") : t("pay", { amount: money(total) })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
