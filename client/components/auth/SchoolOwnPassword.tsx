"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMe, useOwnPasswordMode } from "@/lib/auth/hooks";
import { authRoutes } from "@/lib/auth/routes";
import { AuthCard } from "./AuthCard";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { SetPasswordForm } from "./SetPasswordForm";

/*
 * A school user's own password: a guardian types the current one; the super admin
 * confirms with a code sent to their email; anyone else asks the super admin.
 */
export function SchoolOwnPassword() {
  const t = useTranslations("auth.changePassword");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { data: me } = useMe();
  const mode = useOwnPasswordMode();
  const back = (
    <button className="underline underline-offset-4" onClick={() => router.back()}>
      {tCommon("cancel")}
    </button>
  );

  if (mode === "CURRENT") return <ChangePasswordForm session="SCHOOL" />;

  if (mode === "EMAIL_CODE" && me) {
    return (
      <AuthCard title={t("title")} description={t("descriptionByEmail")} footer={back}>
        <SetPasswordForm
          userId={me.user.id}
          onDone={() => {
            toast.success(t("success"));
            router.replace(authRoutes.SCHOOL.home);
          }}
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("title")} description={t("askSuperAdmin")}>
      <Button variant="outline" className="w-full" onClick={() => router.replace(authRoutes.SCHOOL.home)}>
        {t("backHome")}
      </Button>
    </AuthCard>
  );
}
