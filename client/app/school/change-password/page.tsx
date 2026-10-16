import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { SchoolOwnPassword } from "@/components/auth/SchoolOwnPassword";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.changePassword");
  return { title: t("pageTitle") };
}

export default function SchoolChangePasswordPage() {
  return (
    <AuthGuard session="SCHOOL">
      <Suspense>
        <SchoolOwnPassword />
      </Suspense>
    </AuthGuard>
  );
}
