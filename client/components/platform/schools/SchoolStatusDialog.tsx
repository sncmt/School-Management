"use client";

import { useTranslations } from "next-intl";
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
import { useChangeSchoolStatus, type ChangeableSchoolStatus, type School } from "@/lib/platform/schools";

export type StatusAction = "reactivate" | "suspend" | "deactivate";

const TARGET: Record<StatusAction, ChangeableSchoolStatus> = {
  reactivate: "ACTIVE",
  suspend: "SUSPENDED",
  deactivate: "INACTIVE",
};

type Props = {
  school: School;
  action: StatusAction | null;
  onClose: () => void;
};

/** Confirms a status change; suspend and deactivate are shown as destructive. */
export function SchoolStatusDialog({ school, action, onClose }: Props) {
  const t = useTranslations("platform.schoolDetail");
  const tCommon = useTranslations("common");
  const name = useLocalizedName();
  const describeError = useErrorMessage();
  const changeStatus = useChangeSchoolStatus();

  const confirm = () => {
    if (!action) return;
    const status = TARGET[action];
    changeStatus.mutate(
      { schoolId: school.id, status },
      {
        onSuccess: () => {
          toast.success(t(`statusChanged.${status}`, { name: name(school) }));
          onClose();
        },
        onError: (error) => toast.error(describeError(error)),
      },
    );
  };

  return (
    <AlertDialog open={!!action} onOpenChange={(open) => !open && !changeStatus.isPending && onClose()}>
      <AlertDialogContent>
        {action && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{t(`confirm.${action}.title`, { name: name(school) })}</AlertDialogTitle>
              <AlertDialogDescription>{t(`confirm.${action}.description`)}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={changeStatus.isPending}>{tCommon("cancel")}</AlertDialogCancel>
              <Button
                variant={action === "reactivate" ? "default" : "destructive"}
                onClick={confirm}
                disabled={changeStatus.isPending}
              >
                {changeStatus.isPending ? t("confirm.working") : t(`confirm.${action}.confirm`)}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
