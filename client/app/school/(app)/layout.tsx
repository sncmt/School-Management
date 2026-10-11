import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { SchoolShell } from "@/components/school/SchoolShell";

export default function SchoolAppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard session="SCHOOL">
      <SchoolShell>{children}</SchoolShell>
    </AuthGuard>
  );
}
