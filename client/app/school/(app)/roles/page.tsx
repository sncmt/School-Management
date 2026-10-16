import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RolesPage } from "@/components/school/roles/RolesPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.roles");
  return { title: t("title") };
}

// the super admin only: the page itself says so to anyone else (the server refuses them too)
export default function SchoolRolesPage() {
  return <RolesPage />;
}
