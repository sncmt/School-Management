import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RequirePermission } from "@/components/auth/Can";
import { SmsPage } from "@/components/school/sms/SmsPage";
import { SMS_PERMISSIONS } from "@/lib/school/smsKinds";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.sms");
  return { title: t("title") };
}

// anyone with one of the SMS permissions; each tab checks its own
export default function Page() {
  return (
    <RequirePermission permission={SMS_PERMISSIONS} any>
      <SmsPage />
    </RequirePermission>
  );
}
