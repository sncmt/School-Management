import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { companyContact, whatsappLink } from "@/lib/marketing/company";
import { contactHref } from "@/lib/marketing/packages";
import { HP_PAGE } from "./MarketingHeader";
import { WhatsAppGlyph } from "./WhatsAppGlyph";

// the questions, in order (marketing.faq.items.*)
const QUESTIONS = ["start", "internet", "sms", "online", "tracks", "safety", "custom", "app"] as const;

/*
 * Questions people ask before they start, on white: the heading on the left with a box for
 * anything else (WhatsApp, or the contact page), and the questions on the right, split by hairlines. Each
 * opens on a click (a native <details>, so it works before the page's scripts load); a round plus
 * turns into a teal minus. The first starts open. On a narrow screen the box moves under the questions.
 */
export async function Faq() {
  const [t, tFloating] = await Promise.all([getTranslations("marketing.faq"), getTranslations("marketing.floating")]);
  const chat = whatsappLink(companyContact.whatsapp, tFloating("whatsappText"));

  return (
    <section id="faq" aria-labelledby="faq-title" className="hp-sans scroll-mt-[68px] border-t border-hp-hair bg-white py-16 sm:py-24 lg:py-28">
      <div
        className={`${HP_PAGE} grid grid-cols-1 gap-7 [grid-template-areas:'head'_'qa'_'ask'] md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.35fr)] md:grid-rows-[auto_1fr] md:items-start md:gap-x-12 md:[grid-template-areas:'head_qa'_'ask_qa'] lg:gap-x-20`}
      >
        <div className="[grid-area:head]">
          <h2
            id="faq-title"
            className="mb-3.5 text-[length:clamp(30px,3.8vw,48px)] leading-[1.12] font-extrabold tracking-[-0.035em] text-balance text-hp-deep [:lang(bn)_&]:leading-[1.3] [:lang(bn)_&]:font-bold [:lang(bn)_&]:tracking-normal"
          >
            {t("title")}
          </h2>
          <p className="text-lg leading-[1.65] text-hp-quiet sm:text-xl">{t("subtitle")}</p>
        </div>

        <div className="border-t border-hp-hair [grid-area:qa]">
          {QUESTIONS.map((key, i) => (
            <details key={key} open={i === 0} className="group border-b border-hp-hair">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-5 rounded-md py-[18px] text-[17.5px] leading-[1.4] font-bold text-hp-deep hover:text-hp-brand-ink focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-hp-brand sm:py-[22px] sm:text-[19px] [&::-webkit-details-marker]:hidden">
                {t(`items.${key}.q`)}
                {/* a plus that turns into a minus when the answer is open */}
                <span
                  aria-hidden
                  className="relative size-[34px] shrink-0 rounded-full bg-hp-wash group-open:bg-hp-brand before:absolute before:top-1/2 before:left-1/2 before:-mt-px before:-ml-[7px] before:h-0.5 before:w-3.5 before:rounded-sm before:bg-hp-brand-ink group-open:before:bg-white after:absolute after:top-1/2 after:left-1/2 after:-mt-px after:-ml-[7px] after:h-0.5 after:w-3.5 after:rotate-90 after:rounded-sm after:bg-hp-brand-ink after:transition-transform group-open:after:rotate-0 group-open:after:bg-white motion-reduce:after:transition-none"
                />
              </summary>
              <p className="-mt-1.5 mb-6 max-w-[62ch] text-base leading-[1.7] text-hp-quiet sm:mr-[54px] sm:text-[17px]">
                {t(`items.${key}.a`)}
              </p>
            </details>
          ))}
        </div>

        {/* anything else: WhatsApp, or the contact page */}
        <div className="rounded-[18px] border border-hp-hair bg-hp-canvas px-[22px] pt-[22px] pb-6 [grid-area:ask]">
          <p className="text-[19px] font-bold text-hp-deep">{t("askTitle")}</p>
          <p className="mt-1.5 mb-[18px] text-base leading-[1.6] text-hp-quiet sm:text-[16.5px]">{t("askBody")}</p>
          <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2.5">
            <a
              href={chat}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-[46px] items-center gap-2.5 rounded-xl border border-hp-hair bg-white px-[18px] text-base font-semibold text-hp-ink transition-colors hover:border-[#25D366] focus-visible:ring-2 focus-visible:ring-hp-brand focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <WhatsAppGlyph className="size-5 text-[#25D366]" />
              {t("askWhatsapp")}
            </a>
            <Link
              href={contactHref()}
              className="text-base font-semibold text-hp-brand-ink underline decoration-hp-brand/30 decoration-2 underline-offset-[5px] hover:decoration-hp-brand focus-visible:ring-2 focus-visible:ring-hp-brand focus-visible:outline-none"
            >
              {t("askForm")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
