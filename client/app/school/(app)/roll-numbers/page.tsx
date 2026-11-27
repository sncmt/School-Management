import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequirePermission } from "@/components/auth/Can";
import { RollNumbersPage } from "@/components/school/rollNumbers/RollNumbersPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.rollNumbers");
  return { title: t("title") };
}

export default function RollNumbers() {
  return (
    <RequirePermission permission="student:view">
      <RollNumbersPage />
    </RequirePermission>
  );
}
