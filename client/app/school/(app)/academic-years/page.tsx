import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequirePermission } from "@/components/auth/Can";
import { AcademicYearsList } from "@/components/school/years/AcademicYearsList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.years");
  return { title: t("title") };
}

export default function AcademicYearsPage() {
  return (
    <RequirePermission permission="academic_year:view">
      <AcademicYearsList />
    </RequirePermission>
  );
}
