import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SchoolSettingsPage } from "@/components/school/settings/SchoolSettingsPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.settings");
  return { title: t("title") };
}

// the super admin only: the page says so to anyone else (the server refuses them too)
export default function Page() {
  return <SchoolSettingsPage />;
}
