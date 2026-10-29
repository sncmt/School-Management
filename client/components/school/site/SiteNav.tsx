"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type MouseEvent } from "react";
import { jumpToSection, useActiveSection } from "@/lib/useSectionNav";
import { cn } from "@/lib/utils";

// section "top" is the top of the homepage; the others are ids of its sections
export type SiteLink = { href: string; label: string; section: string };

/*
 * The menu of the public header's coloured bar: the links in a row from lg and the way in at
 * the end; below lg a button opens them as a panel under the bar. A link scrolls to its section
 * and the gold mark follows the section in view.
 */
export function SiteNav({
  links,
  account,
  labels,
}: {
  links: SiteLink[];
  account: { href: string; label: string };
  labels: { menu: string; close: string };
}) {
  const [open, setOpen] = useState(false);
  const active = useActiveSection(links.map((link) => link.section));

  // Escape closes the panel
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const jump = (e: MouseEvent, link: SiteLink) => {
    setOpen(false);
    jumpToSection(link.section, link.href, e);
  };

  return (
    <>
      <nav className="hidden flex-1 items-center justify-end gap-1 lg:flex">
        {links.map((link) => (
          <Link
            key={link.section}
            href={link.href}
            onClick={(e) => jump(e, link)}
            aria-current={active === link.section ? "location" : undefined}
            className={cn(
              "relative px-3.5 py-2 text-[17px] font-medium transition-colors after:absolute after:inset-x-3.5 after:-bottom-px after:h-0.5 after:rounded-full",
              active === link.section ? "text-white after:bg-sidebar-primary" : "text-white/85 hover:text-white hover:after:bg-white/40",
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="hidden items-center lg:flex">
        <Link
          href={account.href}
          className="inline-flex h-9 items-center rounded-md bg-white px-5 text-sm font-semibold text-school-sidebar shadow-sm transition-colors hover:bg-white/90"
        >
          {account.label}
        </Link>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="site-menu"
        aria-label={open ? labels.close : labels.menu}
        className="flex size-10 shrink-0 items-center justify-center rounded-md text-white hover:bg-white/10 lg:hidden"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      {open && (
        <div id="site-menu" className="absolute inset-x-0 top-full border-t border-white/10 bg-school-sidebar shadow-lg lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col px-4 py-2">
            {links.map((link) => (
              <Link
                key={link.section}
                href={link.href}
                onClick={(e) => jump(e, link)}
                aria-current={active === link.section ? "location" : undefined}
                className={cn(
                  "border-l-2 px-3 py-2.5 text-[17px] font-medium",
                  active === link.section ? "border-sidebar-primary text-white" : "border-transparent text-white/85 hover:text-white",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mx-auto flex max-w-6xl items-center gap-3 border-t border-white/10 px-4 py-3">
            <Link
              href={account.href}
              className="inline-flex h-9 items-center rounded-md bg-white px-5 text-sm font-semibold text-school-sidebar"
            >
              {account.label}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
