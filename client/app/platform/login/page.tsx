import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthBrandCard } from "@/components/auth/AuthBrandCard";
import { PlatformLoginForm } from "@/components/auth/PlatformLoginForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("platformLoginPageTitle") };
}

export default async function PlatformLoginPage() {
  const [t, tCommon] = await Promise.all([getTranslations("auth"), getTranslations("common")]);

  return (
    <AuthBrandCard icon={<ShieldCheck />} title={tCommon("appName")} subtitle={t("platformLoginDescription")}>
      <Suspense>
        <PlatformLoginForm />
      </Suspense>
    </AuthBrandCard>
  );
}
