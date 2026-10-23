import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequirePermission } from "@/components/auth/Can";
import { FinancePage } from "@/components/school/finance/FinancePage";
import { FINANCE_PERMISSIONS } from "@/lib/school/moneyPermissions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.finance");
  return { title: t("title") };
}

export default function SchoolFinancePage() {
  return (
    <RequirePermission permission={FINANCE_PERMISSIONS} any>
      <FinancePage />
    </RequirePermission>
  );
}
