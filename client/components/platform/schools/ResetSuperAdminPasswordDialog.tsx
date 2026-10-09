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
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  useResetSuperAdminPassword,
  type ResetSuperAdminPasswordResult,
  type SchoolDetail,
} from "@/lib/platform/schools";
import { TemporaryCredentials } from "./TemporaryCredentials";

type Props = {
  school: SchoolDetail;
  open: boolean;
  onClose: () => void;
};

/*
 * Confirm, then show the new temporary password. Like activation, the password
 * is only in this response, so once shown the dialog closes only from its button.
 */
export function ResetSuperAdminPasswordDialog({ school, open, onClose }: Props) {
  const t = useTranslations("platform.schoolDetail");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const reset = useResetSuperAdminPassword();
  const [result, setResult] = useState<ResetSuperAdminPasswordResult | null>(null);

  const close = () => {
    setResult(null);
    reset.reset();
    onClose();
  };

  const confirm = () =>
    reset.mutate(school.id, {
      onSuccess: setResult,
      onError: (error) => toast.error(describeError(error)),
    });

  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && !reset.isPending && close()}>
      <AlertDialogContent onEscapeKeyDown={(e) => result && e.preventDefault()}>
        {!result ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("confirm.resetPassword.title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("confirm.resetPassword.description", { email: school.superAdmin?.email ?? school.email })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={reset.isPending}>{tCommon("cancel")}</AlertDialogCancel>
              <Button variant="destructive" onClick={confirm} disabled={reset.isPending}>
                {reset.isPending ? t("confirm.working") : t("confirm.resetPassword.confirm")}
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("resetDone.title")}</AlertDialogTitle>
              <AlertDialogDescription>{t("resetDone.description")}</AlertDialogDescription>
            </AlertDialogHeader>
            <TemporaryCredentials
              subdomain={school.subdomain}
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
