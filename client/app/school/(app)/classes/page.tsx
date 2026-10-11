import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequirePermission } from "@/components/auth/Can";
import { ClassesList } from "@/components/school/classes/ClassesList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.classes");
  return { title: t("title") };
}

export default function ClassesPage() {
  return (
    <RequirePermission permission="class:view">
      <ClassesList />
    </RequirePermission>
  );
}
