import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequirePermission } from "@/components/auth/Can";
import { StudentsList } from "@/components/school/students/StudentsList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.students");
  return { title: t("title") };
}

export default function StudentsPage() {
  return (
    <RequirePermission permission="student:view">
      <StudentsList />
    </RequirePermission>
  );
}
