import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequirePermission } from "@/components/auth/Can";
import { PromotionPage } from "@/components/school/promotion/PromotionPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.promotion");
  return { title: t("title") };
}

export default function SchoolPromotionPage() {
  return (
    <RequirePermission permission="student:promote">
      <PromotionPage />
    </RequirePermission>
  );
}
