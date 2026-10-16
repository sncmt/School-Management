"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/lib/auth/hooks";
import { CollectTab } from "./collect/CollectTab";
import { PaymentsTab } from "./collect/PaymentsTab";
import { FeeStructuresTab } from "./FeeStructuresTab";
import { FeeTypesTab } from "./FeeTypesTab";
import { FinanceSettingsTab } from "./FinanceSettingsTab";
import { FundsTab } from "./FundsTab";
import { ExpensesTab } from "./money/ExpensesTab";
import { LedgerTab } from "./money/LedgerTab";
import { ReportsTab } from "./money/ReportsTab";

/** Finance: collecting fees, payments, what each class pays, the kinds of fees, the funds and the rules. */
export function FinancePage() {
  const t = useTranslations("school.finance");
  const can = useCan();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // ?student=<id> opens that student on the Collect tab (from the student's profile)
  const studentId = searchParams.get("student");
  const tabs = [
    (can("payment:create") || can("student_fee:view")) && "collect",
    can("payment:view") && "payments",
    can("expense:view") && "expenses",
    can("fund:ledger") && "ledger",
    can("finance_report:view") && "reports",
    can("fee_structure:view") && "structures",
    can("fee_type:view") && "feeTypes",
    can("fund:view") && "funds",
    can("fee_structure:view") && "settings",
  ].filter(Boolean) as string[];
  const [tab, setTab] = useState<string | undefined>();

  const setStudent = (id: string | null) => router.replace(id ? `${pathname}?student=${id}` : pathname, { scroll: false });
  // from a report: open the student on the Collect tab
  const collectFrom = (id: string) => {
    setStudent(id);
    setTab("collect");
  };

  return (
    <div className="space-y-4">
      <div className="no-print">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Tabs value={tab ?? tabs[0]} onValueChange={setTab}>
        <TabsList className="no-print h-auto max-w-full flex-wrap justify-start">
          {tabs.map((name) => (
            <TabsTrigger key={name} value={name}>
              {t(`tabs.${name}` as "tabs.funds")}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="collect">
          <CollectTab studentId={studentId} onStudent={setStudent} />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab />
        </TabsContent>
        <TabsContent value="expenses">
          <ExpensesTab />
        </TabsContent>
        <TabsContent value="ledger">
          <LedgerTab />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab onCollect={collectFrom} />
        </TabsContent>
        <TabsContent value="structures">
          <FeeStructuresTab canManage={can("fee_structure:create")} canSync={can("fee_structure:update")} />
        </TabsContent>
        <TabsContent value="feeTypes">
          <FeeTypesTab canCreate={can("fee_type:create")} canUpdate={can("fee_type:update")} />
        </TabsContent>
        <TabsContent value="funds">
          <FundsTab canCreate={can("fund:create")} canUpdate={can("fund:update")} canDeposit={can("fund:deposit")} canTransfer={can("fund:transfer")} />
        </TabsContent>
        <TabsContent value="settings">
          <FinanceSettingsTab canManage={can("fee_structure:update")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
