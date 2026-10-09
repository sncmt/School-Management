"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { schoolSiteUrl } from "@/lib/tenant";

/** The super admin's login page, email and temporary password, each with a copy button. */
export function TemporaryCredentials({
  subdomain,
  email,
  password,
}: {
  subdomain: string;
  email: string;
  password: string;
}) {
  const t = useTranslations("platform.schools.activate");

  return (
    <dl className="space-y-3 text-sm">
      <CopyRow label={t("loginUrl")} value={schoolSiteUrl(subdomain, "/login")} />
      <CopyRow label={t("email")} value={email} />
      <CopyRow label={t("password")} value={password} mono />
    </dl>
  );
}

function CopyRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const t = useTranslations("common");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
        <span className={mono ? "flex-1 break-all font-mono" : "flex-1 break-all"}>{value}</span>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={copy}
          aria-label={copied ? t("copied") : t("copy")}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </dd>
    </div>
  );
}
