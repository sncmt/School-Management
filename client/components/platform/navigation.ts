import { BookOpen, CalendarDays, LayoutDashboard, School } from "lucide-react";
import type { MenuGroup } from "@/components/layout/SidebarShell";

// The platform admin's modules, in sidebar order. Add new modules here.
export const platformMenu: MenuGroup[] = [
  {
    items: [
      { href: "/", label: "dashboard", icon: LayoutDashboard },
      { href: "/schools", label: "schools", icon: School },
      { href: "/subjects", label: "subjects", icon: BookOpen },
      { href: "/holidays", label: "holidays", icon: CalendarDays },
    ],
  },
];
