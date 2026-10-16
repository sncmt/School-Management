import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequirePermission } from "@/components/auth/Can";
import { ExamsPage } from "@/components/school/exams/ExamsPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.exams");
  return { title: t("title") };
}

export default function SchoolExamsPage() {
  return (
    <RequirePermission permission={["exam:view", "grading:view"]} any>
      <ExamsPage />
    </RequirePermission>
  );
}
