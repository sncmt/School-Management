"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Breadcrumb, useShellTrail, type Crumb } from "./SidebarShell";

/*
 * A page's header as its own panel in the school's accent (its fixed deep shade, --brand-ink, so
 * the white words read in light and dark mode alike): the trail, then the title and a line under
 * it. The shell's own trail hides on a page that has one (the .page-hero class). `trail` adds to
 * the shell's ("… / Students / Admit a student").
 */
export function PageHero({
  title,
  description,
  trail = [],
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  trail?: Crumb[];
  actions?: ReactNode;
  className?: string;
}) {
  const shell = useShellTrail();
  // the page's own steps follow the shell's; the last one is where we are
  const full = trail.length > 0 ? [...shell.map((c) => ({ ...c, here: false })), ...trail.map((c, i) => ({ ...c, here: i === trail.length - 1 }))] : shell;

  return (
    <header className={cn("page-hero dark flex flex-wrap items-end justify-between gap-x-6 gap-y-3 rounded-2xl bg-brand-ink px-4 pt-3 pb-4 text-white sm:px-5", className)}>
      <div className="min-w-0">
        <Breadcrumb trail={full} light />
        <h1 className="mt-1.5 text-[1.625rem] leading-tight font-bold tracking-[-0.02em] text-balance sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-white/75">{description}</p>}
      </div>
      {/* on a phone the actions share a full row under the title */}
      {actions && <div className="page-hero-actions flex shrink-0 flex-wrap items-center gap-2 max-sm:w-full">{actions}</div>}
    </header>
  );
}
