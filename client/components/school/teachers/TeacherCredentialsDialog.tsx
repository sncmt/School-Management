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

export type TeacherCredentials = { name: string; phone: string; password: string };

/*
 * A teacher's login details after they were added or their password was reset. The
 * temporary password exists only in that response, so the dialog closes only from its
 * own button (not Escape or a click outside).
 */
export function TeacherCredentialsDialog({
  credentials,
  title,
  onClose,
}: {
  credentials: TeacherCredentials | null;
  title?: string;
  onClose: () => void;
}) {
  const t = useTranslations("school.teachers.credentials");
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
            {/* teachers log in on this school's own site */}
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
