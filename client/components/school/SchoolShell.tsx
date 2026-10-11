"use client";

import { School } from "lucide-react";
import type { ReactNode } from "react";
import { SidebarShell } from "@/components/layout/SidebarShell";
import { useSchoolMe } from "@/lib/auth/hooks";
import { useLocalizedName } from "@/lib/i18n/names";
import { schoolMenu } from "./navigation";

/** School layout: the school's name and logo, its modules in the sidebar. */
export function SchoolShell({ children }: { children: ReactNode }) {
  const me = useSchoolMe();
  const name = useLocalizedName();

  const icon = me?.school.logo ? (
    // eslint-disable-next-line @next/next/no-img-element -- school logos can be on any host
    <img src={me.school.logo} alt="" className="size-8 object-contain" />
  ) : (
    <School className="size-4" />
  );

  return (
    <SidebarShell
      session="SCHOOL"
      brand={{ icon, title: me ? name(me.school) : "", home: "/dashboard" }}
      menu={schoolMenu}
    >
      {children}
    </SidebarShell>
  );
}
