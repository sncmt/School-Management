"use client";

import { Check } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { withSign } from "@/lib/i18n/currency";
import { CUSTOM_PACKAGE, INCLUDED_FEATURES, contactHref, priceOf, yearlySaving, type Billing, type PublicPackage } from "@/lib/marketing/packages";
import { cn } from "@/lib/utils";
import { HP_PAGE } from "./MarketingHeader";

const BILLINGS: Billing[] = ["MONTHLY", "YEARLY"];
const FOCUS = "focus-visible:ring-2 focus-visible:ring-hp-brand focus-visible:ring-offset-2 focus-visible:outline-none";

// the cards in one row from 1100px (the packages and Custom); two across below, one on a phone
const ROW: Record<number, string> = {
  1: "min-[68.75rem]:grid-cols-1",
  2: "min-[68.75rem]:grid-cols-2",
  3: "min-[68.75rem]:grid-cols-3",
  4: "min-[68.75rem]:grid-cols-4",
  5: "min-[68.75rem]:grid-cols-5",
};

/*
 * The packages, on the light grey band: a heading with a monthly / yearly switch beside it, then
 * a card for each of the platform admin's packages (the middle one of three or more outlined in
 * teal as the most popular) and a card for Custom, a one-time build on the institution's own
 * domain, in soft gold. Each card's button opens the contact page with its package already chosen.
 * Under them, what every package includes. Without packages (the server can't be reached) it asks
 * visitors to get in touch, and still offers Custom.
 */
export function Pricing({ packages }: { packages: PublicPackage[] }) {
  const t = useTranslations("marketing.pricing");
  const format = useFormatter();
  const locale = useLocale();
  const [billing, setBilling] = useState<Billing>("MONTHLY");
  const maxSaving = Math.max(0, ...packages.map(yearlySaving));
  const popular = packages.length >= 3 ? Math.floor(packages.length / 2) : -1;

  return (
    <section id="pricing" aria-labelledby="pricing-title" className="hp-sans scroll-mt-[68px] border-t border-hp-hair bg-hp-canvas py-16 sm:py-24 lg:py-28">
      <div className={HP_PAGE}>
        <div className="mb-9 flex flex-wrap items-end justify-between gap-x-10 gap-y-6 sm:mb-12">
          <div className="max-w-[720px]">
            <h2
              id="pricing-title"
              className="mb-3.5 text-[length:clamp(30px,3.8vw,48px)] leading-[1.12] font-extrabold tracking-[-0.035em] text-balance text-hp-deep [:lang(bn)_&]:leading-[1.3] [:lang(bn)_&]:font-bold [:lang(bn)_&]:tracking-normal"
            >
              {t("title")}
            </h2>
            <p className="text-lg leading-[1.65] text-hp-quiet sm:text-xl">{t("subtitle")}</p>
          </div>

          {packages.length > 0 && (
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <div role="group" aria-label={t("billing")} className="inline-flex rounded-xl border border-hp-hair bg-white p-1">
                {BILLINGS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={billing === option}
                    onClick={() => setBilling(option)}
                    className={cn(
                      "min-w-[104px] rounded-[9px] px-5 py-[9px] text-base font-semibold transition-colors",
                      FOCUS,
                      billing === option ? "bg-hp-deep text-white" : "text-hp-quiet hover:text-hp-ink",
                    )}
                  >
                    {t(option === "MONTHLY" ? "monthly" : "yearly")}
                  </button>
                ))}
              </div>
              {maxSaving > 0 && <p className="text-[15px] font-semibold text-emerald-700">{t("saveUpTo", { amount: withSign(locale, format.number(maxSaving)) })}</p>}
            </div>
          )}
        </div>

        {packages.length === 0 && (
          <p className="mb-8 max-w-xl rounded-2xl border border-hp-hair bg-white p-6 text-lg text-hp-ink">
            {t.rich("unavailable", { link: (chunks) => <ContactLink>{chunks}</ContactLink> })}
          </p>
        )}

        <div className={cn("grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2", ROW[packages.length + 1] ?? "min-[68.75rem]:grid-cols-4")}>
          {packages.map((pkg, i) => (
            <PackageCard key={pkg.code} pkg={pkg} billing={billing} popular={i === popular} />
          ))}
          <CustomCard />
        </div>

        {/* every package has all of it */}
        <div className="mt-10 sm:mt-14">
          <h3 className="mb-[18px] text-[22px] font-bold text-hp-deep">{t("includedTitle")}</h3>
          <ul className="grid gap-x-8 gap-y-3 text-base text-hp-ink sm:grid-cols-2 sm:text-[16.5px] lg:grid-cols-3">
            {INCLUDED_FEATURES.map((feature) => (
              <Point key={feature}>{t(`features.${feature}`)}</Point>
            ))}
          </ul>
        </div>

        <p className="mt-7 text-[15px] text-hp-quiet">{t("note")}</p>
      </div>
    </section>
  );
}

function ContactLink({ children }: { children: ReactNode }) {
  return (
    <Link
      href={contactHref()}
      className="font-semibold text-hp-brand-ink underline decoration-hp-brand/30 decoration-2 underline-offset-4 hover:decoration-hp-brand"
    >
      {children}
    </Link>
  );
}

// one line with a green tick
function Point({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 leading-[1.45]">
      <Check aria-hidden className="mt-0.5 size-[18px] shrink-0 text-hp-ok" strokeWidth={2.4} />
      {children}
    </li>
  );
}

// a card's frame: white, or outlined in teal (the popular one), or soft gold (Custom), with a flag above it
function Card({ tone = "plain", flag, children }: { tone?: "plain" | "popular" | "custom"; flag?: ReactNode; children: ReactNode }) {
  return (
    <article
      className={cn(
        "relative flex flex-col rounded-[18px] border px-6 pt-7 pb-6",
        tone === "plain" && "border-hp-hair bg-white",
        tone === "popular" && "border-2 border-hp-brand bg-white px-[23px] pt-[27px] pb-[23px] shadow-[0_24px_40px_-28px_oklch(0.3_0.08_200/0.45)]",
        tone === "custom" && "border-[oklch(0.88_0.06_85)] bg-[oklch(0.985_0.02_85)]",
      )}
    >
      {flag && (
        <span
          className={cn(
            "absolute -top-3.5 left-[22px] rounded-full px-3 py-1 text-[13.5px] font-bold",
            tone === "custom" ? "bg-mk-gold text-hp-deep" : "bg-hp-brand text-white",
          )}
        >
          {flag}
        </span>
      )}
      {children}
    </article>
  );
}

// the name, who it is for, and the price with its line under it
function CardTop({ name, forWhom, price, unit, under, words }: { name: string; forWhom: string; price: string; unit?: string; under: ReactNode; words?: boolean }) {
  return (
    <>
      <h3 className="mt-1 mb-1 text-2xl font-bold text-hp-deep">{name}</h3>
      <p className="text-base leading-[1.45] text-hp-quiet sm:min-h-[2.9em]">{forWhom}</p>
      <p className="mt-[18px] mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-hp-hair pt-[18px]">
        <span
          className={cn(
            "leading-[1.05] font-extrabold tracking-[-0.02em] text-hp-deep tabular-nums [:lang(bn)_&]:font-bold [:lang(bn)_&]:tracking-normal",
            // words (Custom's "by agreement") a step smaller than a figure, so they fit the card
            words ? "text-[30px] [:lang(bn)_&]:leading-[1.2]" : "text-[40px]",
          )}
        >
          {price}
        </span>
        {unit && <span className="text-base text-hp-quiet">{unit}</span>}
      </p>
      <p className="mb-[18px] min-h-[1.5em] text-[15px] text-hp-quiet">{under}</p>
    </>
  );
}

const BUTTON = "mt-auto inline-flex h-12 items-center justify-center rounded-xl border px-5 text-[16.5px] font-semibold transition-colors";

function PackageCard({ pkg, billing, popular }: { pkg: PublicPackage; billing: Billing; popular: boolean }) {
  const t = useTranslations("marketing.pricing");
  const format = useFormatter();
  const locale = useLocale();
  const saving = billing === "YEARLY" ? yearlySaving(pkg) : 0;

  return (
    <Card tone={popular ? "popular" : "plain"} flag={popular ? t("popular") : undefined}>
      <CardTop
        name={pkg.name}
        forWhom={pkg.maxStudents === null ? t("unlimited") : t("upTo", { count: format.number(pkg.maxStudents) })}
        price={withSign(locale, format.number(priceOf(pkg, billing)))}
        unit={t(billing === "MONTHLY" ? "perMonth" : "perYear")}
        under={
          billing === "MONTHLY" ? (
            t("billedMonthly")
          ) : saving > 0 ? (
            <span className="font-semibold text-emerald-700">{t("save", { amount: withSign(locale, format.number(saving)) })}</span>
          ) : (
            t("billedYearly")
          )
        }
      />
      <ul className="mb-6 grid content-start gap-2.5 text-base text-hp-ink">
        <Point>{t("points.features")}</Point>
        <Point>{t("points.address")}</Point>
        <Point>{t("points.setup")}</Point>
      </ul>
      <Link
        href={contactHref(pkg.code, billing)}
        className={cn(
          BUTTON,
          FOCUS,
          popular ? "border-hp-brand bg-hp-brand text-white hover:bg-hp-brand-ink" : "border-hp-deep text-hp-deep hover:bg-hp-wash",
        )}
      >
        {t("choose", { name: pkg.name })}
      </Link>
    </Card>
  );
}

// Custom: no set price, it is agreed with each institution
function CustomCard() {
  const t = useTranslations("marketing.pricing.custom");

  return (
    <Card tone="custom" flag={t("flag")}>
      <CardTop
        name={t("name")}
        forWhom={t("tagline")}
        price={t("price")}
        words
        under={t("priceNote")}
      />
      <ul className="mb-6 grid content-start gap-2.5 text-base text-hp-ink">
        <Point>{t("points.features")}</Point>
        <Point>{t("points.domain")}</Point>
        <Point>{t("points.plan")}</Point>
      </ul>
      <Link href={contactHref(CUSTOM_PACKAGE.code)} className={cn(BUTTON, FOCUS, "border-hp-deep bg-hp-deep text-white hover:bg-hp-brand-ink")}>
        {t("cta")}
      </Link>
    </Card>
  );
}
