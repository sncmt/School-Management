"use client";

import { useTranslations } from "next-intl";
import { useMe } from "@/lib/auth/hooks";

export default function PlatformDashboardPage() {
  const t = useTranslations("platform");
  const { data: me } = useMe();

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("welcome", { name: me?.user.fullname ?? "" })}</h1>
      <p className="text-muted-foreground">{t("dashboardIntro")}</p>
    </div>
  );
}
