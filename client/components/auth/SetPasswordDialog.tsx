"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SetPasswordForm } from "./SetPasswordForm";

/** The school super admin changing someone's password (a teacher, a family login…). */
export function SetPasswordDialog({
  account,
  onClose,
}: {
  // the account, and how it logs in (shown so the right one is changed)
  account: { userId: string; name: string; login: string } | null;
  onClose: () => void;
}) {
  const t = useTranslations("auth.setPassword");
  return (
    <Dialog open={!!account} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title", { name: account?.name ?? "" })}</DialogTitle>
          <DialogDescription>{t("description", { login: account?.login ?? "" })}</DialogDescription>
        </DialogHeader>
        {account && (
          <SetPasswordForm
            key={account.userId}
            userId={account.userId}
            onCancel={onClose}
            onDone={() => {
              toast.success(t("done", { name: account.name }));
              onClose();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
