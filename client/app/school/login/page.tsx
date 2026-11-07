import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, GraduationCap, Megaphone } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthBrandCard } from "@/components/auth/AuthBrandCard";
import { SchoolLoginForm } from "@/components/auth/SchoolLoginForm";
import { Button } from "@/components/ui/button";
import { publicSchoolRoutes } from "@/lib/auth/routes";
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
  const name = school ? pickName(school, locale) : "";
  // the name in the other language, under the main one
  const otherName = school ? (locale === "bn" ? school.nameEn : school.nameBn) : null;

  return (
    <AuthBrandCard
      logo={school?.logo}
      icon={<GraduationCap />}
      title={name}
      subtitle={otherName && otherName !== name ? otherName : null}
      back={
        <Button asChild variant="outline" className="bg-background shadow-sm">
          <Link href={publicSchoolRoutes.home}>
            <ArrowLeft /> {t("backToHome")}
          </Link>
        </Button>
      }
      footer={
        <Link href={publicSchoolRoutes.notices} className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
          <Megaphone className="size-4" /> {t("noticeBoardLink")}
        </Link>
      }
    >
      <Suspense>
        <SchoolLoginForm />
      </Suspense>
    </AuthBrandCard>
  );
}
