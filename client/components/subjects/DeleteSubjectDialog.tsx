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
import { useDeleteSubject, type Subject, type SubjectScope } from "@/lib/subjects";

/** Confirms deleting a subject. The server refuses while it's used by a class or has papers. */
export function DeleteSubjectDialog({
  scope,
  subject,
  onClose,
}: {
  scope: SubjectScope;
  subject: Subject | null;
  onClose: () => void;
}) {
  const t = useTranslations("platform.subjects.deleteDialog");
  const tSchool = useTranslations("school.subjects");
  const tCommon = useTranslations("common");
  const name = useLocalizedName();
  const describeError = useErrorMessage();
  const remove = useDeleteSubject(scope);

  const confirm = () => {
    if (!subject) return;
    remove.mutate(subject.id, {
      onSuccess: () => {
        toast.success(t("deleted", { name: name(subject) }));
        onClose();
      },
      onError: (error) => toast.error(describeError(error)),
    });
  };

  return (
    <AlertDialog open={!!subject} onOpenChange={(open) => !open && !remove.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name: subject ? name(subject) : "" })}</AlertDialogTitle>
          <AlertDialogDescription>
            {scope === "PLATFORM" ? t("description") : tSchool("deleteDescription")}
          </AlertDialogDescription>
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
