import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HolidaysList } from "@/components/platform/holidays/HolidaysList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("platform.holidays");
  return { title: t("title") };
}

export default function HolidaysPage() {
  return <HolidaysList />;
}
