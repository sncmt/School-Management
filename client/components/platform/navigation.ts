import { LayoutDashboard, School, type LucideIcon } from "lucide-react";
import type messages from "@/messages/en.json";

export type PlatformMenuItem = {
  href: string;
  // key under "nav" in the messages
  label: keyof (typeof messages)["nav"];
  icon: LucideIcon;
};

// The platform admin's modules, in sidebar order. Add new modules here.
export const platformMenu: PlatformMenuItem[] = [
  { href: "/", label: "dashboard", icon: LayoutDashboard },
  { href: "/schools", label: "schools", icon: School },
];

/** A menu item is active on its own page and the pages under it ("/" only on itself). */
export const isMenuItemActive = (href: string, pathname: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
