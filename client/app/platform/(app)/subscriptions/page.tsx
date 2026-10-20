import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SubscriptionsList } from "@/components/platform/subscriptions/SubscriptionsList";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("platform.subscriptions");
  return { title: t("title") };
}

export default function SubscriptionsPage() {
  return <SubscriptionsList />;
}
