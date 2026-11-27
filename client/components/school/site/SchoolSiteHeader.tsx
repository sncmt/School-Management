import { LayoutDashboard, LogIn, Mail, MapPin, Phone, School } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { Fragment } from "react";
import { authRoutes, publicSchoolRoutes, sessionFlagCookie } from "@/lib/auth/routes";
import { pickName } from "@/lib/i18n/names";
import { localPhone } from "@/lib/marketing/company";
import { siteChapters, type SchoolSite } from "@/lib/site";
import { SiteLanguageMenu } from "./SiteLanguageMenu";
import { SiteNav, type SiteLink } from "./SiteNav";
import { siteContainer, siteFocus, splitName } from "./siteStyles";

/*
 * The header of the school's public homepage, as in the mockup, in two parts:
 * - a 40px white utility bar, all in the school's deep accent (13px text, its icons, light bars): phone, email and
 *   address on the left, parted by light bars; the way in ("Log in", or
 *   "Dashboard" once logged in) and the language on the right. It scrolls away with the page;
 * - the 80px white bar under it, which stays at the top (a little see-through, a hairline and a
 *   soft shadow under it): the school's 56px round logo and its name over two lines in the deep
 *   accent, and the menu (Home, then the homepage's parts; About gathers the teachers under it).
 * The sections' scroll margins allow for the 80px bar.
 */
export async function SchoolSiteHeader({ school, onHome = true }: { school: SchoolSite; onHome?: boolean }) {
  const [t, locale, jar] = await Promise.all([getTranslations("schoolHome"), getLocale(), cookies()]);
  const name = pickName(school, locale);
  const [first, second] = splitName(name);
  const loggedIn = jar.has(sessionFlagCookie.SCHOOL);
  const address = school.address ? shortAddress(school.address) : null;
  const login = authRoutes.SCHOOL.login;

  const chapters = siteChapters(school);
  const link = (id: (typeof chapters)[number]): SiteLink => ({ href: `${publicSchoolRoutes.home}#${id}`, label: t(`nav.${id}`), section: id });
  // the menu: Home, then the homepage's parts in page order; the teachers sit under About
  const links: SiteLink[] = [
    { href: publicSchoolRoutes.home, label: t("nav.home"), section: "top" },
    ...chapters
      .filter((id) => id !== "teachers" || !chapters.includes("about"))
      .map((id) => (id === "about" && chapters.includes("teachers") ? { ...link(id), children: [link("about"), link("teachers")] } : link(id))),
  ];

  // the utility bar's contacts, each after a light bar but the first
  const contacts = [
    school.phone && (
      <a key="phone" href={`tel:${school.phone}`} className="flex items-center gap-1.5 tabular-nums hover:underline">
        <Phone className="size-3 text-brand-ink" />
        <span>{localPhone(school.phone)}</span>
      </a>
    ),
    school.publicEmail && (
      <a key="email" href={`mailto:${school.publicEmail}`} className="hidden items-center gap-1.5 transition hover:text-brand-ink sm:flex">
        <Mail className="size-3 text-brand-ink" />
        <span>{school.publicEmail}</span>
      </a>
    ),
    address && (
      <span key="address" className="hidden min-w-0 items-center gap-1.5 md:flex" title={school.address!.replace(/\s*\n\s*/g, ", ")}>
        <MapPin className="size-3 shrink-0 text-brand-ink" />
        <span className="truncate">{address}</span>
      </span>
    ),
  ].filter(Boolean);
  const bar = (key: string, from: "sm" | "md" | "always") => (
    <span key={key} aria-hidden className={from === "always" ? "text-brand-ink/30" : from === "sm" ? "hidden text-brand-ink/30 sm:inline" : "hidden text-brand-ink/30 md:inline"}>
      |
    </span>
  );

  return (
    <>
      {/* the utility bar: scrolls away */}
      <div className="no-print border-b border-slate-100 bg-white text-[13px] text-brand-ink">
        <div className={`${siteContainer} flex h-10 items-center justify-between gap-2`}>
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            {contacts.map((c, i) => (
              <Fragment key={i}>
                {i > 0 && bar(`bar-${i}`, i === 1 ? "sm" : "md")}
                {c}
              </Fragment>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-4 text-xs font-medium text-brand-ink">
            {loggedIn ? (
              <Link href={authRoutes.SCHOOL.home} className={`inline-flex items-center gap-1.5 rounded-sm hover:underline ${siteFocus}`}>
                <LayoutDashboard aria-hidden className="size-3.5" />
                {t("dashboard")}
              </Link>
            ) : (
              <Link href={login} className={`inline-flex items-center gap-1.5 rounded-sm hover:underline ${siteFocus}`}>
                <LogIn aria-hidden className="size-3.5" />
                {t("logIn")}
              </Link>
            )}
            {bar("language-bar", "always")}
            <SiteLanguageMenu />
          </div>
        </div>
      </div>

      {/* the school and its menu: stays at the top */}
      <header className="no-print sticky top-0 z-40 border-b border-slate-100 bg-white/95 shadow-[0_2px_15px_-3px_rgb(10_74_99/0.06)] backdrop-blur-sm">
        <div className={`${siteContainer} flex h-20 items-center justify-between gap-4`}>
          <Link href={publicSchoolRoutes.home} className={`group flex min-w-0 items-center gap-3.5 rounded-sm ${siteFocus}`}>
            <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-brand-ink">
              {school.logo ? (
                // eslint-disable-next-line @next/next/no-img-element -- school logos can be on any host
                <img src={school.logo} alt="" className="size-full object-contain" />
              ) : (
                <School className="size-7" />
              )}
            </span>
            <span className="site-serif min-w-0 font-bold text-brand-ink">
              <span className="block truncate text-base leading-tight sm:text-lg">{first}</span>
              {second && <span className="block truncate text-sm leading-tight sm:text-base">{second}</span>}
            </span>
          </Link>
          <SiteNav
            links={links}
            account={{ href: loggedIn ? authRoutes.SCHOOL.home : login, label: loggedIn ? t("dashboard") : t("logIn") }}
            labels={{ menu: t("nav.menu"), close: t("nav.closeMenu"), nav: t("nav.label") }}
            onHome={onHome}
          />
        </div>
      </header>
    </>
  );
}

// "House 10, Road 4, Kajla, Jatrabari, Dhaka" -> "Jatrabari, Dhaka": the last two parts, split at
// commas and line breaks (the whole address is in the footer)
const shortAddress = (address: string) =>
  address
    .split(/[,\n]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(-2)
    .join(", ");
