import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequirePermission } from "@/components/auth/Can";
import { RoutinePage } from "@/components/school/routine/RoutinePage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.routine");
  return { title: t("title") };
}

export default function SchoolRoutinePage() {
  return (
    <RequirePermission permission="routine:view">
      <RoutinePage />
    </RequirePermission>
  );
}
