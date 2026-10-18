import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DashboardPage } from "@/components/school/dashboard/DashboardPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("dashboard") };
}

export default function SchoolDashboardPage() {
  return <DashboardPage />;
}
