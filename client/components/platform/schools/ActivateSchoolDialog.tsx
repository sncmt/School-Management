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
import { TemporaryCredentials } from "./TemporaryCredentials";

type Props = {
  school: School | null;
  onClose: () => void;
};

/*
 * Confirm, then show the super admin's login details. The temporary password
 * comes back only in this response, so once it is shown the dialog closes only
 * from its own button (not Escape or a click outside). Subscription payments
 * aren't taken here: they are recorded afterwards on the Subscriptions page.
 */
export function ActivateSchoolDialog({ school, onClose }: Props) {
  const t = useTranslations("platform.schools.activate");
  const tCommon = useTranslations("common");
  const tPlans = useTranslations("platform.subscriptions.plans");
  const name = useLocalizedName();
  const describeError = useErrorMessage();
  const activate = useActivateSchool();
  const [result, setResult] = useState<ActivateSchoolResult | null>(null);

  const close = () => {
    setResult(null);
    activate.reset();
    onClose();
  };

  const confirm = () => {
    if (!school) return;
    activate.mutate(school.id, {
      onSuccess: setResult,
      onError: (error) => toast.error(describeError(error)),
    });
  };

  return (
    <AlertDialog open={!!school} onOpenChange={(open) => !open && !activate.isPending && close()}>
      <AlertDialogContent onEscapeKeyDown={(e) => result && e.preventDefault()}>
        {!result ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("title", { name: school ? name(school) : "" })}</AlertDialogTitle>
              <AlertDialogDescription>{t("description", { email: school?.email ?? "" })}</AlertDialogDescription>
            </AlertDialogHeader>
            <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
              {school?.subscriptionPlan
                ? t("subscriptionNote", { plan: tPlans(school.subscriptionPlan) })
                : t("subscriptionNoteNoPlan")}
            </p>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={activate.isPending}>{tCommon("cancel")}</AlertDialogCancel>
              <Button onClick={confirm} disabled={activate.isPending}>
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
