"use client";

import { School } from "lucide-react";
import type { ReactNode } from "react";
import { SidebarShell } from "@/components/layout/SidebarShell";
import { useSchoolMe } from "@/lib/auth/hooks";
import { useLocalizedName } from "@/lib/i18n/names";
import { MessagesMenu } from "./messages/MessagesMenu";
import { schoolMenu } from "./navigation";
import { SchoolBottomNav, useBottomNavHasMessages } from "./SchoolBottomNav";

/** School layout: the school's name and logo, its modules in the sidebar. */
export function SchoolShell({ children }: { children: ReactNode }) {
  const me = useSchoolMe();
  const name = useLocalizedName();
  const bottomHasMessages = useBottomNavHasMessages();

  const icon = me?.school.logo ? (
    // eslint-disable-next-line @next/next/no-img-element -- school logos can be on any host
    <img src={me.school.logo} alt="" className="size-9 object-contain" />
  ) : (
    <School className="size-5" />
  );

  return (
    <SidebarShell
      session="SCHOOL"
      brand={{
        icon,
        title: me ? name(me.school) : "",
        // the narrow sidebar shows the school's short address: DEMO for demo.<domain>
        sidebarTitle: me ? me.school.subdomain.toUpperCase() : "",
        // everyone sees the year they are working in
        subtitle: me?.academicYear?.name,
        home: "/dashboard",
      }}
      menu={schoolMenu}
      // on a phone, families and teachers find Messages in the bottom bar instead
      topBarItems={
        <div className={bottomHasMessages ? "hidden md:block" : undefined}>
          <MessagesMenu />
        </div>
      }
      // a phone's bottom bar of the main pages
      bottomNav={<SchoolBottomNav />}
    >
      {children}
    </SidebarShell>
  );
}
