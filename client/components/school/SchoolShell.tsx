"use client";

import { School } from "lucide-react";
import type { ReactNode } from "react";
import { SidebarShell } from "@/components/layout/SidebarShell";
import { useSchoolMe } from "@/lib/auth/hooks";
import { useTranslations } from "next-intl";
import { useLocalizedName } from "@/lib/i18n/names";
import { displayPhone, SUPPORT_WHATSAPP } from "@/lib/marketing/company";
import { AnnouncementsMenu } from "./announcements/AnnouncementsMenu";
import { MessagesMenu } from "./messages/MessagesMenu";
import { schoolMenu } from "./navigation";
import { SchoolBottomNav, useBottomNavHasMessages } from "./SchoolBottomNav";

/** School layout: the school's name and logo, its modules in the sidebar. */
export function SchoolShell({ children }: { children: ReactNode }) {
  const t = useTranslations("nav");
  const tShell = useTranslations("shell");
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
        // the school's full name, in the top bar
        title: me ? name(me.school) : "",
        // beside the logo in the menu
        sidebarTitle: t("dashboard"),
        // everyone sees the year they are working in
        // (school and college: both current years, "2026 · 2026-27")
        subtitle: me?.academicYears?.length
          ? tShell("session", { year: me.academicYears.map((y) => y.name).join(" · ") })
          : me?.academicYear?.name && tShell("session", { year: me.academicYear.name }),
        home: "/dashboard",
      }}
      menu={schoolMenu}
      // how to reach the platform: a WhatsApp chat
      footer={
        <>
          {tShell("help")}{" "}
          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold whitespace-nowrap text-sidebar-foreground hover:underline"
          >
            {displayPhone(SUPPORT_WHATSAPP)}
          </a>
        </>
      }
      // the super admin: the platform's announcements (the bell). Families and teachers: their
      // messages (on a phone those are in the bottom bar instead). Other staff get no messages.
      topBarItems={
        me?.isSuperAdmin ? (
          <AnnouncementsMenu />
        ) : bottomHasMessages ? (
          <div className="hidden md:block">
            <MessagesMenu />
          </div>
        ) : null
      }
      // a phone's bottom bar of the main pages
      bottomNav={<SchoolBottomNav />}
    >
      {children}
    </SidebarShell>
  );
}
