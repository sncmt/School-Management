import { getTranslations } from "next-intl/server";

const MODULES = [
  "students",
  "teachers",
  "attendance",
  "routine",
  "exams",
  "results",
  "fees",
  "payments",
  "sms",
  "notices",
  "homework",
  "admitCards",
  "idCards",
  "seatPlans",
  "promotion",
  "expenses",
  "website",
  "app",
] as const;

/** Under the hero: every module of the platform, sliding past (paused on hover, still for reduced motion). */
export async function ModuleMarquee() {
  const t = await getTranslations("marketing.modules");
  const chips = MODULES.map((key) => t(key));

  return (
    <section aria-label={t("label")} className="border-y border-white/10 bg-mk-ink py-6 text-white">
      <p className="mb-4 text-center text-xs font-medium tracking-[0.2em] text-white/45 uppercase">{t("label")}</p>
      <div className="mk-marquee overflow-hidden">
        {/* the list twice, so the loop is seamless; the copy is hidden from screen readers */}
        <div className="mk-marquee-track flex w-max">
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 gap-3 pr-3">
              {chips.map((chip) => (
                <li
                  key={chip}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm whitespace-nowrap text-white/80"
                >
                  <span className="size-1.5 rounded-full bg-mk-amber" />
                  {chip}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
