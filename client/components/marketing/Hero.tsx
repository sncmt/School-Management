import { ArrowRight, BadgeCheck, CheckCircle2, MessageSquareText, Trophy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { ProductPreview } from "./ProductPreview";

/*
 * The top of the marketing homepage, on ink: what the platform is, the two ways on, and a
 * picture of the product leaning back into the page with a few live moments floating beside it.
 */
export async function Hero() {
  const t = await getTranslations("marketing.hero");

  return (
    <section className="dark relative isolate overflow-hidden bg-mk-ink text-white">
      {/* backdrop: hairline grid and two soft lights */}
      <div aria-hidden className="mk-grid absolute inset-0 -z-10" />
      <div aria-hidden className="absolute -top-40 left-1/2 -z-10 h-[34rem] w-[60rem] -translate-x-1/2 rounded-full bg-mk-violet/25 blur-[120px]" />
      <div aria-hidden className="absolute top-[28rem] -right-40 -z-10 size-[30rem] rounded-full bg-mk-amber/10 blur-[110px]" />

      <div className="mx-auto max-w-6xl px-4 pt-16 text-center sm:pt-24">
        <p className="animate-in fade-in slide-in-from-bottom-2 mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] py-1 pr-3.5 pl-1.5 text-xs font-medium text-white/85 backdrop-blur duration-700 sm:text-sm">
          <span className="rounded-full bg-mk-amber px-2 py-0.5 text-[11px] font-bold tracking-wide text-mk-ink uppercase">{t("badge")}</span>
          {t("eyebrow")}
        </p>

        <h1 className="animate-in fade-in slide-in-from-bottom-4 mx-auto mt-7 max-w-4xl text-[2.6rem] leading-[1.05] font-extrabold tracking-tight duration-700 sm:text-6xl lg:text-7xl">
          {t("titleStart")} <span className="mk-gradient-text">{t("titleHighlight")}</span>
        </h1>

        <p className="animate-in fade-in slide-in-from-bottom-4 mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/70 duration-1000 sm:text-lg">
          {t("subtitle")}
        </p>

        <div className="animate-in fade-in slide-in-from-bottom-4 mt-9 flex flex-col items-center justify-center gap-3 duration-1000 sm:flex-row">
          <a
            href="#pricing"
            className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-mk-amber px-7 text-[15px] font-semibold text-mk-ink shadow-[0_10px_40px_-10px_var(--mk-amber)] transition-all hover:bg-white sm:w-auto"
          >
            {t("primary")}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#contact"
            className="inline-flex h-12 w-full items-center justify-center rounded-full border border-white/20 bg-white/[0.04] px-7 text-[15px] font-semibold text-white backdrop-blur transition-colors hover:bg-white/10 sm:w-auto"
          >
            {t("secondary")}
          </a>
        </div>

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/60">
          {(["proof1", "proof2", "proof3"] as const).map((key) => (
            <li key={key} className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-mk-mint" />
              {t(key)}
            </li>
          ))}
        </ul>

        {/* the product, leaning back and fading into the ink */}
        <div aria-hidden className="relative mx-auto mt-16 max-w-5xl sm:mt-20">
          <div className="absolute inset-x-10 top-10 -z-10 h-2/3 rounded-full bg-mk-violet/40 blur-[90px]" />
          <div className="mk-tilt [mask-image:linear-gradient(to_bottom,black_55%,transparent_98%)]">
            <ProductPreview />
          </div>

          <FloatingCard className="mk-float top-16 -left-6 xl:-left-16">
            <span className="relative flex size-11 items-center justify-center rounded-full bg-[conic-gradient(var(--mk-mint)_0_96%,rgb(255_255_255/0.12)_96%)]">
              <span className="flex size-8 items-center justify-center rounded-full bg-mk-ink-2 text-[11px] font-bold">96%</span>
            </span>
            <span className="text-left">
              <span className="block text-xs text-white/60">{t("float.attendance")}</span>
              <span className="block text-sm font-semibold">{t("float.attendanceValue")}</span>
            </span>
          </FloatingCard>

          <FloatingCard className="mk-float-late top-6 -right-4 xl:-right-14">
            <span className="flex size-10 items-center justify-center rounded-xl bg-mk-mint/15 text-mk-mint">
              <MessageSquareText className="size-5" />
            </span>
            <span className="text-left">
              <span className="block text-sm font-semibold">{t("float.fee")}</span>
              <span className="flex items-center gap-1 text-xs text-white/60">
                <BadgeCheck className="size-3.5 text-mk-mint" /> {t("float.feeSms")}
              </span>
            </span>
          </FloatingCard>

          <FloatingCard className="mk-float top-56 -right-8 xl:-right-20">
            <span className="flex size-10 items-center justify-center rounded-xl bg-mk-amber/15 text-mk-amber">
              <Trophy className="size-5" />
            </span>
            <span className="text-left">
              <span className="block text-xs text-white/60">{t("float.result")}</span>
              <span className="block text-sm font-semibold">{t("float.resultValue")}</span>
            </span>
          </FloatingCard>
        </div>
      </div>
    </section>
  );
}

// a glassy card beside the product picture, from lg (no room for it on smaller screens)
function FloatingCard({ className, children }: { className: string; children: ReactNode }) {
  return (
    <div
      className={`absolute z-10 hidden items-center gap-3 rounded-2xl border border-white/15 bg-mk-ink-2/80 p-3 pr-5 shadow-2xl shadow-black/40 backdrop-blur-xl lg:flex ${className}`}
    >
      {children}
    </div>
  );
}
