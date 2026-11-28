import { Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { ContactForm } from "@/components/marketing/ContactForm";
import { HP_PAGE } from "@/components/marketing/MarketingHeader";
import { WhatsAppGlyph } from "@/components/marketing/WhatsAppGlyph";
import { companyContact, displayPhone, localPhone, whatsappLink } from "@/lib/marketing/company";
import { chosenPlan } from "@/lib/marketing/packages";
import { getPublicPackages } from "@/lib/marketing/packages.server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.contact");
  return { title: t("metaTitle"), description: t("subtitle") };
}

/*
 * The contact page (sncmt.com/contact), on the homepage's pale teal wash: the heading, then
 * WhatsApp first (the quickest way to reach us), what happens next and our other contacts on the
 * left, and the form on a white card on the right (under them on a narrow screen). A package card's
 * button links here with its package already chosen (?package=STANDARD&billing=YEARLY).
 */
export default async function ContactPage({ searchParams }: { searchParams: Promise<{ package?: string; billing?: string }> }) {
  const [t, tFloating, packages, query] = await Promise.all([
    getTranslations("marketing.contact"),
    getTranslations("marketing.floating"),
    getPublicPackages(),
    searchParams,
  ]);
  const { phone, email, address, whatsapp } = companyContact;
  const chat = whatsappLink(whatsapp, tFloating("whatsappText"));

  return (
    <section aria-labelledby="contact-title" className="hp-sans hp-hero relative overflow-hidden">
      <div className={`${HP_PAGE} relative pt-12 pb-16 sm:pt-16 sm:pb-24`}>
        <div className="mb-10 max-w-[760px] sm:mb-12">
          <h1
            id="contact-title"
            className="mb-3.5 text-[length:clamp(32px,4.4vw,56px)] leading-[1.08] font-extrabold tracking-[-0.035em] text-balance text-hp-deep [:lang(bn)_&]:leading-[1.25] [:lang(bn)_&]:font-bold [:lang(bn)_&]:tracking-normal"
          >
            {t("title")}
          </h1>
          <p className="text-lg leading-[1.65] text-hp-quiet sm:text-xl">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-14">
          <div className="grid gap-10 max-lg:order-2">
            {/* WhatsApp, set apart: the number large, the button in WhatsApp's green */}
            <div className="rounded-[18px] border border-hp-hair bg-white p-6">
              <p className="flex items-center gap-3 text-lg font-bold text-hp-deep">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white">
                  <WhatsAppGlyph className="size-5" />
                </span>
                {t("whatsapp.title")}
              </p>
              <p className="mt-2.5 text-base leading-[1.6] text-hp-quiet">{t("whatsapp.body")}</p>
              <a href={chat} target="_blank" rel="noopener noreferrer" className="mt-4 block text-[28px] leading-none font-bold text-hp-deep tabular-nums hover:underline">
                {displayPhone(whatsapp)}
              </a>
              <a
                href={chat}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 text-base font-semibold whitespace-nowrap text-hp-deep transition-colors hover:bg-[#1fbe5a] focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <WhatsAppGlyph className="size-5" />
                {t("whatsapp.button")}
              </a>
            </div>

            {/* a real order: send, see it working, go live */}
            <div>
              <h2 className="text-xl font-bold text-hp-deep">{t("stepsTitle")}</h2>
              <ol className="mt-5 grid gap-5">
                {(["step1", "step2", "step3"] as const).map((key, i) => (
                  <li key={key} className="flex gap-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-hp-wash text-base font-bold text-hp-brand-ink tabular-nums">{i + 1}</span>
                    <span>
                      <span className="block text-[17px] font-semibold text-hp-ink">{t(`${key}.title`)}</span>
                      <span className="mt-1 block text-base leading-[1.6] text-hp-quiet">{t(`${key}.body`)}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {(phone || email || address) && (
              <div>
                <h2 className="text-xl font-bold text-hp-deep">{t("other")}</h2>
                <ul className="mt-4 grid gap-3 text-base">
                  {phone && (
                    <Way icon={<Phone className="size-[18px]" />}>
                      <a href={`tel:${phone}`} className="tabular-nums hover:underline">
                        {localPhone(phone)}
                      </a>
                    </Way>
                  )}
                  {email && (
                    <Way icon={<Mail className="size-[18px]" />}>
                      <a href={`mailto:${email}`} className="break-all hover:underline">
                        {email}
                      </a>
                    </Way>
                  )}
                  {address && (
                    <Way icon={<MapPin className="size-[18px]" />}>
                      <span className="whitespace-pre-line">{address}</span>
                    </Way>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* the form, first on a narrow screen */}
          <div className="rounded-[20px] border border-hp-hair bg-white p-5 shadow-[0_30px_60px_-36px_oklch(0.3_0.08_200/0.35)] sm:p-8 max-lg:order-1">
            <h2 className="text-2xl font-bold text-hp-deep">{t("formTitle")}</h2>
            <p className="mt-1.5 mb-6 text-base text-hp-quiet">{t("formBody")}</p>
            <ContactForm packages={packages} plan={chosenPlan(packages, query.package, query.billing)} />
          </div>
        </div>
      </div>
    </section>
  );
}

// one way to reach us: its icon and the link
function Way({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-hp-ink">
      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-hp-wash text-hp-brand-ink">
        {icon}
      </span>
      <span className="pt-1">{children}</span>
    </li>
  );
}
