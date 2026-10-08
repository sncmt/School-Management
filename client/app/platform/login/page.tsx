import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { PlatformLoginForm } from "@/components/auth/PlatformLoginForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("platformLoginPageTitle") };
}

export default async function PlatformLoginPage() {
  const t = await getTranslations("auth");

  return (
    <AuthCard title={t("platformLoginTitle")} description={t("platformLoginDescription")}>
      <Suspense>
        <PlatformLoginForm />
      </Suspense>
    </AuthCard>
  );
}
