import type { ReactNode } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { PlatformShell } from "@/components/platform/PlatformShell";

export default function PlatformAppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard session="PLATFORM">
      <PlatformShell>{children}</PlatformShell>
    </AuthGuard>
  );
}
