import { getTranslations } from "next-intl/server";
import { companyContact, localPhone } from "@/lib/marketing/company";
import { MARKETING_SECTIONS } from "@/lib/marketing/sections";
import { BrandMark } from "./BrandMark";

/** The marketing site's footer, on ink: the name, the sections, the way schools log in. */
export async function MarketingFooter() {
  const [t, tNav, tCommon] = await Promise.all([
    getTranslations("marketing.footer"),
    getTranslations("marketing.nav"),
    getTranslations("common"),
  ]);
  const name = tCommon("appName");
  const { phone, email } = companyContact;

  return (
    <footer className="dark relative isolate overflow-hidden bg-mk-ink text-white">
      {/* the name, huge and faint, behind everything */}
      <p
        aria-hidden
        className="pointer-events-none absolute -bottom-6 left-1/2 -z-10 -translate-x-1/2 text-[18vw] leading-none font-black tracking-tighter whitespace-nowrap text-white/[0.03] select-none"
      >
        {name}
      </p>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1.2fr]">
        <div className="space-y-4">
          <BrandMark name={name} />
          <p className="max-w-sm text-sm leading-relaxed text-white/60">{t("about")}</p>
        </div>

        <nav aria-label={t("links")}>
          <h3 className="mb-4 text-xs font-semibold tracking-[0.18em] text-mk-amber uppercase">{t("links")}</h3>
          <ul className="space-y-2.5 text-sm">
            {MARKETING_SECTIONS.map((section) => (
              <li key={section}>
                <a href={`#${section}`} className="text-white/70 transition-colors hover:text-white">
                  {tNav(section)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className="mb-4 text-xs font-semibold tracking-[0.18em] text-mk-amber uppercase">{t("schools")}</h3>
          <p className="text-sm leading-relaxed text-white/60">{t("login")}</p>
          <p className="mt-2 inline-block rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 font-mono text-sm text-white/85">{t("loginAddress")}</p>
          {(phone || email) && (
            <ul className="mt-5 space-y-1.5 text-sm text-white/70">
              {phone && (
                <li>
                  <a href={`tel:${phone}`} className="tabular-nums hover:text-white">
                    {localPhone(phone)}
                  </a>
                </li>
              )}
              {email && (
                <li>
                  <a href={`mailto:${email}`} className="break-all hover:text-white">
                    {email}
                  </a>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-white/50 sm:flex-row sm:justify-between">
          <p>{t("rights", { year: new Date().getFullYear(), name })}</p>
          <p>{t("made")}</p>
        </div>
      </div>
    </footer>
  );
}
