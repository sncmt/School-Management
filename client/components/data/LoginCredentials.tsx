"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  loginUrl: string;
  // what they log in with: "Email" / "Mobile number" and its value
  idLabel: string;
  id: string;
  password: string;
};

/** Where to log in, with what, and the password: each with a copy button. */
export function LoginCredentials({ loginUrl, idLabel, id, password }: Props) {
  const t = useTranslations("common");

  return (
    // typed exactly as shown (a family's password is its phone number): ASCII digits, even in Bangla
    <dl className="space-y-3 text-sm" data-ascii-digits>
      <CopyRow label={t("loginPage")} value={loginUrl} />
      <CopyRow label={idLabel} value={id} />
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
        <Button variant="ghost" size="icon" className="size-7" onClick={copy} aria-label={copied ? t("copied") : t("copy")}>
          {copied ? <Check /> : <Copy />}
        </Button>
      </dd>
    </div>
  );
}
