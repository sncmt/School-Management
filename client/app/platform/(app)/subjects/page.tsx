import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SubjectsList } from "@/components/subjects/SubjectsList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("platform.subjects");
  return { title: t("title") };
}

export default function SubjectsPage() {
  return <SubjectsList scope="PLATFORM" />;
}
