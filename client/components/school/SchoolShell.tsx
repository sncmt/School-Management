"use client";

import { School } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { SidebarShell } from "@/components/layout/SidebarShell";
import { useSchoolMe } from "@/lib/auth/hooks";
import { useLocalizedName } from "@/lib/i18n/names";
import { schoolMenu } from "./navigation";

/** School layout: the school's name and logo, its modules in the sidebar. */
export function SchoolShell({ children }: { children: ReactNode }) {
  const me = useSchoolMe();
  const name = useLocalizedName();
  const t = useTranslations("shell");

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
        // everyone sees the year they are working in
        subtitle: me?.academicYear ? t("academicYear", { year: me.academicYear.name }) : undefined,
        home: "/dashboard",
      }}
      menu={schoolMenu}
    >
      {children}
    </SidebarShell>
  );
}
