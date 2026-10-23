import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { FeesPage } from "@/components/school/fees/FeesPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.fees");
  return { title: t("title") };
}

// staff with a fee permission, and family logins (their children's payments): the page decides what each sees
export default function SchoolFeesPage() {
  return (
    // the page reads ?student=
    <Suspense>
      <FeesPage />
    </Suspense>
  );
}
