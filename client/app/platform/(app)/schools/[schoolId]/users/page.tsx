import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SchoolUsersPage } from "@/components/platform/schools/SchoolUsersPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("platform.schoolUsers");
  return { title: t("title") };
}

// a school's people and their passwords, for the platform admin
export default async function PlatformSchoolUsersPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  return <SchoolUsersPage schoolId={schoolId} />;
}
