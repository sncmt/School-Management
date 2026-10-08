import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.changePassword");
  return { title: t("pageTitle") };
}

export default function PlatformChangePasswordPage() {
  return (
    <AuthGuard session="PLATFORM" allowPasswordChange>
      <Suspense>
        <ChangePasswordForm session="PLATFORM" />
      </Suspense>
    </AuthGuard>
  );
}
