import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { SchoolsList } from "@/components/platform/schools/SchoolsList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("platform.schools");
  return { title: t("title") };
}

export default function SchoolsPage() {
  // the list reads its filters from the URL (useSearchParams)
  return (
    <Suspense>
      <SchoolsList />
    </Suspense>
  );
}
