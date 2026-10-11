import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { RequirePermission } from "@/components/auth/Can";
import { SubjectTeachersGrid } from "@/components/school/subjectTeachers/SubjectTeachersGrid";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.subjectTeachers");
  return { title: t("title") };
}

export default function SubjectTeachersPage() {
  return (
    <RequirePermission permission="teacher:view">
      {/* the chosen class is read from the URL (useSearchParams) */}
      <Suspense>
        <SubjectTeachersGrid />
      </Suspense>
    </RequirePermission>
  );
}
