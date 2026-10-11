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
import { useDeleteNationalHoliday, type NationalHoliday } from "@/lib/platform/holidays";

export function DeleteHolidayDialog({
  holiday,
  onClose,
}: {
  holiday: NationalHoliday | null;
  onClose: () => void;
}) {
  const t = useTranslations("platform.holidays.deleteDialog");
  const tCommon = useTranslations("common");
  const name = useLocalizedName();
  const describeError = useErrorMessage();
  const remove = useDeleteNationalHoliday();

  const confirm = () => {
    if (!holiday) return;
    remove.mutate(holiday.id, {
      onSuccess: () => {
        toast.success(t("deleted", { name: name(holiday) }));
        onClose();
      },
      onError: (error) => toast.error(describeError(error)),
    });
  };

  return (
    <AlertDialog open={!!holiday} onOpenChange={(open) => !open && !remove.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name: holiday ? name(holiday) : "" })}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>{tCommon("cancel")}</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={remove.isPending}>
            {remove.isPending ? t("deleting") : t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
