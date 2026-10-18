import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HomeworkDetail } from "@/components/school/homework/HomeworkDetail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.homework");
  return { title: t("title") };
}

export default async function SchoolHomeworkDetailPage({ params }: { params: Promise<{ homeworkId: string }> }) {
  const { homeworkId } = await params;
  return <HomeworkDetail homeworkId={homeworkId} />;
}
