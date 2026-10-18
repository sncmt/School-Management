import { School } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { authRoutes, publicSchoolRoutes, sessionFlagCookie } from "@/lib/auth/routes";
import { pickName } from "@/lib/i18n/names";
import { getCurrentSchoolSite } from "@/lib/site.server";

// The school's public notice pages: no login, the school's name on top.
export default async function PublicNoticeLayout({ children }: { children: ReactNode }) {
  const [t, locale, school, jar] = await Promise.all([getTranslations("publicNotices"), getLocale(), getCurrentSchoolSite(), cookies()]);
  // the parent layout has already 404'd a missing school
  const name = school ? pickName(school, locale) : "";
  const loggedIn = jar.has(sessionFlagCookie.SCHOOL);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-canvas">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link href={publicSchoolRoutes.noticeBoard} className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand text-brand-foreground">
              {school?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element -- school logos can be on any host
                <img src={school.logo} alt="" className="size-9 object-contain" />
              ) : (
                <School className="size-5" />
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{name}</span>
              <span className="block text-xs text-muted-foreground">{t("subtitle")}</span>
            </span>
          </Link>
          <LanguageSwitcher className="hidden bg-background sm:flex" />
          <Button asChild size="sm" variant={loggedIn ? "default" : "outline"}>
            <Link href={loggedIn ? authRoutes.SCHOOL.home : authRoutes.SCHOOL.login}>{loggedIn ? t("openApp") : t("logIn")}</Link>
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">{children}</main>
      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {name}</span>
          <LanguageSwitcher className="bg-background sm:hidden" />
        </div>
      </footer>
    </div>
  );
}
