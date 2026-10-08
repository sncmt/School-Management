import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { PlatformLoginForm } from "@/components/auth/PlatformLoginForm";

export const metadata: Metadata = { title: "Platform login" };

export default function PlatformLoginPage() {
  return (
    <AuthCard title="Platform admin" description="Log in to manage schools on the platform.">
      <Suspense>
        <PlatformLoginForm />
      </Suspense>
    </AuthCard>
  );
}
