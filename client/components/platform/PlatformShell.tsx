"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { SidebarShell } from "@/components/layout/SidebarShell";
import { platformMenu } from "./navigation";

/** Platform admin layout: module sidebar on the left, page on the right. */
export function PlatformShell({ children }: { children: ReactNode }) {
  const t = useTranslations("nav");
  const tShell = useTranslations("shell");
  return (
    <SidebarShell
      session="PLATFORM"
      brand={{ icon: <ShieldCheck className="size-5" />, title: t("platformAdmin"), subtitle: tShell("platformSubtitle"), home: "/" }}
      menu={platformMenu}
    >
      {children}
    </SidebarShell>
  );
}
