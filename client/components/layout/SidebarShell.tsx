"use client";

import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { UserMenu } from "@/components/auth/UserMenu";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useCan, useSchoolMe } from "@/lib/auth/hooks";
import type { PermissionCheck } from "@/lib/auth/permissions";
import type { SessionType } from "@/lib/tenant";
import type messages from "@/messages/en.json";

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

/** Active on its own page and the pages under it ("/" only on itself). */
const isActive = (href: string, pathname: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

type Props = {
  session: SessionType;
  // the sidebar's top: logo and site name
  brand: { icon: ReactNode; title: ReactNode; home: string };
  menu: MenuItem[];
  children: ReactNode;
};

/** Logged-in layout: module menu on the left, page on the right. Used by the admin and school sites. */
export function SidebarShell({ session, brand, menu, children }: Props) {
  const t = useTranslations("nav");
  const can = useCan();
  const isSuperAdmin = !!useSchoolMe()?.isSuperAdmin;
  // each site is served from its app folder; compare public paths only
  const pathname = usePathname().replace(/^\/(platform|school)(?=\/|$)/, "") || "/";
  const items = menu.filter(
    (item) => (!item.superAdminOnly || isSuperAdmin) && (!item.permission || can(item.permission, { any: item.anyPermission })),
  );

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href={brand.home}>
                  <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary text-primary-foreground">
                    {brand.icon}
                  </div>
                  <span className="truncate font-semibold">{brand.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive(item.href, pathname)} tooltip={t(item.label)}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{t(item.label)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
          <div className="flex-1" />
          <LanguageSwitcher />
          <UserMenu session={session} />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
