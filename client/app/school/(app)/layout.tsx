"use client";

import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppShell, type NavItem } from "@/components/layout/AppShell";
import { useSchoolMe } from "@/lib/auth/hooks";
import { useLocalizedName } from "@/lib/i18n/names";

// Links are public paths on the school's subdomain (middleware adds /school).
const nav: NavItem[] = [{ href: "/dashboard", label: "dashboard" }];

function SchoolTitle() {
  const me = useSchoolMe();
  const name = useLocalizedName();
  return <>{me ? name(me.school) : null}</>;
}

export default function SchoolAppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard session="SCHOOL">
      <AppShell session="SCHOOL" title={<SchoolTitle />} nav={nav}>
        {children}
      </AppShell>
    </AuthGuard>
  );
}
