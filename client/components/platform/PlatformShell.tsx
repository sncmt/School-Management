"use client";

import { ShieldCheck } from "lucide-react";
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
import { isMenuItemActive, platformMenu } from "./navigation";

/** Platform admin layout: module sidebar on the left, page on the right. */
export function PlatformShell({ children }: { children: ReactNode }) {
  const t = useTranslations("nav");
  // the admin site is served from app/platform; compare public paths only
  const pathname = usePathname().replace(/^\/platform(?=\/|$)/, "") || "/";

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/">
                  <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <ShieldCheck className="size-4" />
                  </div>
                  <span className="font-semibold">{t("platformAdmin")}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {platformMenu.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isMenuItemActive(item.href, pathname)}
                      tooltip={t(item.label)}
                    >
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
          <UserMenu session="PLATFORM" />
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
