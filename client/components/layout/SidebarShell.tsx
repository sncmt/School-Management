"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronDown, ChevronRight, Menu as MenuIcon, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, Fragment, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCan, useSchoolMe } from "@/lib/auth/hooks";
import type { PermissionCheck } from "@/lib/auth/permissions";
import type { SessionType } from "@/lib/tenant";
import { cn } from "@/lib/utils";
import type messages from "@/messages/en.json";
import { AccountMenu } from "./AccountMenu";
import { LanguageMenu } from "./LanguageMenu";
import { ThemeToggle } from "./ThemeToggle";
import { topBarIconButton } from "./topBar";


export type MenuItem = {
  href: string;
  // key under "nav" in the messages
  label: keyof (typeof messages)["nav"];
  icon: LucideIcon;
  // school only: hidden unless the session has it (with a list: all of them, or any one with anyPermission)
  permission?: PermissionCheck;
  anyPermission?: boolean;
  // school only: shown to the school super admin alone (roles and staff)
  superAdminOnly?: boolean;
  // school only: shown to family logins too, whatever their permissions (their children's pages)
  family?: boolean;
};

/*
 * A part of the menu. With a label it is a row that opens into its pages ("People" > Students,
 * Teachers…), or just the page's own row when only one of them is visible; without a label its
 * pages are rows of their own.
 */
export type MenuGroup = {
  label?: keyof (typeof messages)["navGroups"];
  icon?: LucideIcon;
  items: MenuItem[];
  // a school's menu: a thin rule before this group, closing the cluster above (as an index does)
  divider?: boolean;
};

/** Active on its own page and the pages under it ("/" only on itself). */
const isActive = (href: string, pathname: string) =>
  href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);

type Props = {
  session: SessionType;
  // the logo block: logo, site name, and a line under it (the academic year)
  // title: the full name, in the top bar; sidebarTitle: a short one for the narrow sidebar (the
  // title when left out)
  brand: {
    icon: ReactNode;
    title: string;
    sidebarTitle?: string;
    subtitle?: ReactNode;
    home: string;
  };
  menu: MenuGroup[];
  // the site's own buttons in the top bar, before the language menu (the school's messages)
  topBarItems?: ReactNode;
  // a bar of the main pages along the bottom on a phone (it can open the menu: it sits inside it)
  bottomNav?: ReactNode;
  // a line at the foot of the menu (a school's: how to reach support), hidden when it is folded
  footer?: ReactNode;
  children: ReactNode;
};

/*
 * A school's menu is drawn as an index with tabs (.school-menu in globals.css): the current page
 * is a tab in the school's accent that reaches past the menu's paper into a strip of the page's own
 * colours (--tab-out wide, on a computer only). Its rows keep that strip clear.
 */
const IndexTabs = createContext(false);

/*
 * A menu row: a rounded box in the menu's text colour; the current page in the menu's "active"
 * colours (globals.css): on the platform's navy a lighter box with a gold bar on the menu's edge,
 * on a school's menu a box filled with the school's accent.
 */
const rowClass = (active: boolean, tabs = false) =>
  cn(
    // a little more room before the icon (20 px) than after the text
    // a little tighter in the phone's drawer, so more of the menu fits on the screen
    "relative flex h-10 w-full items-center gap-3 rounded-lg pr-3 pl-5 text-left text-[16.5px] transition-colors in-data-[mobile=true]:h-9 [&:lang(en)]:text-[15.5px]",
    tabs
      ? // folded to icons: every icon in the same place, so the tab's icon stays put as it reaches out
        "group-data-[collapsible=icon]:pl-3"
      : "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
    active
      ? cn(
          "bg-sidebar-active font-semibold text-sidebar-active-foreground ring-1 ring-sidebar-foreground/15 ring-inset",
          tabs
            ? TAB
            : "before:absolute before:top-2 before:bottom-2 before:-left-3 before:w-[3px] before:rounded-r-full before:bg-sidebar-active-bar",
        )
      : "text-sidebar-foreground hover:bg-sidebar-foreground/5",
  );

// the tab: wider by the gap and the strip, a soft shadow where it lies on the page, and a faint
// crease where it leaves the paper (in the phone's drawer there is no page beside it: a plain box)
const TAB =
  "w-[calc(100%+var(--tab-out,0px)+0.75rem)] max-w-none rounded-r-[10px] shadow-[8px_8px_16px_-10px_rgb(20_30_60/0.45)] after:absolute after:inset-y-[7px] after:right-[var(--tab-out,0px)] after:w-px after:bg-current after:opacity-20 in-data-[mobile=true]:w-full in-data-[mobile=true]:shadow-none in-data-[mobile=true]:after:hidden";

/**
 * Logged-in layout: the menu on the left (navy for the platform admin; white or the school's
 * own dark colour for a school, see .school-menu in globals.css); a white top bar and the page on a
 * squared light-grey canvas. Used by the admin and school sites.
 */
export function SidebarShell({
  session,
  brand,
  menu,
  topBarItems,
  bottomNav,
  footer,
  children,
}: Props) {
  const tabs = session === "SCHOOL";
  const t = useTranslations("nav");
  const tGroups = useTranslations("navGroups");
  const tShell = useTranslations("shell");
  const can = useCan();
  const me = useSchoolMe();
  const isSuperAdmin = !!me?.isSuperAdmin;
  const isFamily = !!me?.roles.some((r) => r.name === "GUARDIAN");
  // each site is served from its app folder; compare public paths only
  const pathname =
    usePathname().replace(/^\/(platform|school)(?=\/|$)/, "") || "/";

  const visible = (item: MenuItem) =>
    (!item.superAdminOnly || isSuperAdmin) &&
    ((item.family && isFamily) ||
      !item.permission ||
      can(item.permission, { any: item.anyPermission }));
  const groups = menu
    .map((g) => ({ ...g, items: g.items.filter(visible) }))
    .filter((g) => g.items.length > 0);

  // where we are: "Home / People / Students"
  const current = groups
    .flatMap((g) => g.items.map((item) => ({ item, group: g })))
    .find(({ item }) => isActive(item.href, pathname));
  const trail: Crumb[] = [
    { label: tShell("home"), href: brand.home },
    ...(current?.group.label && current.group.items.length > 1 ? [{ label: tGroups(current.group.label) }] : []),
    ...(current && current.item.href !== brand.home ? [{ label: t(current.item.label), href: current.item.href, here: true }] : []),
  ];


  return (
    <IndexTabs.Provider value={tabs}>
    <SidebarProvider
      style={
        {
          // a school's menu: room for its full name, and for the strip its tab reaches into
          "--sidebar-width": tabs ? "16rem" : "14.5rem",
          "--sidebar-width-icon": tabs ? "5rem" : "4.25rem",
        } as React.CSSProperties
      }
    >
      <Sidebar collapsible="icon" // no border of its own (the sidebar's default one is turned off): a school's menu has a single
        // edge, the line its paper draws (globals.css)
        className={tabs ? "school-menu border-r-0 group-data-[side=left]:border-r-0" : "dark border-r-0"}>
        {/* the logo block on the menu's own colour: as tall as the top bar, or taller for a long name */}
        <SidebarHeader
          className={cn(
            "flex-row items-center gap-0 border-b border-sidebar-foreground/20 px-5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
            // the drawer's is shorter on a phone, leaving the rows more room
            "h-[72px] py-0 in-data-[mobile=true]:h-14",
            // a school's stops at the paper's edge (its line too), clear of the strip
            tabs &&
              cn(
                "mr-(--tab-out) pr-3",
                // its line under it: light and short, like the rules between the menu's clusters
                "relative border-b-0 after:absolute after:inset-x-6 after:bottom-0 after:h-px after:bg-sidebar-border",
              ),
          )}
        >
          <Link
            href={brand.home}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-3 group-data-[collapsible=icon]:hidden",
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-brand-ink shadow-sm ring-1 ring-sidebar-foreground/10">
              {brand.icon}
            </span>
            <span className="grid min-w-0 gap-0.5 leading-tight text-sidebar-foreground">
              <span
                className="truncate text-[17px] font-bold tracking-tight"
                title={brand.title}
              >
                {brand.sidebarTitle ?? brand.title}
              </span>
              {brand.subtitle && (
                <span
                  className={cn(
                    "truncate text-sidebar-foreground/70",
                    // a note in the margin: italic (Bangla has none, so upright)
                    tabs ? "text-[14px] italic [&:lang(bn)]:not-italic" : "font-mono text-[13px]",
                  )}
                >
                  {brand.subtitle}
                </span>
              )}
            </span>
          </Link>
          <SidebarToggle />
        </SidebarHeader>

        <SidebarContent
          className={cn(
            "sidebar-scroll gap-0 pt-3 pb-6 in-data-[mobile=true]:pt-1.5",
            // a school's rows keep clear of the strip their tab reaches into
            tabs ? "pr-[calc(var(--tab-out,0px)+0.75rem)] pl-3" : "px-3",
            // the phone's drawer is often shorter than the menu: its foot fades, so the rows below
            // (Administration, the help line) are seen to be there, a scroll away
            "in-data-[mobile=true]:pb-8 in-data-[mobile=true]:[mask-image:linear-gradient(to_bottom,black_calc(100%-1.5rem),transparent)]",
          )}
        >
          {!tabs && (
            <p className="pr-3 pl-5 pb-2 text-[13px] font-semibold tracking-[0.14em] text-sidebar-foreground/60 uppercase group-data-[collapsible=icon]:hidden">
              {tShell("workspace")}
            </p>
          )}
          <Menu groups={groups} pathname={pathname} />
          {/* in the phone's drawer the help line scrolls with the menu, leaving the rows more room */}
          {footer && (
            <div className="mt-3 hidden border-t border-sidebar-border px-5 pt-3 text-[14px] leading-snug text-sidebar-foreground/75 in-data-[mobile=true]:block">
              {footer}
            </div>
          )}
        </SidebarContent>
        {footer && (
          <SidebarFooter
            className={cn(
              "border-t border-sidebar-border px-5 py-3 text-[14px] leading-snug text-sidebar-foreground/75 group-data-[collapsible=icon]:hidden in-data-[mobile=true]:hidden",
              tabs && "mr-(--tab-out)",
            )}
          >
            {footer}
          </SidebarFooter>
        )}
        {/* the rail (click the edge to fold) draws a line on hover: a school's menu has one edge only,
            and folds with its button */}
        {!tabs && <SidebarRail />}
      </Sidebar>

      <SidebarInset className="canvas-grid min-w-0">
        <header className="no-print sticky top-0 z-20 flex h-[72px] shrink-0 items-center gap-3 border-b bg-background/90 px-3 backdrop-blur md:px-4 lg:px-5">
          {/* on a phone the menu is hidden: its button lives here (the bottom bar's Menu opens it too) */}
          <MobileMenuButton />
          {/* the site's full name (the platform's sidebar shows a short one) */}
          <p className="min-w-0 truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">
            {brand.title}
          </p>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">

            {topBarItems}
            <LanguageMenu />
            <ThemeToggle />
            <Separator
              orientation="vertical"
              className="mx-0.5 hidden data-[orientation=vertical]:h-8 sm:block"
            />
            <AccountMenu session={session} />
          </div>
        </header>
        {/* the same 14px gap on every side of the page (6px on a phone). A school's menu tab
            already takes 8px of the left, so its left padding is 6px. On a phone with the bottom
            bar, room under the page so the bar never covers it */}
        <main
          className={cn(
            "flex flex-1 flex-col p-1.5 md:p-3.5",
            tabs && "md:pl-1.5",
            bottomNav && "pb-28 md:pb-3.5",
          )}
        >
          {/* the trail; a page with its own header panel (PageHero) shows it there instead */}
          <Breadcrumb trail={trail} className="mb-2 px-0.5 [main:has(.page-hero)_&]:hidden" />
          <TrailContext.Provider value={trail}>{children}</TrailContext.Provider>
        </main>
      </SidebarInset>
      {bottomNav}
    </SidebarProvider>
    </IndexTabs.Provider>
  );
}

/* The button beside the logo: folds the menu to icons on a computer, closes the drawer on a phone. */
function SidebarToggle() {
  const tShell = useTranslations("shell");
  const { isMobile, setOpenMobile } = useSidebar();
  const look =
    "size-9 shrink-0 text-sidebar-foreground hover:bg-sidebar-foreground/15 hover:text-sidebar-foreground [&_svg]:size-5!";
  if (!isMobile) return <SidebarTrigger className={look} />;
  return (
    <Button
      variant="ghost"
      size="icon"
      className={look}
      onClick={() => setOpenMobile(false)}
      aria-label={tShell("closeMenu")}
    >
      <X />
    </Button>
  );
}

/* The top bar's menu button on a phone, where the sidebar is a drawer that slides in. */
function MobileMenuButton() {
  const tShell = useTranslations("shell");
  const { openMobile, setOpenMobile } = useSidebar();
  return (
    <button
      type="button"
      onClick={() => setOpenMobile(true)}
      aria-label={tShell("openMenu")}
      aria-expanded={openMobile}
      className={cn(topBarIconButton, "-ml-1 text-foreground md:hidden")}
    >
      <MenuIcon className="size-5" />
    </button>
  );
}

/* The rows: a page, or a group that opens into its pages; folded to icons, every page is an icon. */
function Menu({
  groups,
  pathname,
}: {
  groups: (MenuGroup & { items: MenuItem[] })[];
  pathname: string;
}) {
  const t = useTranslations("nav");
  const tGroups = useTranslations("navGroups");
  const tabs = useContext(IndexTabs);
  const { state, isMobile, setOpenMobile } = useSidebar();
  const folded = state === "collapsed" && !isMobile;
  // the rule that closes a cluster (a school's menu), never before the first row
  const rule = (group: MenuGroup, i: number) =>
    tabs && group.divider && i > 0 ? <div role="separator" className="mx-3 my-2 h-px shrink-0 bg-sidebar-border in-data-[mobile=true]:my-1" /> : null;
  const activeGroup = groups.find((g) =>
    g.items.some((i) => isActive(i.href, pathname)),
  )?.label;
  // one group open at a time: the one with the current page, until another is opened ("" = none)
  const [openLabel, setOpenLabel] = useState<string | undefined>();
  const openGroup = openLabel ?? activeGroup;
  const close = () => isMobile && setOpenMobile(false);

  // each group's box, so the menu can scroll to it
  const groupEls = useRef(new Map<string, HTMLDivElement>());
  // when a group is opened by a click, scroll the menu just enough to show all its pages
  useEffect(() => {
    if (!openLabel) return;
    const el = groupEls.current.get(openLabel);
    if (!el) return;
    const frame = requestAnimationFrame(() =>
      el.scrollIntoView({ block: "nearest", behavior: "smooth" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [openLabel]);

  const pageRow = (item: MenuItem) => {
    const active = isActive(item.href, pathname);
    const row = (
      <Link
        href={item.href}
        onClick={close}
        className={rowClass(active, tabs)}
        aria-current={active ? "page" : undefined}
      >
        <item.icon className="size-[18px] shrink-0" />
        <span className="truncate group-data-[collapsible=icon]:hidden">
          {t(item.label)}
        </span>
      </Link>
    );
    return folded ? (
      <Tooltip key={item.href}>
        <TooltipTrigger asChild>{row}</TooltipTrigger>
        <TooltipContent side="right">{t(item.label)}</TooltipContent>
      </Tooltip>
    ) : (
      <Fragment key={item.href}>{row}</Fragment>
    );
  };

  if (folded)
    return (
      <nav className="grid gap-1">
        {groups.map((g, i) => (
          <Fragment key={g.label ?? i}>
            {rule(g, i)}
            {g.items.map(pageRow)}
          </Fragment>
        ))}
      </nav>
    );

  return (
    <nav className="grid gap-1 in-data-[mobile=true]:gap-0">
      {groups.map((group, i) => {
        if (!group.label || group.items.length === 1)
          return (
            <Fragment key={group.label ?? i}>
              {rule(group, i)}
              {group.items.map(pageRow)}
            </Fragment>
          );
        const open = openGroup === group.label;
        const Icon = group.icon ?? group.items[0].icon;
        const label = group.label;

        return (
          <Fragment key={label}>
          {rule(group, i)}
          <div
            ref={(el) => {
              if (el) groupEls.current.set(label, el);
              else groupEls.current.delete(label);
            }}
            className="grid scroll-mb-6 gap-1"
          >
            <button
              type="button"
              onClick={() => setOpenLabel(open ? "" : group.label)}
              aria-expanded={open}
              className={cn(rowClass(false, tabs), open && "bg-sidebar-foreground/5")}
            >
              <Icon className="size-[18px] shrink-0" />
              <span className="flex-1 truncate">{tGroups(group.label)}</span>
              {open ? (
                <ChevronDown className="size-4 opacity-85" />
              ) : (
                <ChevronRight className="size-4 opacity-85" />
              )}
            </button>
            {open && (
              // its pages, on a thin line under the group's icon
              <ul className="ml-[29px] grid gap-0.5 border-l border-sidebar-border py-1 pl-3">
                {group.items.map((item) => {
                  const active = isActive(item.href, pathname);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={close}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative flex h-9 items-center rounded-lg px-3 text-[15.5px] transition-colors [&:lang(en)]:text-[14.5px]",
                          active
                            ? cn(
                                "bg-sidebar-active font-semibold text-sidebar-active-sub ring-1 ring-sidebar-foreground/15 ring-inset",
                                // a page inside a group: the same tab, from its own line
                                tabs && TAB,
                              )
                            : "text-sidebar-foreground/90 hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground",
                        )}
                      >
                        <span className="truncate">{t(item.label)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          </Fragment>
        );
      })}
    </nav>
  );
}

// ------------------------------------------------------------- the trail ("Home / People / Students")

export type Crumb = { label: string; href?: string; here?: boolean };

// the shell's trail, for a page that shows it in its own header (PageHero)
const TrailContext = createContext<Crumb[]>([]);
export const useShellTrail = () => useContext(TrailContext);

/* The trail as small links, divided by slashes; "light" for the accent header panel. */
export function Breadcrumb({ trail, light, className }: { trail: Crumb[]; light?: boolean; className?: string }) {
  const tShell = useTranslations("shell");
  return (
    <nav aria-label={tShell("home")} className={cn("no-print flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-mono text-[11px] leading-5", className)}>
      {trail.map((crumb, i) => {
        const tone = crumb.here
          ? light ? "font-semibold text-white" : "font-semibold text-foreground"
          : light ? "text-white/65" : "text-muted-foreground";
        return (
          <Fragment key={`${i}-${crumb.label}`}>
            {i > 0 && <span className={light ? "text-white/40" : "text-muted-foreground/50"}>/</span>}
            {crumb.href ? (
              <Link href={crumb.href} className={cn(tone, "hover:underline", light ? "hover:text-white" : "hover:text-foreground")}>
                {crumb.label}
              </Link>
            ) : (
              <span className={tone}>{crumb.label}</span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
