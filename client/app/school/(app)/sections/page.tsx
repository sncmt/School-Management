import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequirePermission } from "@/components/auth/Can";
import { SectionsList } from "@/components/school/sections/SectionsList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.sections");
  return { title: t("title") };
}

export default function SectionsPage() {
  return (
    <RequirePermission permission="section:view">
      <SectionsList />
    </RequirePermission>
  );
}
