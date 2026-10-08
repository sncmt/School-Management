import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { SchoolLoginForm } from "@/components/auth/SchoolLoginForm";
import { getSiteFromHost } from "@/lib/tenant";

export const metadata: Metadata = { title: "Log in" };

export default async function SchoolLoginPage() {
  const site = getSiteFromHost((await headers()).get("host"));
  const subdomain = site.type === "SCHOOL" ? site.subdomain : "";

  return (
    <AuthCard title="Log in" description={<>to <span className="font-medium">{subdomain}</span></>}>
      <Suspense>
        <SchoolLoginForm />
      </Suspense>
    </AuthCard>
  );
}
