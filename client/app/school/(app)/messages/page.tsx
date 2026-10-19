import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MessagesPage } from "@/components/school/messages/MessagesPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("inbox");
  return { title: t("title") };
}

// every member: their own messages (no permission needed)
export default function Page() {
  return <MessagesPage />;
}
