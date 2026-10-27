import { Mail, MapPin, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { companyContact, localPhone } from "@/lib/marketing/company";
import { ContactForm } from "./ContactForm";
import { MkHeading } from "./MkHeading";

/** The last section: one card, the way it works on ink at the left and the form at the right. */
export async function ContactSection() {
  const t = await getTranslations("marketing.contact");
  const { phone, email, address } = companyContact;

  return (
    <section id="contact" className="relative scroll-mt-16 bg-canvas py-20 sm:py-28">
      <div aria-hidden className="site-hero-grid absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-4">
        <MkHeading index="03" eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />

        <div className="grid overflow-hidden rounded-3xl border bg-card shadow-[0_30px_80px_-30px_rgb(15_20_60/0.25)] lg:grid-cols-[2fr_3fr]">
          <aside className="dark relative isolate overflow-hidden bg-mk-ink p-8 text-white sm:p-10">
            <div aria-hidden className="absolute -right-24 -bottom-24 -z-10 size-72 rounded-full bg-mk-violet/40 blur-3xl" />
            <div aria-hidden className="absolute -top-16 -left-16 -z-10 size-48 rounded-full bg-mk-amber/15 blur-3xl" />

            <h3 className="text-2xl font-bold tracking-tight">{t("stepsTitle")}</h3>
            <ol className="mt-8 space-y-6">
              {(["step1", "step2", "step3"] as const).map((key, i) => (
                <li key={key} className="relative flex gap-4">
                  {/* a line joining the numbers */}
                  {i < 2 && <span aria-hidden className="absolute top-9 bottom-[-1.25rem] left-[1.0625rem] w-px bg-white/15" />}
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-mk-amber/40 bg-mk-amber/10 font-mono text-sm font-bold text-mk-amber">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block font-semibold">{t(`${key}.title`)}</span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-white/60">{t(`${key}.body`)}</span>
                  </span>
                </li>
              ))}
            </ol>

            {(phone || email || address) && (
              <ul className="mt-10 space-y-3.5 border-t border-white/10 pt-8 text-sm">
                {phone && (
                  <li>
                    <a href={`tel:${phone}`} className="group flex items-center gap-3 text-white/85 hover:text-white">
                      <ContactIcon icon={Phone} />
                      <span className="tabular-nums">{localPhone(phone)}</span>
                    </a>
                  </li>
                )}
                {email && (
                  <li>
                    <a href={`mailto:${email}`} className="group flex items-center gap-3 break-all text-white/85 hover:text-white">
                      <ContactIcon icon={Mail} />
                      {email}
                    </a>
                  </li>
                )}
                {address && (
                  <li className="flex items-start gap-3 text-white/85">
                    <ContactIcon icon={MapPin} />
                    <span className="pt-1.5 whitespace-pre-line">{address}</span>
                  </li>
                )}
              </ul>
            )}
          </aside>

          <div className="p-6 sm:p-10">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactIcon({ icon: Icon }: { icon: typeof Phone }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-mk-amber transition-colors group-hover:bg-mk-amber group-hover:text-mk-ink">
      <Icon className="size-4" />
    </span>
  );
}
