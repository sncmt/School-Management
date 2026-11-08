"use client";

import { ArrowRight, Menu, Smartphone, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { MARKETING_SECTIONS } from "@/lib/marketing/sections";
import { jumpToSection, useActiveSection } from "@/lib/useSectionNav";
import { cn } from "@/lib/utils";

/*
 * The marketing header's menu: the sections in a row from md with the language and the call to
 * action at the end; below md a button opens them as a panel under the bar. A link scrolls to its
 * section and the gold mark follows the section in view.
 */
export function MarketingNav() {
  const t = useTranslations("marketing.nav");
  const [open, setOpen] = useState(false);
  const active = useActiveSection([...MARKETING_SECTIONS]);

  // Escape closes the panel
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const links = MARKETING_SECTIONS.map((section) => (
    <a
      key={section}
      href={`#${section}`}
      onClick={(e) => {
        setOpen(false);
        jumpToSection(section, "/", e);
      }}
      aria-current={active === section ? "location" : undefined}
      className={cn(
        "relative text-[15px] font-medium transition-colors",
        // a row from md: a gold dot under the current one; the panel: a bar on the left
        "max-md:border-l-2 max-md:px-3 max-md:py-2.5",
        "md:px-3.5 md:py-2 md:after:absolute md:after:-bottom-0.5 md:after:left-1/2 md:after:size-1 md:after:-translate-x-1/2 md:after:rounded-full",
        active === section
          ? "text-white max-md:border-mk-gold md:after:bg-mk-gold"
          : "text-white/70 hover:text-white max-md:border-transparent",
      )}
    >
      {t(section)}
    </a>
  ));

  const cta = (
    <a
      href="#contact"
      onClick={(e) => {
        setOpen(false);
        jumpToSection("contact", "/", e);
      }}
      className="group inline-flex h-9 items-center gap-1.5 rounded-full bg-mk-gold px-4 text-sm font-semibold text-mk-ink transition-colors hover:bg-white"
    >
      {t("start")}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
    </a>
  );

  // the mobile app's download page: a page of its own, not a section
  const appLink = (
    <Link
      href="/app"
      onClick={() => setOpen(false)}
      className={cn(
        "inline-flex items-center gap-1.5 text-[15px] font-medium text-white/70 transition-colors hover:text-white",
        "max-md:border-l-2 max-md:border-transparent max-md:px-3 max-md:py-2.5 md:px-3.5 md:py-2",
      )}
    >
      <Smartphone className="size-4" />
      {t("app")}
    </Link>
  );

  return (
    <>
      <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 md:flex">
        {links}
        {appLink}
      </nav>

      <div className="hidden items-center gap-3 md:flex">
        <LanguageSwitcher className="rounded-full border-white/15 [&_button]:rounded-full" />
        {cta}
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="marketing-menu"
        aria-label={open ? t("close") : t("menu")}
        className="flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10 md:hidden"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open && (
        <div id="marketing-menu" className="absolute inset-x-0 top-full border-t border-white/10 bg-mk-ink shadow-2xl md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2">
            {links}
            {appLink}
          </nav>
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
            <LanguageSwitcher className="rounded-full border-white/15 [&_button]:rounded-full" />
            {cta}
          </div>
        </div>
      )}
    </>
  );
}
