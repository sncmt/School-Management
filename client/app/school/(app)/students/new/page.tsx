import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequirePermission } from "@/components/auth/Can";
import { StudentForm } from "@/components/school/students/StudentForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.students.form");
  return { title: t("title") };
}

export default function AdmitStudentPage() {
  return (
    <RequirePermission permission="student:create">
      <StudentForm />
    </RequirePermission>
  );
}
