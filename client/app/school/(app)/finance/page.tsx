import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { RequirePermission } from "@/components/auth/Can";
import { FinancePage } from "@/components/school/finance/FinancePage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.finance");
  return { title: t("title") };
}

export default function SchoolFinancePage() {
  return (
    <RequirePermission permission={["payment:create", "payment:view", "student_fee:view", "fee_structure:view", "fee_type:view", "fund:view", "fund:ledger", "expense:view", "finance_report:view", "online_payment:manage"]} any>
      {/* the page reads ?student= */}
      <Suspense>
        <FinancePage />
      </Suspense>
    </RequirePermission>
  );
}
