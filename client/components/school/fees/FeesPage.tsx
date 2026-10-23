"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { RequirePermission } from "@/components/auth/Can";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/lib/auth/hooks";
import { useFamilyRole } from "@/lib/school/family";
import { FEES_PERMISSIONS } from "@/lib/school/moneyPermissions";
import { FamilyPayments } from "../family/FamilyPayments";
import { CollectTab } from "../finance/collect/CollectTab";
import { PaymentsTab } from "../finance/collect/PaymentsTab";
import { FeeStructuresTab } from "../finance/FeeStructuresTab";
import { FeeTypesTab } from "../finance/FeeTypesTab";
import { FinanceSettingsTab } from "../finance/FinanceSettingsTab";
import { DuesReport } from "../finance/money/ReportsTab";
import { OnlinePaymentTab } from "../finance/OnlinePaymentTab";

/**
 * Fees: collecting them, payments, dues, what each class pays, the kinds of fees, online
 * payment and the fee rules. A family login sees its children's payments here instead (and a
 * teacher who is also a parent, both).
 */
export function FeesPage() {
  const t = useTranslations("school.fees");
  const can = useCan();
  const { ready, isFamily } = useFamilyRole();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // ?student=<id> opens that student on the Collect tab (from the student's profile)
  const studentId = searchParams.get("student");
  const staffTabs = [
    (can("payment:create") || can("student_fee:view")) && "collect",
    can("payment:view") && "payments",
    can("finance_report:view") && "dues",
    can("fee_structure:view") && "structures",
    can("fee_type:view") && "feeTypes",
    can("online_payment:manage") && "online",
    can("fee_structure:view") && "settings",
  ].filter(Boolean) as string[];
  const tabs = isFamily && staffTabs.length > 0 ? [...staffTabs, "children"] : staffTabs;
  const [tab, setTab] = useState<string | undefined>();

  const setStudent = (id: string | null) => router.replace(id ? `${pathname}?student=${id}` : pathname, { scroll: false });
  // from the dues report: open the student on the Collect tab
  const collectFrom = (id: string) => {
    setStudent(id);
    setTab("collect");
  };

  if (!ready) return <Skeleton className="h-72 rounded-xl" />;

  // the family login: its children's receipts
  if (staffTabs.length === 0 && isFamily) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("familyTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("familyDescription")}</p>
        </div>
        <FamilyPayments />
      </div>
    );
  }

  return (
    <RequirePermission permission={FEES_PERMISSIONS} any>
      <div className="space-y-4">
        <div className="no-print">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>

        <Tabs value={tab ?? tabs[0]} onValueChange={setTab}>
          <TabsList className="no-print">
            {tabs.map((name) => (
              <TabsTrigger key={name} value={name}>
                {t(`tabs.${name}` as "tabs.collect")}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="collect">
            <CollectTab studentId={studentId} onStudent={setStudent} />
          </TabsContent>
          <TabsContent value="payments">
            <PaymentsTab />
          </TabsContent>
          <TabsContent value="dues">
            <DuesReport onCollect={collectFrom} />
          </TabsContent>
          <TabsContent value="structures">
            <FeeStructuresTab
              canManage={can("fee_structure:create")}
              canSync={can("fee_structure:update")}
              onOpenFeeTypes={tabs.includes("feeTypes") ? () => setTab("feeTypes") : undefined}
            />
          </TabsContent>
          <TabsContent value="feeTypes">
            <FeeTypesTab canCreate={can("fee_type:create")} canUpdate={can("fee_type:update")} />
          </TabsContent>
          <TabsContent value="online">
            <OnlinePaymentTab />
          </TabsContent>
          <TabsContent value="settings">
            <FinanceSettingsTab canManage={can("fee_structure:update")} />
          </TabsContent>
          <TabsContent value="children">
            <FamilyPayments />
          </TabsContent>
        </Tabs>
      </div>
    </RequirePermission>
  );
}
