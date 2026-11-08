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
 * The marketing header's menu, on white: the sections in a row from lg with the language and the
 * call to action at the end; below lg a button opens them as a panel under the bar. A link scrolls to its
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
        // a row from lg: a gold dot under the current one; the panel: a bar on the left
        "max-lg:border-l-2 max-lg:px-3 max-lg:py-2.5",
        "lg:px-3.5 lg:py-2 lg:after:absolute lg:after:-bottom-0.5 lg:after:left-1/2 lg:after:size-1 lg:after:-translate-x-1/2 lg:after:rounded-full",
        active === section
          ? "font-semibold text-mk-ink max-lg:border-mk-gold lg:after:bg-mk-gold"
          : "text-slate-600 hover:text-mk-ink max-lg:border-transparent",
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
      className="group inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-mk-gold px-4 text-sm font-semibold text-mk-ink transition-colors hover:bg-mk-ink hover:text-white"
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
        "inline-flex items-center gap-1.5 text-[15px] font-medium text-slate-600 transition-colors hover:text-mk-ink",
        "max-lg:border-l-2 max-lg:border-transparent max-lg:px-3 max-lg:py-2.5 lg:px-3.5 lg:py-2",
      )}
    >
      <Smartphone className="size-4" />
      {t("app")}
    </Link>
  );

  return (
    <>
      <nav className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 lg:flex">
        {links}
        {appLink}
      </nav>

      <div className="hidden items-center gap-3 lg:flex">
        <LanguageSwitcher className="rounded-full border-slate-200 bg-white [&_button]:rounded-full [&_button]:text-slate-500 [&_button[aria-pressed=false]:hover]:text-mk-ink [&_button[aria-pressed=true]]:bg-mk-ink [&_button[aria-pressed=true]]:text-white" />
        {cta}
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="marketing-menu"
        aria-label={open ? t("close") : t("menu")}
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-mk-ink hover:bg-slate-100 lg:hidden"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open && (
        <div id="marketing-menu" className="absolute inset-x-0 top-full border-t border-slate-200 bg-white shadow-2xl lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2">
            {links}
            {appLink}
          </nav>
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
            <LanguageSwitcher className="rounded-full border-slate-200 bg-white [&_button]:rounded-full [&_button]:text-slate-500 [&_button[aria-pressed=false]:hover]:text-mk-ink [&_button[aria-pressed=true]]:bg-mk-ink [&_button[aria-pressed=true]]:text-white" />
            {cta}
          </div>
        </div>
      )}
    </>
  );
}
