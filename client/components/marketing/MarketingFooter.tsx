import { Mail, MapPin, Phone, Smartphone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import logo from "@/assets/sncmt-logo.png";
import { companyContact, displayPhone, localPhone, whatsappLink } from "@/lib/marketing/company";
import { contactHref } from "@/lib/marketing/packages";
import { MARKETING_SECTIONS, sectionHref } from "@/lib/marketing/sections";
import { HP_PAGE } from "./MarketingHeader";
import { SchoolLoginDialog } from "./SchoolLoginDialog";
import { WhatsAppGlyph } from "./WhatsAppGlyph";

const LINK = "rounded-sm text-hp-quiet transition-colors hover:text-hp-ink focus-visible:ring-2 focus-visible:ring-hp-brand focus-visible:outline-none";

/*
 * The marketing site's footer, on the light grey band under a hairline: SNCMT with one line about
 * it and our contacts (WhatsApp always; phone, email and address when set), the homepage's sections
 * with the contact and app pages, and the way an institution already with us logs in. Under them the copyright.
 */
export async function MarketingFooter() {
  const [t, tNav, tFloating] = await Promise.all([
    getTranslations("marketing.footer"),
    getTranslations("marketing.nav"),
    getTranslations("marketing.floating"),
  ]);
  const brand = (await getTranslations("marketing"))("brand");
  const { phone, email, address, whatsapp } = companyContact;

  return (
    <footer className="hp-sans border-t border-hp-hair bg-hp-canvas text-hp-ink">
      <div className={`${HP_PAGE} grid gap-x-12 gap-y-10 py-14 sm:grid-cols-2 sm:py-16 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,1.1fr)]`}>
        {/* who we are, and how to reach us */}
        <div className="sm:col-span-2 lg:col-span-1">
          <Link
            href="/"
            className="inline-flex items-center gap-3 rounded-md text-[22px] leading-none font-extrabold tracking-[-0.02em] text-hp-deep focus-visible:ring-2 focus-visible:ring-hp-brand focus-visible:outline-none"
          >
            <Image src={logo} alt="" width={48} height={44} className="h-11 w-auto shrink-0" />
            <span className="translate-y-[3px]">{brand}</span>
          </Link>
          <p className="mt-4 max-w-md text-base leading-[1.65] text-hp-quiet">{t("about")}</p>

          <h2 className="sr-only">{t("contact")}</h2>
          <ul className="mt-6 grid gap-3 text-base">
            <Contact icon={<WhatsAppGlyph className="size-[18px] text-[#25D366]" />}>
              <a href={whatsappLink(whatsapp, tFloating("whatsappText"))} target="_blank" rel="noopener noreferrer" className={`${LINK} tabular-nums`}>
                {t("whatsapp")}: {displayPhone(whatsapp)}
              </a>
            </Contact>
            {phone && (
              <Contact icon={<Phone className="size-[18px] text-hp-brand" />}>
                <a href={`tel:${phone}`} className={`${LINK} tabular-nums`}>
                  {localPhone(phone)}
                </a>
              </Contact>
            )}
            {email && (
              <Contact icon={<Mail className="size-[18px] text-hp-brand" />}>
                <a href={`mailto:${email}`} className={`${LINK} break-all`}>
                  {email}
                </a>
              </Contact>
            )}
            {address && (
              <Contact icon={<MapPin className="size-[18px] text-hp-brand" />}>
                <span className="text-hp-quiet">{address}</span>
              </Contact>
            )}
          </ul>
        </div>

        {/* the page's sections, and the app */}
        <nav aria-labelledby="footer-links">
          <h2 id="footer-links" className="mb-4 text-base font-bold text-hp-deep">
            {t("links")}
          </h2>
          <ul className="grid gap-2.5 text-base">
            {MARKETING_SECTIONS.map((section) => (
              <li key={section}>
                <a href={sectionHref(section, false)} className={LINK}>
                  {tNav(section)}
                </a>
              </li>
            ))}
            <li>
              <Link href={contactHref()} className={LINK}>
                {t("contactPage")}
              </Link>
            </li>
            <li>
              <Link href="/app" className={`${LINK} inline-flex items-center gap-1.5`}>
                <Smartphone aria-hidden className="size-4" />
                {t("appPage")}
              </Link>
            </li>
          </ul>
        </nav>

        {/* institutions already with us */}
        <div>
          <h2 className="mb-4 text-base font-bold text-hp-deep">{t("schools")}</h2>
          <p className="max-w-xs text-base leading-[1.6] text-hp-quiet">{t("login")}</p>
          <SchoolLoginDialog
            trigger={
              <button
                type="button"
                className="mt-4 inline-flex h-[46px] items-center rounded-xl border border-hp-deep bg-white px-5 text-base font-semibold text-hp-deep transition-colors hover:bg-hp-wash focus-visible:ring-2 focus-visible:ring-hp-brand focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {t("loginButton")}
              </button>
            }
          />
        </div>
      </div>

      {/* the last line keeps clear of the fixed WhatsApp and back-to-top buttons at the bottom right */}
      <div className="border-t border-hp-hair">
        <div className={`${HP_PAGE} flex flex-col gap-1.5 pt-6 pb-24 text-[15px] text-hp-quiet sm:flex-row sm:justify-between sm:pr-20 sm:pb-6`}>
          <p>{t("rights", { year: new Date().getFullYear(), name: brand })}</p>
          <p>{t("made")}</p>
        </div>
      </div>
    </footer>
  );
}

// one way to reach us: its icon and the link
function Contact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white">
        {icon}
      </span>
      {children}
    </li>
  );
}
