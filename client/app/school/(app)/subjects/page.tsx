import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequirePermission } from "@/components/auth/Can";
import { SubjectsList } from "@/components/subjects/SubjectsList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.subjects");
  return { title: t("title") };
}

export default function SchoolSubjectsPage() {
  return (
    <RequirePermission permission="subject:view">
      <SubjectsList scope="SCHOOL" />
    </RequirePermission>
  );
}
