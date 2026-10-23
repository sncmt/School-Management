"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/lib/auth/hooks";
import { FundsTab } from "./FundsTab";
import { ExpensesTab } from "./money/ExpensesTab";
import { LedgerTab } from "./money/LedgerTab";
import { CollectionReport } from "./money/ReportsTab";

/** Finance: the school's funds, expenses, each fund's ledger and the money report. Fees have their own page. */
export function FinancePage() {
  const t = useTranslations("school.finance");
  const can = useCan();
  const tabs = [
    can("fund:view") && "funds",
    can("expense:view") && "expenses",
    can("fund:ledger") && "ledger",
    can("finance_report:view") && "reports",
  ].filter(Boolean) as string[];
  const [tab, setTab] = useState<string | undefined>();

  return (
    <div className="space-y-4">
      <div className="no-print">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Tabs value={tab ?? tabs[0]} onValueChange={setTab}>
        <TabsList className="no-print">
          {tabs.map((name) => (
            <TabsTrigger key={name} value={name}>
              {t(`tabs.${name}` as "tabs.funds")}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="funds">
          <FundsTab canCreate={can("fund:create")} canUpdate={can("fund:update")} canDeposit={can("fund:deposit")} canTransfer={can("fund:transfer")} />
        </TabsContent>
        <TabsContent value="expenses">
          <ExpensesTab />
        </TabsContent>
        <TabsContent value="ledger">
          <LedgerTab />
        </TabsContent>
        <TabsContent value="reports">
          <CollectionReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
