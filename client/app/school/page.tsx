import { ArrowRight, Globe, Mail, MapPin, Megaphone, Phone, School } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { authRoutes, publicSchoolRoutes, sessionFlagCookie } from "@/lib/auth/routes";
import { pickName } from "@/lib/i18n/names";
import { getCurrentSchoolSite } from "@/lib/site.server";

export async function generateMetadata(): Promise<Metadata> {
  const [school, locale] = await Promise.all([getCurrentSchoolSite(), getLocale()]);
  return school ? { title: pickName(school, locale) } : {};
}

// "+8801712345678" -> "01712345678", how people here write it
const localPhone = (phone: string) => phone.replace(/^\+?880/, "0");

/** A school's public homepage (no login): its name and logo, the way in, and how to reach it. */
export default async function SchoolHomePage() {
  const [t, locale, school, jar] = await Promise.all([getTranslations("schoolHome"), getLocale(), getCurrentSchoolSite(), cookies()]);
  // the school layout has already 404'd an unknown or inactive school
  if (!school) return null;
  const name = pickName(school, locale);
  // the other language's name under it, when the school has both
  const otherName = locale === "bn" ? school.nameEn : school.nameBn;
  const loggedIn = jar.has(sessionFlagCookie.SCHOOL);
  const year = new Date().getFullYear();

  const contacts = [
    school.address && { icon: MapPin, label: t("contact.address"), value: school.address },
    school.phone && { icon: Phone, label: t("contact.phone"), value: localPhone(school.phone), href: `tel:${school.phone}` },
    school.publicEmail && { icon: Mail, label: t("contact.email"), value: school.publicEmail, href: `mailto:${school.publicEmail}` },
    school.website && { icon: Globe, label: t("contact.website"), value: school.website.replace(/^https?:\/\//, ""), href: school.website, external: true },
  ].filter(Boolean) as { icon: typeof MapPin; label: string; value: string; href?: string; external?: boolean }[];

  const logo = (size: string, icon: string) =>
    school.logo ? (
      // eslint-disable-next-line @next/next/no-img-element -- school logos can be on any host
      <img src={school.logo} alt="" className={`${size} object-contain`} />
    ) : (
      <School className={icon} />
    );

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-canvas">
      {/* top bar */}
      <header className="border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-navy ring-1 ring-border">
            {logo("size-8", "size-5")}
          </span>
          <span className="min-w-0 flex-1 truncate font-semibold">{name}</span>
          <LanguageSwitcher className="hidden bg-background sm:flex" />
          <Button asChild size="sm" variant={loggedIn ? "default" : "outline"}>
            <Link href={loggedIn ? authRoutes.SCHOOL.home : authRoutes.SCHOOL.login}>{loggedIn ? t("openApp") : t("logIn")}</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        {/* hero: the school's logo and name, on the navy of the app's sidebar */}
        <section className="relative overflow-hidden bg-navy text-navy-foreground">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]"
          />
          <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-brand/30 blur-3xl" />
          <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-16 text-center sm:py-24">
            <span className="flex size-28 items-center justify-center overflow-hidden rounded-3xl bg-white text-navy shadow-xl ring-4 ring-white/15 sm:size-32">
              {logo("size-24 sm:size-28", "size-14")}
            </span>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-5xl">{name}</h1>
              {otherName && otherName !== name && <p className="text-lg text-white/75 sm:text-xl">{otherName}</p>}
            </div>
            <p className="max-w-xl text-white/80">{t("tagline")}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-white text-navy hover:bg-white/90">
                <Link href={publicSchoolRoutes.noticeBoard}>
                  <Megaphone /> {t("noticeBoard")}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link href={loggedIn ? authRoutes.SCHOOL.home : authRoutes.SCHOOL.login}>
                  {loggedIn ? t("openApp") : t("logIn")} <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* contact */}
        <section className="mx-auto max-w-5xl px-4 py-14 sm:py-16">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight">{t("contact.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("contact.subtitle")}</p>
          </div>
          {contacts.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">{t("contact.none")}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {contacts.map(({ icon: Icon, label, value, href, external }) => (
                <ContactCard key={label} icon={<Icon className="size-5" />} label={label} value={value} href={href} external={external} />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-muted-foreground">
          <span>
            © {year} {name}
          </span>
          <LanguageSwitcher className="bg-background sm:hidden" />
        </div>
      </footer>
    </div>
  );
}

function ContactCard({ icon, label, value, href, external }: { icon: ReactNode; label: string; value: string; href?: string; external?: boolean }) {
  const body = (
    <>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
        <span className="block font-medium break-words whitespace-pre-line">{value}</span>
      </span>
    </>
  );
  const box = "flex items-start gap-4 rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)]";
  return href ? (
    <a href={href} {...(external ? { target: "_blank", rel: "noreferrer" } : {})} className={`${box} transition-colors hover:border-brand/40`}>
      {body}
    </a>
  ) : (
    <div className={box}>{body}</div>
  );
}
