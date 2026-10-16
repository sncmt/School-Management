import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequirePermission } from "@/components/auth/Can";
import { AttendancePage } from "@/components/school/attendance/AttendancePage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.attendance");
  return { title: t("title") };
}

export default function SchoolAttendancePage() {
  return (
    // a class teacher may only take the roll call; the office may only view
    <RequirePermission permission={["attendance:view", "attendance:mark", "teacher_attendance:mark"]} any>
      <AttendancePage />
    </RequirePermission>
  );
}
