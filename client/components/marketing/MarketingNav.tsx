"use client";

import { Menu, Smartphone, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { contactHref } from "@/lib/marketing/packages";
import { MARKETING_SECTIONS, sectionHref } from "@/lib/marketing/sections";
import { jumpToSection, useActiveSection } from "@/lib/useSectionNav";
import { cn } from "@/lib/utils";
import { SchoolLoginDialog } from "./SchoolLoginDialog";

// the language pill: the chosen one dark, the other quiet
const LANGUAGE =
  "rounded-full border-hp-hair bg-white p-[3px] text-sm font-semibold [&_button]:rounded-full [&_button]:px-2.5 [&_button]:py-[5px] [&_button]:text-hp-quiet [&_button[aria-pressed=false]:hover]:text-hp-ink [&_button[aria-pressed=true]]:bg-hp-ink [&_button[aria-pressed=true]]:text-white";
const FOCUS = "focus-visible:ring-2 focus-visible:ring-hp-brand focus-visible:ring-offset-2 focus-visible:outline-none";

/*
 * The marketing header's menu, on white: from 1100px the homepage's sections in a row beside the
 * logo, then the contact and app pages; the language, "Log in" and "Get started" at the end.
 * Narrower, a button opens the links as a panel under the bar (on a phone the language and "Log in"
 * move into it too). On the homepage a section's link scrolls to it and the one in view is darker;
 * on another page it goes back to the homepage's section.
 */
export function MarketingNav() {
  const t = useTranslations("marketing.nav");
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const onHome = pathname === "/";
  const active = useActiveSection([...MARKETING_SECTIONS]);

  // Escape closes the panel
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const linkClass = (current: boolean) =>
    cn(
      "rounded-lg px-3 py-2 text-[18px] font-medium transition-colors [:lang(bn)_&]:text-[19px]",
      FOCUS,
      current ? "text-hp-ink" : "text-hp-quiet hover:bg-hp-canvas hover:text-hp-ink",
    );

  const links = MARKETING_SECTIONS.map((section) => (
    <a
      key={section}
      href={sectionHref(section, onHome)}
      onClick={(e) => {
        setOpen(false);
        if (onHome) jumpToSection(section, "/", e);
      }}
      aria-current={onHome && active === section ? "location" : undefined}
      className={linkClass(onHome && active === section)}
    >
      {t(section)}
    </a>
  ));

  // the contact page, and the mobile app's download page: pages of their own, not sections
  const contactLink = (
    <Link
      href={contactHref()}
      onClick={() => setOpen(false)}
      aria-current={pathname === "/contact" ? "page" : undefined}
      className={linkClass(pathname === "/contact")}
    >
      {t("contact")}
    </Link>
  );
  const appLink = (
    <Link href="/app" onClick={() => setOpen(false)} className={cn(linkClass(false), "inline-flex items-center gap-1.5")}>
      <Smartphone className="size-4" />
      {t("app")}
    </Link>
  );

  const login = (
    <SchoolLoginDialog
      trigger={
        <button type="button" className={cn("inline-flex h-[42px] items-center rounded-[10px] px-[18px] text-base font-semibold text-hp-ink transition-colors hover:bg-hp-canvas", FOCUS)}>
          {t("login")}
        </button>
      }
    />
  );

  return (
    <>
      <nav className="ml-2 hidden items-center gap-1 min-[68.75rem]:flex">
        {links}
        {contactLink}
        {appLink}
      </nav>

      <div className="ml-auto flex items-center gap-2.5">
        <LanguageSwitcher className={cn(LANGUAGE, "max-sm:hidden")} />
        <div className="max-sm:hidden">{login}</div>
        <Link
          href={contactHref()}
          onClick={() => setOpen(false)}
          className={cn(
            "inline-flex h-[38px] shrink-0 items-center rounded-[10px] bg-hp-brand px-3.5 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-hp-brand-ink sm:h-[42px] sm:px-[18px] sm:text-base",
            FOCUS,
          )}
        >
          {t("start")}
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="marketing-menu"
          aria-label={open ? t("close") : t("menu")}
          className={cn("flex size-[42px] shrink-0 items-center justify-center rounded-[10px] border border-hp-hair bg-white text-hp-ink min-[68.75rem]:hidden", FOCUS)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div id="marketing-menu" className="absolute inset-x-0 top-full border-y border-hp-hair bg-white shadow-[0_20px_40px_-24px_oklch(0.3_0.06_200/0.3)] min-[68.75rem]:hidden">
          <nav className="mx-auto flex max-w-[1288px] flex-col px-4 py-2 sm:px-6">
            {links}
            {contactLink}
            {appLink}
          </nav>
          <div className="mx-auto flex max-w-[1288px] items-center justify-between gap-3 border-t border-hp-hair px-4 py-3 sm:hidden">
            <LanguageSwitcher className={LANGUAGE} />
            {login}
          </div>
        </div>
      )}
    </>
  );
}
