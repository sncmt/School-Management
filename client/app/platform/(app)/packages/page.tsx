import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PackagesPage } from "@/components/platform/packages/PackagesPage";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("platform.packages");
  return { title: t("title") };
}

export default function PlatformPackagesPage() {
  return <PackagesPage />;
}
