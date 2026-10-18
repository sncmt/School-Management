import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NoticesPage } from "@/components/school/notices/NoticesPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.notices");
  return { title: t("title") };
}

// every member of the school: the board shows what each may read (the server decides)
export default function SchoolNoticesPage() {
  return <NoticesPage />;
}
