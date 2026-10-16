"use client";

import { useTranslations } from "next-intl";
import { LoginCredentials } from "@/components/data/LoginCredentials";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export type FamilyCredentials = { name: string; phone: string; password: string };

/*
 * The family's login after a student was admitted with a new number: the password is the
 * number itself until the family changes it. The dialog closes only from its own button
 * (not Escape or a click outside), so it is not missed.
 */
export function FamilyCredentialsDialog({
  credentials,
  title,
  onClose,
}: {
  credentials: FamilyCredentials | null;
  title?: string;
  onClose: () => void;
}) {
  const t = useTranslations("school.students.credentials");
  const tCommon = useTranslations("common");

  return (
    <AlertDialog open={!!credentials}>
      <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()}>
        {credentials && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{title ?? t("title", { name: credentials.name })}</AlertDialogTitle>
              <AlertDialogDescription>{t("description")}</AlertDialogDescription>
            </AlertDialogHeader>
            {/* families log in on this school's own site */}
            <LoginCredentials
              loginUrl={`${window.location.origin}/login`}
              idLabel={tCommon("mobileNumber")}
              id={credentials.phone}
              password={credentials.password}
            />
            <AlertDialogFooter>
              <Button onClick={onClose}>{tCommon("close")}</Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
