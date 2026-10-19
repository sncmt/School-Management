"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useState, type ReactNode } from "react";
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
  brand: { icon: ReactNode; title: string; subtitle?: ReactNode; home: string };
  menu: MenuGroup[];
  // the site's own buttons in the top bar, before the language menu (the school's messages)
  topBarItems?: ReactNode;
  children: ReactNode;
};

// a menu row: full width, divided by a hairline; the current page darker with a teal bar
const rowClass = (active: boolean) =>
  cn(
    "relative flex h-12 w-full items-center gap-3 border-b border-sidebar-border px-5 text-left text-[14px] transition-colors",
    "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
    active
      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-sidebar-primary"
      : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
  );

/** Logged-in layout: the navy menu on the left; a white top bar and the page on a light-grey canvas. Used by the admin and school sites. */
export function SidebarShell({ session, brand, menu, topBarItems, children }: Props) {
  const t = useTranslations("nav");
  const tGroups = useTranslations("navGroups");
  const tShell = useTranslations("shell");
  const can = useCan();
  const isSuperAdmin = !!useSchoolMe()?.isSuperAdmin;
  // each site is served from its app folder; compare public paths only
  const pathname = usePathname().replace(/^\/(platform|school)(?=\/|$)/, "") || "/";

  const visible = (item: MenuItem) =>
    (!item.superAdminOnly || isSuperAdmin) && (!item.permission || can(item.permission, { any: item.anyPermission }));
  const groups = menu.map((g) => ({ ...g, items: g.items.filter(visible) })).filter((g) => g.items.length > 0);

  // where we are: "Home - People - Students"
  const current = groups.flatMap((g) => g.items.map((item) => ({ item, group: g }))).find(({ item }) => isActive(item.href, pathname));
  const pages = groups.flatMap((g) => g.items.map((item) => ({ href: item.href, label: t(item.label), group: g.label ? tGroups(g.label) : null, icon: item.icon })));

  return (
    <SidebarProvider style={{ "--sidebar-width": "16.5rem", "--sidebar-width-icon": "4.25rem" } as React.CSSProperties}>
      <Sidebar collapsible="icon" className="dark border-r-0">
        {/* the logo block in the brand colour, as tall as the top bar; its text is white */}
        <SidebarHeader className="h-[68px] flex-row items-center gap-0 bg-brand px-4 py-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Link href={brand.home} className="flex min-w-0 flex-1 items-center gap-3 group-data-[collapsible=icon]:hidden">
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-sidebar shadow-sm">
              {brand.icon}
            </span>
            <span className="grid min-w-0 leading-tight text-white">
              <span className="truncate text-[16px] font-bold tracking-tight">{brand.title}</span>
              {brand.subtitle && <span className="truncate text-xs font-medium text-white/75">{brand.subtitle}</span>}
            </span>
          </Link>
          <SidebarTrigger className="size-9 shrink-0 text-white hover:bg-white/15 hover:text-white [&_svg]:size-5!" />
        </SidebarHeader>

        <SidebarContent className="gap-0 p-0">
          <Menu groups={groups} pathname={pathname} />
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-canvas">
        <header className="no-print sticky top-0 z-20 flex h-[68px] shrink-0 items-center gap-3 border-b bg-background px-4 shadow-[0_1px_3px_rgb(0_0_0/0.04)] lg:px-6">
          {/* on a phone the menu is hidden: its button lives here */}
          <SidebarTrigger className="-ml-1 md:hidden" />
          <p className="min-w-0 truncate text-[17px] tracking-tight">
            {tShell.rich("welcome", { name: brand.title, b: (chunks) => <b className="font-semibold">{chunks}</b> })}
            <span className="hidden text-muted-foreground xl:inline"> {tShell("appTagline")}</span>
          </p>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
            <div className="hidden w-72 lg:block">
              <PageSearch pages={pages} />
            </div>
            {topBarItems}
            <LanguageMenu />
            <ThemeToggle />
            <Separator orientation="vertical" className="mx-1 hidden data-[orientation=vertical]:h-8 sm:block" />
            <AccountMenu session={session} />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <nav aria-label={tShell("home")} className="no-print mb-4 flex flex-wrap items-center gap-2 text-sm">
            <Link href={brand.home} className="text-muted-foreground hover:text-foreground">
              {tShell("home")}
            </Link>
            {current?.group.label && current.group.items.length > 1 && (
              <>
                <span className="text-muted-foreground/60">-</span>
                <span className="text-muted-foreground">{tGroups(current.group.label)}</span>
              </>
            )}
            {current && current.item.href !== brand.home && (
              <>
                <span className="text-muted-foreground/60">-</span>
                <Link href={current.item.href} className="font-medium text-foreground hover:underline">
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
        <item.icon className="size-[17px] shrink-0 text-sidebar-primary" />
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

  if (folded) return <nav>{groups.flatMap((g) => g.items).map(pageRow)}</nav>;

  return (
    <nav>
      {groups.map((group, i) => {
        if (!group.label || group.items.length === 1) return <Fragment key={group.label ?? i}>{group.items.map(pageRow)}</Fragment>;
        const open = openGroup === group.label;
        const Icon = group.icon ?? group.items[0].icon;
        return (
          <div key={group.label}>
            <button
              type="button"
              onClick={() => setOpenLabel(open ? "" : group.label)}
              aria-expanded={open}
              className={rowClass(open)}
            >
              <Icon className="size-[17px] shrink-0 text-sidebar-primary" />
              <span className="flex-1 truncate">{tGroups(group.label)}</span>
              {open ? <ChevronDown className="size-4 text-sidebar-foreground/60" /> : <ChevronRight className="size-4 text-sidebar-foreground/50" />}
            </button>
            {open && (
              <ul className="border-b border-sidebar-border bg-black/15 py-2">
                {group.items.map((item) => {
                  const active = isActive(item.href, pathname);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={close}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2 py-2 pr-4 pl-11 text-[13.5px] transition-colors",
                          active ? "font-medium text-sidebar-primary" : "text-sidebar-foreground/75 hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <ChevronRight className={cn("size-3.5 shrink-0", active ? "text-sidebar-primary" : "text-sidebar-foreground/40")} />
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
