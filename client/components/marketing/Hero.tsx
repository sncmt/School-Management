import { ArrowRight, Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { contactHref } from "@/lib/marketing/packages";
import { HeroPicture } from "./HeroPicture";
import { HP_PAGE } from "./MarketingHeader";

const FOCUS = "focus-visible:ring-2 focus-visible:ring-hp-brand focus-visible:ring-offset-2 focus-visible:outline-none";

/*
 * The top of the homepage, on a pale teal wash under a faint grid: who it is for, the promise in
 * two lines, what is inside, the two ways on and three plain facts, beside a picture of a school's
 * real dashboard with the guardian app over its corner (HeroPicture). From 1024px it fills the
 * window under the header (68px and its 1px line) and never runs below it: the headline is sized by
 * its column's width and the window's height, and the picture zooms down on a short window.
 */
export async function Hero() {
  const t = await getTranslations("marketing.hero");

  return (
    <section aria-labelledby="hero-title" className="hp-sans hp-hero relative overflow-hidden">
      <div
        className={`${HP_PAGE} relative grid grid-cols-[minmax(0,1fr)] gap-10 pt-12 pb-14 lg:h-[calc(100svh-69px)] lg:min-h-[520px] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)] lg:grid-rows-[minmax(0,1fr)] lg:items-center lg:gap-12 lg:py-[clamp(16px,5vh,64px)]`}
      >
        {/* the words: a size container, so the headline is sized by this column */}
        <div className="@container">
          <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-hp-hair bg-white py-1.5 pr-3 pl-1.5 text-base font-medium text-hp-quiet">
            <span className="shrink-0 rounded-full bg-hp-brand px-2.5 py-[3px] text-[13px] font-bold text-white">{t("new")}</span>
            <span className="min-w-0">{t("for")}</span>
          </p>

          <h1
            id="hero-title"
            className="relative z-0 my-[clamp(12px,2.6vh,22px)] text-[length:clamp(30px,min(9.4cqi,8.2vh),76px)] leading-[1.04] font-extrabold tracking-[-0.035em] text-hp-deep [:lang(bn)_&]:text-[length:clamp(28px,min(9.6cqi,9vh),74px)] [:lang(bn)_&]:leading-[1.18] [:lang(bn)_&]:font-bold [:lang(bn)_&]:tracking-normal"
          >
            {t("titleLine1")}
            <br />
            {t.rich("titleLine2", {
              // the promise in teal, on a gold underline
              em: (chunks) => (
                <em className="relative whitespace-nowrap text-hp-brand not-italic after:absolute after:inset-x-0 after:bottom-[0.04em] after:-z-10 after:h-[0.12em] after:rounded after:bg-mk-gold after:opacity-85">
                  {chunks}
                </em>
              ),
            })}
          </h1>

          <p className="mb-[clamp(18px,3.8vh,32px)] max-w-[600px] text-lg leading-[1.6] text-hp-quiet lg:text-[length:clamp(18px,2.9vh,22px)] [:lang(bn)_&]:lg:text-[length:clamp(19px,3vh,23px)]">
            {t("lead")}
          </p>

          <div className="mb-[clamp(16px,3.8vh,32px)] flex flex-wrap gap-3">
            <Link
              href={contactHref()}
              className={`inline-flex h-[58px] flex-1 items-center justify-center gap-2 rounded-xl bg-hp-brand px-7 text-lg font-semibold whitespace-nowrap text-white transition-colors hover:bg-hp-brand-ink sm:flex-none ${FOCUS}`}
            >
              {t("primary")}
              <ArrowRight className="size-[18px]" strokeWidth={2} />
            </Link>
            <a
              href="#pricing"
              className={`inline-flex h-[58px] flex-1 items-center justify-center rounded-xl border border-hp-hair bg-white px-7 text-lg font-semibold whitespace-nowrap text-hp-ink transition-colors hover:border-[oklch(0.82_0.02_200)] sm:flex-none ${FOCUS}`}
            >
              {t("secondary")}
            </a>
          </div>

          <ul className="flex flex-wrap gap-x-[22px] gap-y-2.5 text-[17px] font-medium text-hp-ink">
            {(["fact1", "fact2", "fact3"] as const).map((key) => (
              <li key={key} className="flex items-center gap-2">
                <Check className="size-5 shrink-0 text-hp-ok" strokeWidth={2.4} />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>

        <HeroPicture />
      </div>
    </section>
  );
}
