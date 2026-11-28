"use client";

import { useTranslations } from "next-intl";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PUBLIC_DOMAIN } from "@/lib/marketing/company";
import { schoolSiteUrl } from "@/lib/tenant";

// a school's address is its subdomain: letters, digits and hyphens
const SUBDOMAIN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/*
 * "Log in" on the homepage. Every institution logs in on its own address (abc.sncmt.com), so this
 * asks for that address and goes to its login page.
 */
export function SchoolLoginDialog({ trigger }: { trigger: ReactNode }) {
  const t = useTranslations("marketing.login");
  const id = useId();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    // people may paste the whole address: keep the part before the domain
    const value = code.trim().toLowerCase().replace(/^https?:\/\//, "").split(/[./]/)[0];
    if (!SUBDOMAIN.test(value)) {
      setError(true);
      return;
    }
    window.location.href = schoolSiteUrl(value, "/login");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="hp-sans max-w-md rounded-2xl p-7">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-hp-deep">{t("title")}</DialogTitle>
          <DialogDescription className="text-base leading-relaxed text-hp-quiet">{t("description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="mt-2 grid gap-3">
          <label htmlFor={id} className="text-[15px] font-semibold text-hp-ink">
            {t("label")}
          </label>
          <div
            className="flex h-12 items-center overflow-hidden rounded-xl border border-hp-hair bg-white focus-within:border-hp-brand focus-within:ring-3 focus-within:ring-hp-brand/15 aria-invalid:border-red-500"
            aria-invalid={error || undefined}
          >
            <input
              id={id}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(false);
              }}
              placeholder="yourschool"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              aria-invalid={error || undefined}
              aria-describedby={error ? `${id}-error` : undefined}
              className="h-full min-w-0 flex-1 bg-transparent px-4 text-base text-hp-ink outline-none placeholder:text-hp-quiet/60"
            />
            <span className="shrink-0 pr-4 text-base text-hp-quiet" data-ascii-digits>
              .{PUBLIC_DOMAIN}
            </span>
          </div>
          {error && (
            <p id={`${id}-error`} className="text-sm text-red-600">
              {t("invalid")}
            </p>
          )}
          <button
            type="submit"
            className="mt-2 inline-flex h-12 items-center justify-center rounded-xl bg-hp-brand px-5 text-base font-semibold text-white transition-colors hover:bg-hp-brand-ink focus-visible:ring-2 focus-visible:ring-hp-brand focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            {t("submit")}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
