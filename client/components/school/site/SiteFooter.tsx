import { Mail, MapPin, Phone, School } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { pickName } from "@/lib/i18n/names";
import { hasAdmission, type SchoolSite } from "@/lib/site";

// "+8801712345678" -> "01712345678", how people here write it
const localPhone = (phone: string) => phone.replace(/^\+?880/, "0");

/** The homepage's footer, in the school's colour: who it is, the sections, how to reach it. */
export async function SiteFooter({ school }: { school: SchoolSite }) {
  const [t, tNav, locale] = await Promise.all([getTranslations("schoolHome.footer"), getTranslations("schoolHome.nav"), getLocale()]);
  const name = pickName(school, locale);
  const links = [
    hasAdmission(school.admission) && { href: "#admission", label: tNav("admission") },
    { href: "#notices", label: tNav("notices") },
    { href: "#contact", label: tNav("contact") },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <footer className="dark relative overflow-hidden bg-school-sidebar text-white">
      <div aria-hidden className="site-dots absolute inset-0 text-white/[0.04]" />
      <div aria-hidden className="absolute -top-24 right-0 size-80 rounded-full bg-sidebar-primary/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-school-sidebar">
              {school.logo ? (
                // eslint-disable-next-line @next/next/no-img-element -- school logos can be on any host
                <img src={school.logo} alt="" className="size-11 object-contain" />
              ) : (
                <School className="size-6" />
              )}
            </span>
            <span className="text-lg leading-tight font-bold">{name}</span>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-white/70">{t("about")}</p>
        </div>

        <nav aria-label={t("links")}>
          <h3 className="mb-4 text-xs font-semibold tracking-[0.16em] text-sidebar-primary uppercase">{t("links")}</h3>
          <ul className="space-y-2.5 text-sm">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="text-white/80 transition-colors hover:text-white">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h3 className="mb-4 text-xs font-semibold tracking-[0.16em] text-sidebar-primary uppercase">{t("reach")}</h3>
          <ul className="space-y-3 text-sm text-white/80">
            {school.phone && (
              <li className="flex items-center gap-3">
                <Phone className="size-4 shrink-0 text-white/50" />
                <a href={`tel:${school.phone}`} className="tabular-nums hover:text-white">
                  {localPhone(school.phone)}
                </a>
              </li>
            )}
            {school.publicEmail && (
              <li className="flex items-center gap-3">
                <Mail className="size-4 shrink-0 text-white/50" />
                <a href={`mailto:${school.publicEmail}`} className="break-all hover:text-white">
                  {school.publicEmail}
                </a>
              </li>
            )}
            {school.address && (
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-white/50" />
                <span className="whitespace-pre-line">{school.address}</span>
              </li>
            )}
          </ul>
        </div>
      </div>
      <div className="relative border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-white/60">{t("rights", { year: new Date().getFullYear(), name })}</p>
      </div>
    </footer>
  );
}
