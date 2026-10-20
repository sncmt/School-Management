import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequirePermission } from "@/components/auth/Can";
import { IdCardsPage } from "@/components/school/students/idCards/IdCardsPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.idCards");
  return { title: t("title") };
}

// printing comes with seeing students; the design tab saves only with student:update
export default function SchoolIdCardsPage() {
  return (
    <RequirePermission permission="student:view">
      <IdCardsPage />
    </RequirePermission>
  );
}
