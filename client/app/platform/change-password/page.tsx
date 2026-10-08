import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";

export const metadata: Metadata = { title: "Change password" };

export default function PlatformChangePasswordPage() {
  return (
    <AuthGuard session="PLATFORM" allowPasswordChange>
      <Suspense>
        <ChangePasswordForm session="PLATFORM" />
      </Suspense>
    </AuthGuard>
  );
}
