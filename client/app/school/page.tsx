import { Globe, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { AboutSection } from "@/components/school/site/AboutSection";
import { AdmissionSection } from "@/components/school/site/AdmissionSection";
import { GallerySection } from "@/components/school/site/GallerySection";
import { HeroSection } from "@/components/school/site/HeroSection";
import { NoticesSection } from "@/components/school/site/NoticesSection";
import { SchoolSiteHeader } from "@/components/school/site/SchoolSiteHeader";
import { SectionHeading } from "@/components/school/site/SectionHeading";
import { SiteFooter } from "@/components/school/site/SiteFooter";
import { pickName } from "@/lib/i18n/names";
import { hasAbout, hasAdmission } from "@/lib/site";
import { getCurrentSchoolSite } from "@/lib/site.server";

export async function generateMetadata(): Promise<Metadata> {
  const [school, locale] = await Promise.all([getCurrentSchoolSite(), getLocale()]);
  return school ? { title: pickName(school, locale) } : {};
}

// "+8801712345678" -> "01712345678", how people here write it
const localPhone = (phone: string) => phone.replace(/^\+?880/, "0");

/**
 * A school's public homepage (no login), its only page: the header, the hero (words on the left,
 * the image slider on the right), then a section per menu item (about, admission, gallery,
 * notices, contact; those the school left empty are skipped) and the footer; the menu scrolls to
 * the sections.
 */
export default async function SchoolHomePage() {
  const [t, locale, school] = await Promise.all([getTranslations("schoolHome"), getLocale(), getCurrentSchoolSite()]);
  // the school layout has already 404'd an unknown or inactive school
  if (!school) return null;
  const name = pickName(school, locale);
  // the other language's name under it, when the school has both
  const otherName = locale === "bn" ? school.nameEn : school.nameBn;

  const contacts = [
    school.address && { icon: MapPin, label: t("contact.address"), value: school.address },
    school.phone && { icon: Phone, label: t("contact.phone"), value: localPhone(school.phone), href: `tel:${school.phone}` },
    school.publicEmail && { icon: Mail, label: t("contact.email"), value: school.publicEmail, href: `mailto:${school.publicEmail}` },
    school.website && { icon: Globe, label: t("contact.website"), value: school.website.replace(/^https?:\/\//, ""), href: school.website, external: true },
  ].filter(Boolean) as { icon: typeof MapPin; label: string; value: string; href?: string; external?: boolean }[];

  return (
    <div className="site-home flex min-h-screen flex-1 flex-col bg-canvas">
      <SchoolSiteHeader school={school} />

      <main className="flex-1">
        <HeroSection school={school} name={name} otherName={otherName} />

        {hasAbout(school.about) && <AboutSection about={school.about} name={name} />}

        {hasAdmission(school.admission) && <AdmissionSection admission={school.admission} />}

        {school.gallery.length > 0 && <GallerySection photos={school.gallery} />}

        <NoticesSection subdomain={school.subdomain} />

        <section id="contact" className="scroll-mt-20 border-t bg-card">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
            <SectionHeading eyebrow={t("contact.eyebrow")} title={t("contact.title")} subtitle={t("contact.subtitle")} />
            {contacts.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">{t("contact.none")}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {contacts.map(({ icon: Icon, label, value, href, external }) => (
                  <ContactCard key={label} icon={<Icon className="size-5" />} label={label} value={value} href={href} external={external} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter school={school} />
    </div>
  );
}

function ContactCard({ icon, label, value, href, external }: { icon: ReactNode; label: string; value: string; href?: string; external?: boolean }) {
  const body = (
    <>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-school-sidebar text-white shadow-md shadow-school-sidebar/20 transition-transform group-hover:scale-105">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
        <span className="block font-medium break-words whitespace-pre-line">{value}</span>
      </span>
    </>
  );
  const box = "group flex items-start gap-4 rounded-xl border bg-background p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)]";
  return href ? (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className={`${box} transition-all hover:-translate-y-0.5 hover:border-school-sidebar/30 hover:shadow-lg`}
    >
      {body}
    </a>
  ) : (
    <div className={box}>{body}</div>
  );
}
