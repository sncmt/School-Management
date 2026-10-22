import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PaymentResult } from "@/components/school/family/PaymentResult";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("school.family.payResult");
  return { title: t("pageTitle") };
}

// SSLCommerz sends the guardian back here (the server checks the payment before showing it)
export default async function FeePaymentResultPage({ params }: { params: Promise<{ tranId: string }> }) {
  const { tranId } = await params;
  return <PaymentResult tranId={tranId} />;
}
