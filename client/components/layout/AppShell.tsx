"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { UserMenu } from "@/components/auth/UserMenu";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { useCan } from "@/lib/auth/hooks";
import type { PermissionCheck } from "@/lib/auth/permissions";
import type { SessionType } from "@/lib/tenant";
import { cn } from "@/lib/utils";
import type messages from "@/messages/en.json";

export type NavItem = {
  href: string;
  // key under "nav" in the messages
  label: keyof (typeof messages)["nav"];
  // school only: hidden unless the session has it
  permission?: PermissionCheck;
};

type Props = {
  session: SessionType;
  title: ReactNode;
  nav: NavItem[];
  children: ReactNode;
};

/** Minimal header + nav layout for logged-in areas. Design comes later. */
export function AppShell({ session, title, nav, children }: Props) {
  const t = useTranslations("nav");
  // middleware serves this site from its app folder; compare public paths only
  const pathname = usePathname().replace(/^\/(platform|school)(?=\/|$)/, "") || "/";
  const can = useCan();
  const items = nav.filter((item) => !item.permission || can(item.permission));

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <div className="font-semibold">{title}</div>
          <nav className="flex flex-1 gap-1 overflow-x-auto">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
                  pathname === item.href && "bg-muted text-foreground",
                )}
              >
                {t(item.label)}
              </Link>
            ))}
          </nav>
          <LanguageSwitcher />
          <UserMenu session={session} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
