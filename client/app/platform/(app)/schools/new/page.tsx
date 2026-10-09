import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SchoolForm } from "@/components/platform/schools/SchoolForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("platform.schoolForm");
  return { title: t("title") };
}

export default function NewSchoolPage() {
  return <SchoolForm mode="create" />;
}
