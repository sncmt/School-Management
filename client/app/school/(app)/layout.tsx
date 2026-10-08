"use client";

import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppShell, type NavItem } from "@/components/layout/AppShell";
import { useSchoolMe } from "@/lib/auth/hooks";

// Links are public paths on the school's subdomain (middleware adds /school).
const nav: NavItem[] = [{ href: "/dashboard", label: "Dashboard" }];

function SchoolTitle() {
  const me = useSchoolMe();
  return <>{me?.school.nameEn}</>;
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
