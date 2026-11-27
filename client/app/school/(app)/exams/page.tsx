import type { Metadata } from "next";
import { Suspense } from "react";
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
      {/* the open tab is in the address (?tab=marks) */}
      <Suspense>
        <ExamsPage />
      </Suspense>
    </RequirePermission>
  );
}
