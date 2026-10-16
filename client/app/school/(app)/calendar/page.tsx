import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequirePermission } from "@/components/auth/Can";
import { CalendarPage } from "@/components/school/calendar/CalendarPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.calendar");
  return { title: t("title") };
}

export default function SchoolCalendarPage() {
  return (
    <RequirePermission permission="holiday:view">
      <CalendarPage />
    </RequirePermission>
  );
}
