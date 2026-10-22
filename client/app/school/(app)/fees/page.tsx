import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { FamilyPayments } from "@/components/school/family/FamilyPayments";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.family.payments");
  return { title: t("title") };
}

// the family login's receipts (the server shows only its own children's)
export default function FamilyPaymentsPage() {
  return <FamilyPayments />;
}
