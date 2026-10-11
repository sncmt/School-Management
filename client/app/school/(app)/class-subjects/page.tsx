import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { RequirePermission } from "@/components/auth/Can";
import { ClassSubjectsList } from "@/components/school/classSubjects/ClassSubjectsList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.classSubjects");
  return { title: t("title") };
}

export default function ClassSubjectsPage() {
  return (
    <RequirePermission permission="class_subject:view">
      {/* the chosen class is read from the URL (useSearchParams) */}
      <Suspense>
        <ClassSubjectsList />
      </Suspense>
    </RequirePermission>
  );
}
