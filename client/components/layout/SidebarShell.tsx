"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronDown, ChevronRight, Menu as MenuIcon, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCan, useSchoolMe } from "@/lib/auth/hooks";
import type { PermissionCheck } from "@/lib/auth/permissions";
import type { SessionType } from "@/lib/tenant";
import { cn } from "@/lib/utils";
import type messages from "@/messages/en.json";
import { AccountMenu } from "./AccountMenu";
import { LanguageMenu } from "./LanguageMenu";
import { PageSearch } from "./PageSearch";
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
export type MenuGroup = { label?: keyof (typeof messages)["navGroups"]; icon?: LucideIcon; items: MenuItem[] };

/** Active on its own page and the pages under it ("/" only on itself). */
const isActive = (href: string, pathname: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

type Props = {
  session: SessionType;
  // the logo block: logo, site name, and a line under it (the academic year)
  // title: the full name, in the top bar; sidebarTitle: a short one for the narrow sidebar (the
  // title when left out)
  brand: { icon: ReactNode; title: string; sidebarTitle?: string; subtitle?: ReactNode; home: string };
  menu: MenuGroup[];
  // the site's own buttons in the top bar, before the language menu (the school's messages)
  topBarItems?: ReactNode;
  children: ReactNode;
};

// a menu row: a rounded box with a white icon; the current page a lighter box with a gold bar on the menu's edge
const rowClass = (active: boolean) =>
  cn(
    // a little more room before the icon (20 px) than after the text
    "relative flex h-10 w-full items-center gap-3 rounded-lg pr-3 pl-5 text-left text-[14.5px] transition-colors",
    "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
    active
      ? "bg-sidebar-accent font-semibold text-white ring-1 ring-white/15 ring-inset before:absolute before:top-2 before:bottom-2 before:-left-3 before:w-[3px] before:rounded-r-full before:bg-sidebar-primary"
      : "text-sidebar-foreground/85 hover:bg-white/5 hover:text-white",
  );

/** Logged-in layout: the navy menu on the left; a white top bar and the page on a squared light-grey canvas. Used by the admin and school sites. */
export function SidebarShell({ session, brand, menu, topBarItems, children }: Props) {
  const t = useTranslations("nav");
  const tGroups = useTranslations("navGroups");
  const tShell = useTranslations("shell");
  const can = useCan();
  const me = useSchoolMe();
  const isSuperAdmin = !!me?.isSuperAdmin;
  const isFamily = !!me?.roles.some((r) => r.name === "GUARDIAN");
  // each site is served from its app folder; compare public paths only
  const pathname = usePathname().replace(/^\/(platform|school)(?=\/|$)/, "") || "/";

  const visible = (item: MenuItem) =>
    (!item.superAdminOnly || isSuperAdmin) && ((item.family && isFamily) || !item.permission || can(item.permission, { any: item.anyPermission }));
  const groups = menu.map((g) => ({ ...g, items: g.items.filter(visible) })).filter((g) => g.items.length > 0);

  // where we are: "Home / People / Students"
  const current = groups.flatMap((g) => g.items.map((item) => ({ item, group: g }))).find(({ item }) => isActive(item.href, pathname));
  const pages = groups.flatMap((g) => g.items.map((item) => ({ href: item.href, label: t(item.label), group: g.label ? tGroups(g.label) : null, icon: item.icon })));

  return (
    <SidebarProvider style={{ "--sidebar-width": "14.5rem", "--sidebar-width-icon": "4.25rem" } as React.CSSProperties}>
      <Sidebar collapsible="icon" className="dark border-r-0">
        {/* the logo block on the same navy as the menu, as tall as the top bar; its text is white */}
        <SidebarHeader className="h-[72px] flex-row items-center gap-0 px-5 py-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Link href={brand.home} className="flex min-w-0 flex-1 items-center gap-3 group-data-[collapsible=icon]:hidden">
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-sidebar shadow-sm">
              {brand.icon}
            </span>
            <span className="grid min-w-0 gap-0.5 leading-tight text-white">
              <span className="truncate text-[15px] font-bold tracking-tight" title={brand.title}>
                {brand.sidebarTitle ?? brand.title}
              </span>
              {brand.subtitle && <span className="truncate font-mono text-[11px] text-white/70">{brand.subtitle}</span>}
            </span>
          </Link>
          <SidebarToggle />
        </SidebarHeader>

        <SidebarContent className="sidebar-scroll gap-0 px-3 pt-3 pb-6">
          <p className="pr-3 pl-5 pb-2 text-[11px] font-semibold tracking-[0.14em] text-white/50 uppercase group-data-[collapsible=icon]:hidden">
            {tShell("workspace")}
          </p>
          <Menu groups={groups} pathname={pathname} />
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="canvas-grid min-w-0">
        <header className="no-print sticky top-0 z-20 flex h-[72px] shrink-0 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur lg:px-8">
          {/* on a phone the menu is hidden: its button lives here */}
          <MobileMenuButton />
          {/* the school's full name (the sidebar shows the short one) */}
          <p className="min-w-0 truncate text-[15px] font-bold tracking-tight text-foreground sm:text-base">{brand.title}</p>
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
            {/* an icon below lg, the search box from lg */}
            <div className="lg:w-72">
              <PageSearch pages={pages} />
            </div>
            {topBarItems}
            <LanguageMenu />
            <ThemeToggle />
            <Separator orientation="vertical" className="mx-0.5 hidden data-[orientation=vertical]:h-8 sm:block" />
            <AccountMenu session={session} />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <nav aria-label={tShell("home")} className="no-print mb-4 flex flex-wrap items-center gap-2 font-mono text-xs">
            <Link href={brand.home} className="text-muted-foreground hover:text-foreground">
              {tShell("home")}
            </Link>
            {current?.group.label && current.group.items.length > 1 && (
              <>
                <span className="text-muted-foreground/50">/</span>
                <span className="text-muted-foreground">{tGroups(current.group.label)}</span>
              </>
            )}
            {current && current.item.href !== brand.home && (
              <>
                <span className="text-muted-foreground/50">/</span>
                <Link href={current.item.href} className="font-semibold text-foreground hover:underline">
                  {t(current.item.label)}
                </Link>
              </>
            )}
          </nav>
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

/* The button beside the logo: folds the menu to icons on a computer, closes the drawer on a phone. */
function SidebarToggle() {
  const tShell = useTranslations("shell");
  const { isMobile, setOpenMobile } = useSidebar();
  const look = "size-9 shrink-0 text-white hover:bg-white/15 hover:text-white [&_svg]:size-5!";
  if (!isMobile) return <SidebarTrigger className={look} />;
  return (
    <Button variant="ghost" size="icon" className={look} onClick={() => setOpenMobile(false)} aria-label={tShell("closeMenu")}>
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
function Menu({ groups, pathname }: { groups: (MenuGroup & { items: MenuItem[] })[]; pathname: string }) {
  const t = useTranslations("nav");
  const tGroups = useTranslations("navGroups");
  const { state, isMobile, setOpenMobile } = useSidebar();
  const folded = state === "collapsed" && !isMobile;
  const activeGroup = groups.find((g) => g.items.some((i) => isActive(i.href, pathname)))?.label;
  // one group open at a time: the one with the current page, until another is opened ("" = none)
  const [openLabel, setOpenLabel] = useState<string | undefined>();
  const openGroup = openLabel ?? activeGroup;
  const close = () => isMobile && setOpenMobile(false);

  const pageRow = (item: MenuItem) => {
    const active = isActive(item.href, pathname);
    const row = (
      <Link href={item.href} onClick={close} className={rowClass(active)} aria-current={active ? "page" : undefined}>
        <item.icon className="size-[18px] shrink-0 text-white" />
        <span className="truncate group-data-[collapsible=icon]:hidden">{t(item.label)}</span>
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

  if (folded) return <nav className="grid gap-1">{groups.flatMap((g) => g.items).map(pageRow)}</nav>;

  return (
    <nav className="grid gap-1">
      {groups.map((group, i) => {
        if (!group.label || group.items.length === 1) return <Fragment key={group.label ?? i}>{group.items.map(pageRow)}</Fragment>;
        const open = openGroup === group.label;
        const Icon = group.icon ?? group.items[0].icon;
        return (
          <div key={group.label} className="grid gap-1">
            <button
              type="button"
              onClick={() => setOpenLabel(open ? "" : group.label)}
              aria-expanded={open}
              className={cn(rowClass(false), open && "bg-white/5 text-white")}
            >
              <Icon className="size-[18px] shrink-0 text-white" />
              <span className="flex-1 truncate">{tGroups(group.label)}</span>
              {open ? <ChevronDown className="size-4 text-white/60" /> : <ChevronRight className="size-4 text-white/50" />}
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
                          "flex h-9 items-center rounded-lg px-3 text-[13.5px] transition-colors",
                          active
                            ? "bg-sidebar-accent font-semibold text-sidebar-primary ring-1 ring-white/15 ring-inset"
                            : "text-sidebar-foreground/75 hover:bg-white/5 hover:text-white",
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
        );
      })}
    </nav>
  );
}
