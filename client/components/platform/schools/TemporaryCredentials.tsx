"use client";

import { useTranslations } from "next-intl";
import { LoginCredentials } from "@/components/data/LoginCredentials";
import { schoolSiteUrl } from "@/lib/tenant";

/** A school super admin's login details: their school's login page, email and temporary password. */
export function TemporaryCredentials({ subdomain, email, password }: { subdomain: string; email: string; password: string }) {
  const t = useTranslations("common");
  return (
    <LoginCredentials
      loginUrl={schoolSiteUrl(subdomain, "/login")}
      idLabel={t("email")}
      id={email}
      password={password}
    />
  );
}
