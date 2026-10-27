"use client";

import { ArrowRight, Check, Sparkles } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import {
  CHOOSE_PACKAGE_EVENT,
  MAX_YEARLY_SAVING,
  PACKAGES,
  yearlySaving,
  type Billing,
  type ChoosePackageDetail,
  type Package,
} from "@/lib/marketing/packages";
import { jumpToSection } from "@/lib/useSectionNav";
import { cn } from "@/lib/utils";
import { MkHeading } from "./MkHeading";

const BILLINGS: Billing[] = ["MONTHLY", "YEARLY"];

/** The packages, on ink: a monthly / yearly switch and three cards, the middle one lifted. */
export function Pricing() {
  const t = useTranslations("marketing.pricing");
  const format = useFormatter();
  const [billing, setBilling] = useState<Billing>("MONTHLY");

  return (
    <section id="pricing" className="dark relative isolate scroll-mt-16 overflow-hidden bg-mk-ink py-20 text-white sm:py-28">
      <div aria-hidden className="mk-grid absolute inset-0 -z-10" />
      <div aria-hidden className="absolute top-1/3 left-1/2 -z-10 h-96 w-[52rem] -translate-x-1/2 rounded-full bg-mk-violet/20 blur-[120px]" />

      <div className="mx-auto max-w-6xl px-4">
        <MkHeading dark index="02" eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} className="mb-10 sm:mb-12" />

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
          {MAX_YEARLY_SAVING > 0 && (
            <p className="flex items-center gap-1.5 text-sm text-mk-mint">
              <Sparkles className="size-4" />
              {t("saveUpTo", { amount: format.number(MAX_YEARLY_SAVING) })}
            </p>
          )}
        </div>

        <div className="grid items-center gap-6 lg:grid-cols-3 lg:gap-5">
          {PACKAGES.map((pkg, i) => (
            <PackageCard key={pkg.id} pkg={pkg} billing={billing} previous={PACKAGES[i - 1]} />
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-white/55">
          {t.rich("note", {
            link: (chunks) => (
              <a href="#contact" onClick={(e) => jumpToSection("contact", "/", e)} className="font-semibold text-white underline-offset-4 hover:underline">
                {chunks}
              </a>
            ),
          })}
        </p>
      </div>
    </section>
  );
}

function PackageCard({ pkg, billing, previous }: { pkg: Package; billing: Billing; previous?: Package }) {
  const t = useTranslations("marketing.pricing");
  const format = useFormatter();
  const price = pkg.price[billing];
  const saving = billing === "YEARLY" ? yearlySaving(pkg) : 0;
  const name = t(`packages.${pkg.id}.name`);

  // tell the contact form, then go there
  const choose = () => {
    window.dispatchEvent(new CustomEvent<ChoosePackageDetail>(CHOOSE_PACKAGE_EVENT, { detail: { id: pkg.id, billing } }));
    jumpToSection("contact");
  };

  return (
    <article
      className={cn(
        "relative flex flex-col rounded-3xl p-7 transition-all duration-300 sm:p-8",
        pkg.popular
          ? "bg-white text-mk-ink shadow-[0_30px_80px_-20px_color-mix(in_oklch,var(--mk-violet)_60%,transparent)] ring-2 ring-mk-amber lg:py-11"
          : "border border-white/10 bg-white/[0.04] backdrop-blur hover:border-white/25 hover:bg-white/[0.07]",
      )}
    >
      {pkg.popular && (
        <span className="absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-mk-amber px-3.5 py-1 text-xs font-bold whitespace-nowrap text-mk-ink shadow-lg">
          <Sparkles className="size-3.5" /> {t("popular")}
        </span>
      )}

      <h3 className="text-lg font-bold">{name}</h3>
      <p className={cn("mt-1 text-sm", pkg.popular ? "text-slate-500" : "text-white/55")}>{t(`packages.${pkg.id}.blurb`)}</p>

      {/* keyed by the billing, so a switch plays the entrance again */}
      <div key={billing} className="animate-in fade-in slide-in-from-bottom-1 mt-7 duration-300">
        <p className="flex items-baseline gap-1.5">
          <span className="text-5xl font-extrabold tracking-tight tabular-nums">৳{format.number(price)}</span>
          <span className={cn("text-sm font-medium", pkg.popular ? "text-slate-500" : "text-white/55")}>
            {t(billing === "MONTHLY" ? "perMonth" : "perYear")}
          </span>
        </p>
        <p className={cn("mt-2 h-5 text-sm", pkg.popular ? "text-slate-500" : "text-white/55")}>
          {billing === "MONTHLY" ? (
            t("billedMonthly")
          ) : saving > 0 ? (
            <span className={cn("font-semibold", pkg.popular ? "text-emerald-600" : "text-mk-mint")}>
              {t("save", { amount: format.number(saving) })}
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
          pkg.popular ? "bg-mk-ink text-white hover:bg-mk-violet" : "bg-white/10 text-white hover:bg-white hover:text-mk-ink",
        )}
      >
        {t("choose", { name })}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </button>

      <div className={cn("my-7 h-px", pkg.popular ? "bg-slate-200" : "bg-white/10")} />

      {previous && (
        <p className={cn("mb-3.5 text-xs font-semibold tracking-wide uppercase", pkg.popular ? "text-mk-violet" : "text-mk-amber")}>
          {t("everythingIn", { name: t(`packages.${previous.id}.name`) })}
        </p>
      )}
      <ul className="space-y-3 text-sm">
        {pkg.features.map((feature) => (
          <li key={feature} className="flex gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                pkg.popular ? "bg-mk-ink text-mk-amber" : "bg-white/10 text-mk-mint",
              )}
            >
              <Check className="size-3" strokeWidth={3} />
            </span>
            <span className={pkg.popular ? "text-slate-700" : "text-white/80"}>{t(`features.${feature}`)}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
