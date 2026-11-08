"use client";

import { ArrowRight, Check, Sparkles, Users } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { withSign } from "@/lib/i18n/currency";
import {
  CHOOSE_PACKAGE_EVENT,
  INCLUDED_FEATURES,
  priceOf,
  yearlySaving,
  type Billing,
  type ChoosePackageDetail,
  type PublicPackage,
} from "@/lib/marketing/packages";
import { jumpToSection } from "@/lib/useSectionNav";
import { cn } from "@/lib/utils";
import { MkHeading } from "./MkHeading";

const BILLINGS: Billing[] = ["MONTHLY", "YEARLY"];

/*
 * The packages, on navy, as the platform admin set them: a monthly / yearly switch, a card per
 * package (the middle one lifted when there are three or more) and, under them, what every
 * package includes. Without packages (the server can't be reached) it asks visitors to get in touch.
 */
export function Pricing({ packages }: { packages: PublicPackage[] }) {
  const t = useTranslations("marketing.pricing");
  const format = useFormatter();
  const locale = useLocale();
  const [billing, setBilling] = useState<Billing>("MONTHLY");
  const maxSaving = Math.max(0, ...packages.map(yearlySaving));
  const popular = packages.length >= 3 ? Math.floor(packages.length / 2) : -1;

  return (
    <section id="pricing" className="dark relative isolate scroll-mt-16 overflow-hidden bg-mk-ink py-20 text-white sm:py-28">
      <div aria-hidden className="mk-grid absolute inset-0 -z-10" />
      <div aria-hidden className="absolute top-1/3 left-1/2 -z-10 h-96 w-[52rem] -translate-x-1/2 rounded-full bg-mk-blue/20 blur-[120px]" />

      <div className="mx-auto max-w-6xl px-4">
        <MkHeading dark index="02" eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} className="mb-10 sm:mb-12" />

        {packages.length === 0 ? (
          <p className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center text-white/75">
            {t.rich("unavailable", { link: (chunks) => <ContactLink>{chunks}</ContactLink> })}
          </p>
        ) : (
          <>
            {/* monthly / yearly: the white pill slides under the chosen one */}
            <div className="mb-14 flex flex-col items-center gap-3">
              <div role="group" aria-label={t("billing")} className="relative grid grid-cols-2 rounded-full border border-white/15 bg-white/[0.05] p-1">
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-lg transition-transform duration-300 ease-out",
                    billing === "YEARLY" && "translate-x-full",
                  )}
                />
                {BILLINGS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={billing === option}
                    onClick={() => setBilling(option)}
                    className={cn(
                      "relative z-10 min-w-28 rounded-full px-5 py-2 text-sm font-semibold transition-colors",
                      billing === option ? "text-mk-ink" : "text-white/70 hover:text-white",
                    )}
                  >
                    {t(option === "MONTHLY" ? "monthly" : "yearly")}
                  </button>
                ))}
              </div>
              {maxSaving > 0 && (
                <p className="flex items-center gap-1.5 text-sm text-mk-mint">
                  <Sparkles className="size-4" />
                  {t("saveUpTo", { amount: withSign(locale, format.number(maxSaving)) })}
                </p>
              )}
            </div>

            <div className={cn("mx-auto grid items-center gap-6 lg:gap-5", packages.length >= 3 ? "lg:grid-cols-3" : "max-w-3xl md:grid-cols-2")}>
              {packages.map((pkg, i) => (
                <PackageCard key={pkg.code} pkg={pkg} billing={billing} popular={i === popular} />
              ))}
            </div>

            {/* every package has all of it */}
            <div className="mt-14 rounded-3xl border border-white/10 bg-white/[0.04] p-7 sm:p-9">
              <h3 className="text-center text-lg font-bold">{t("includedTitle")}</h3>
              <p className="mt-1 text-center text-sm text-white/60">{t("includedSubtitle")}</p>
              <ul className="mt-7 grid gap-x-8 gap-y-3.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {INCLUDED_FEATURES.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-mk-gold">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    <span className="text-white/85">{t(`features.${feature}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        <p className="mt-12 text-center text-sm text-white/55">{t.rich("note", { link: (chunks) => <ContactLink>{chunks}</ContactLink> })}</p>
      </div>
    </section>
  );
}

function ContactLink({ children }: { children: React.ReactNode }) {
  return (
    <a href="#contact" onClick={(e) => jumpToSection("contact", "/", e)} className="font-semibold text-white underline-offset-4 hover:underline">
      {children}
    </a>
  );
}

function PackageCard({ pkg, billing, popular }: { pkg: PublicPackage; billing: Billing; popular: boolean }) {
  const t = useTranslations("marketing.pricing");
  const format = useFormatter();
  const locale = useLocale();
  const saving = billing === "YEARLY" ? yearlySaving(pkg) : 0;
  const quiet = popular ? "text-slate-500" : "text-white/60";

  // tell the contact form, then go there
  const choose = () => {
    window.dispatchEvent(new CustomEvent<ChoosePackageDetail>(CHOOSE_PACKAGE_EVENT, { detail: { code: pkg.code, billing } }));
    jumpToSection("contact");
  };

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-3xl p-7 transition-all duration-300 sm:p-8",
        popular
          ? "bg-white text-mk-ink shadow-[0_30px_80px_-20px_color-mix(in_oklch,var(--mk-blue)_60%,transparent)] ring-2 ring-mk-gold lg:py-11"
          : "border border-white/10 bg-white/[0.04] backdrop-blur hover:border-white/25 hover:bg-white/[0.07]",
      )}
    >
      {popular && (
        <span className="absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-mk-gold px-3.5 py-1 text-xs font-bold whitespace-nowrap text-mk-ink shadow-lg">
          <Sparkles className="size-3.5" /> {t("popular")}
        </span>
      )}

      <h3 className="text-lg font-bold">{pkg.name}</h3>
      {/* the one thing that sets the packages apart */}
      <p className={cn("mt-2 inline-flex items-center gap-2 text-sm font-semibold", popular ? "text-mk-ink" : "text-white")}>
        <span className={cn("flex size-7 items-center justify-center rounded-lg", popular ? "bg-mk-ink text-mk-gold" : "bg-white/10 text-mk-gold")}>
          <Users className="size-3.5" />
        </span>
        {pkg.maxStudents === null ? t("unlimited") : t("upTo", { count: format.number(pkg.maxStudents) })}
      </p>

      {/* keyed by the billing, so a switch plays the entrance again */}
      <div key={billing} className="animate-in fade-in slide-in-from-bottom-1 mt-7 duration-300">
        <p className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-5xl font-extrabold tracking-tight tabular-nums">{withSign(locale, format.number(priceOf(pkg, billing)))}</span>
          <span className={cn("text-sm font-medium", quiet)}>{t(billing === "MONTHLY" ? "perMonth" : "perYear")}</span>
        </p>
        <p className={cn("mt-2 h-5 text-sm", quiet)}>
          {billing === "MONTHLY" ? (
            t("billedMonthly")
          ) : saving > 0 ? (
            <span className={cn("font-semibold", popular ? "text-emerald-600" : "text-mk-mint")}>
              {t("save", { amount: withSign(locale, format.number(saving)) })}
            </span>
          ) : (
            t("billedYearly")
          )}
        </p>
      </div>

      <button
        type="button"
        onClick={choose}
        className={cn(
          "group mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors",
          popular ? "bg-mk-ink text-white hover:bg-mk-blue" : "bg-white/10 text-white hover:bg-white hover:text-mk-ink",
        )}
      >
        {t("choose", { name: pkg.name })}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </button>

      <p className={cn("mt-5 flex items-center justify-center gap-1.5 text-xs", quiet)}>
        <Check className="size-3.5" strokeWidth={3} /> {t("allFeatures")}
      </p>
    </article>
  );
}
