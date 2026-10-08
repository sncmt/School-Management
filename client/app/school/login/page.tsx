import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { SchoolLoginForm } from "@/components/auth/SchoolLoginForm";
import { pickName } from "@/lib/i18n/names";
import { getCurrentSchoolSite } from "@/lib/site.server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("schoolLoginTitle") };
}

export default async function SchoolLoginPage() {
  const [t, locale, school] = await Promise.all([
    getTranslations("auth"),
    getLocale(),
    getCurrentSchoolSite(), // the layout has already 404'd a missing school
  ]);

  return (
    <AuthCard
      title={t("schoolLoginTitle")}
      description={school ? pickName(school, locale) : null}
      logo={
        school?.logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- school logos can be on any host
          <img src={school.logo} alt="" className="mb-2 size-12 rounded object-contain" />
        ) : null
      }
    >
      <Suspense>
        <SchoolLoginForm />
      </Suspense>
    </AuthCard>
  );
}
