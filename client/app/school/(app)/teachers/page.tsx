import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequirePermission } from "@/components/auth/Can";
import { TeachersList } from "@/components/school/teachers/TeachersList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.teachers");
  return { title: t("title") };
}

export default function TeachersPage() {
  return (
    <RequirePermission permission="teacher:view">
      <TeachersList />
    </RequirePermission>
  );
}
