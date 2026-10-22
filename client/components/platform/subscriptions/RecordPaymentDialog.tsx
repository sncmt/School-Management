"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { planFee, useAddSubscriptionPayment, type PayingSchool, type SubscriptionPlan } from "@/lib/platform/subscriptions";
import { newPaymentDraft, PaymentFields, paymentBody, PlanPicker, type PaymentDraft } from "./PaymentFields";

/**
 * Records one paid period for a school (from its subscription page or its own page). The plan is
 * the school's; a school without one chooses it here. The amount starts at the plan's fee after
 * the school's discount.
 */
export function RecordPaymentDialog({ open, school, onClose }: { open: boolean; school: PayingSchool; onClose: () => void }) {
  const t = useTranslations("platform.subscriptions");
  const describeError = useErrorMessage();
  const add = useAddSubscriptionPayment();
  const startPlan = school.subscriptionPlan ?? "MONTHLY";
  const [plan, setPlan] = useState<SubscriptionPlan>(startPlan);
  const [draft, setDraft] = useState<PaymentDraft>(() => newPaymentDraft(planFee(school, startPlan)));
  const [wasOpen, setWasOpen] = useState(false);
  // a fresh form each time it opens
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPlan(startPlan);
      setDraft(newPaymentDraft(planFee(school, startPlan)));
    }
  }
  const body = paymentBody(plan, draft);

  // another plan: its own fee
  const choosePlan = (next: SubscriptionPlan) => {
    setPlan(next);
    setDraft((d) => ({ ...d, amount: planFee(school, next) }));
  };

  const save = () =>
    body &&
    add.mutate(
      { schoolId: school.id, body: { ...body, ...(school.subscriptionPlan ? {} : { plan }) } },
      {
        onSuccess: () => {
          toast.success(t("recorded"));
          onClose();
        },
        onError: (e) => toast.error(describeError(e)),
      },
    );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !add.isPending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("record")}</DialogTitle>
          <DialogDescription>{t(school.subscriptionPlan ? "recordHint" : "recordHintNoPlan")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!school.subscriptionPlan && <PlanPicker value={plan} onChange={choosePlan} disabled={add.isPending} />}
          <PaymentFields plan={plan} draft={draft} onChange={setDraft} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={add.isPending}>
            {t("cancel")}
          </Button>
          <Button onClick={save} disabled={!body || add.isPending}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
