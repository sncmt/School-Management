import { Mail, Phone, School } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { authRoutes, publicSchoolRoutes, sessionFlagCookie } from "@/lib/auth/routes";
import { pickName } from "@/lib/i18n/names";
import { hasAdmission, type SchoolSite } from "@/lib/site";
import { SiteNav, type SiteLink } from "./SiteNav";

// "+8801712345678" -> "01712345678", how people here write it
const localPhone = (phone: string) => phone.replace(/^\+?880/, "0");

/*
 * The header of the school's public homepage, in two parts:
 *   upper: white, the school's phone and email (its public email, or else its super admin's)
 *   lower: the school's sidebar colour, its logo and name, the menu and the way in; it stays
 *          at the top while the page scrolls, so the two are siblings of the page, not one box
 * The menu items are the homepage's sections, and scroll to them.
 */
export async function SchoolSiteHeader({ school }: { school: SchoolSite }) {
  const [t, locale, jar] = await Promise.all([getTranslations("schoolHome"), getLocale(), cookies()]);
  const name = pickName(school, locale);
  const loggedIn = jar.has(sessionFlagCookie.SCHOOL);

  const section = (id: string, label: string): SiteLink => ({ href: `${publicSchoolRoutes.home}#${id}`, label, section: id });
  const links: SiteLink[] = [
    { href: publicSchoolRoutes.home, label: t("nav.home"), section: "top" },
    // only when the school has written something for it
    ...(hasAdmission(school.admission) ? [section("admission", t("nav.admission"))] : []),
    section("notices", t("nav.notices")),
    section("contact", t("nav.contact")),
  ];

  return (
    <>
      {/* white in both themes, as asked: the text keeps its own dark shades */}
      {(school.phone || school.publicEmail) && (
        <div className="no-print border-b border-slate-200 bg-white text-slate-600">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-x-6 gap-y-1 px-4 py-2 text-xs sm:text-sm">
            {school.phone && (
              <a href={`tel:${school.phone}`} className="inline-flex items-center gap-2 hover:text-slate-900">
                <Phone className="size-3.5 text-school-sidebar" />
                <span className="tabular-nums">{localPhone(school.phone)}</span>
              </a>
            )}
            {school.publicEmail && (
              <a href={`mailto:${school.publicEmail}`} className="inline-flex min-w-0 items-center gap-2 hover:text-slate-900">
                <Mail className="size-3.5 shrink-0 text-school-sidebar" />
                <span className="truncate">{school.publicEmail}</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* "dark" so the gold underline takes the sidebar's own colour */}
      <header className="dark no-print sticky top-0 z-30 bg-school-sidebar text-white shadow-[0_2px_10px_rgb(0_0_0/0.12)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:h-[72px]">
          <Link href={publicSchoolRoutes.home} className="flex min-w-0 flex-1 items-center gap-3 lg:flex-none">
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white text-school-sidebar sm:size-11">
              {school.logo ? (
                // eslint-disable-next-line @next/next/no-img-element -- school logos can be on any host
                <img src={school.logo} alt="" className="size-9 object-contain sm:size-10" />
              ) : (
                <School className="size-5" />
              )}
            </span>
            <span className="truncate text-[15px] font-bold tracking-tight sm:text-lg">{name}</span>
          </Link>
          <SiteNav
            links={links}
            account={{ href: loggedIn ? authRoutes.SCHOOL.home : authRoutes.SCHOOL.login, label: loggedIn ? t("openApp") : t("logIn") }}
            labels={{ menu: t("nav.menu"), close: t("nav.closeMenu") }}
          />
        </div>
      </header>
    </>
  );
}
