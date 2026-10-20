"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useActivateSchool, type ActivateSchoolResult, type School } from "@/lib/platform/schools";
import type { SubscriptionPlan } from "@/lib/platform/subscriptions";
import { newPaymentDraft, PaymentFields, paymentBody, PlanPicker, type PaymentDraft } from "../subscriptions/PaymentFields";
import { TemporaryCredentials } from "./TemporaryCredentials";

type Props = {
  school: School | null;
  onClose: () => void;
};

/*
 * Confirm, then show the super admin's login details. The temporary password
 * comes back only in this response, so once it is shown the dialog closes only
 * from its own button (not Escape or a click outside).
 */
export function ActivateSchoolDialog({ school, onClose }: Props) {
  const t = useTranslations("platform.schools.activate");
  const tCommon = useTranslations("common");
  const name = useLocalizedName();
  const describeError = useErrorMessage();
  const activate = useActivateSchool();
  const [result, setResult] = useState<ActivateSchoolResult | null>(null);
  // the plan and the first month's or year's payment, paid at activation
  const [plan, setPlan] = useState<SubscriptionPlan>("MONTHLY");
  const [draft, setDraft] = useState<PaymentDraft>(() => newPaymentDraft());
  const [shownFor, setShownFor] = useState<string | null>(null);
  // a fresh form for each school opened (the amount from its monthly fee)
  if (school && school.id !== shownFor) {
    setShownFor(school.id);
    setPlan("MONTHLY");
    setDraft(newPaymentDraft(school.monthlyFee));
  }
  const payment = paymentBody(plan, draft);

  const close = () => {
    setResult(null);
    activate.reset();
    setShownFor(null);
    onClose();
  };

  const confirm = () => {
    if (!school || !payment) return;
    activate.mutate(
      { schoolId: school.id, plan, payment },
      {
        onSuccess: setResult,
        onError: (error) => toast.error(describeError(error)),
      },
    );
  };

  return (
    <AlertDialog open={!!school} onOpenChange={(open) => !open && !activate.isPending && close()}>
      <AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" onEscapeKeyDown={(e) => result && e.preventDefault()}>
        {!result ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("title", { name: school ? name(school) : "" })}</AlertDialogTitle>
              <AlertDialogDescription>{t("description", { email: school?.email ?? "" })}</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">{t("subscription")}</p>
                <p className="text-xs text-muted-foreground">{t("subscriptionHint")}</p>
              </div>
              <PlanPicker value={plan} onChange={setPlan} disabled={activate.isPending} />
              <PaymentFields plan={plan} draft={draft} onChange={setDraft} />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={activate.isPending}>{tCommon("cancel")}</AlertDialogCancel>
              <Button onClick={confirm} disabled={activate.isPending || !payment}>
                {activate.isPending ? t("activating") : t("confirm")}
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("doneTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("doneDescription")}</AlertDialogDescription>
            </AlertDialogHeader>
            <TemporaryCredentials
              subdomain={result.school.subdomain}
              email={result.superAdmin.email}
              password={result.temporaryPassword}
            />
            <AlertDialogFooter>
              <Button onClick={close}>{tCommon("close")}</Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
