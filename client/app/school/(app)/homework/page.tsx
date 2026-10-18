import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HomeworkPage } from "@/components/school/homework/HomeworkPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.homework");
  return { title: t("title") };
}

// teachers (their own subjects), staff with homework permissions, and families: the server decides what each sees
export default function SchoolHomeworkPage() {
  return <HomeworkPage />;
}
