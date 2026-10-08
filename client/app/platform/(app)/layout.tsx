import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppShell, type NavItem } from "@/components/layout/AppShell";

// Links are public paths on the admin subdomain (middleware adds /platform).
const nav: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/schools/new", label: "New school" },
];

export default function PlatformAppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard session="PLATFORM">
      <AppShell session="PLATFORM" title="Platform admin" nav={nav}>
        {children}
      </AppShell>
    </AuthGuard>
  );
}
