import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppShell, type NavItem } from "@/components/layout/AppShell";

// Links are public paths on the admin subdomain (middleware adds /platform).
const nav: NavItem[] = [
  { href: "/", label: "dashboard" },
  { href: "/schools/new", label: "newSchool" },
];

export default async function PlatformAppLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("nav");

  return (
    <AuthGuard session="PLATFORM">
      <AppShell session="PLATFORM" title={t("platformAdmin")} nav={nav}>
        {children}
      </AppShell>
    </AuthGuard>
  );
}
