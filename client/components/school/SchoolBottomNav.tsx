"use client";

import type { LucideIcon } from "lucide-react";
import { BookOpenCheck, ClipboardCheck, House, Megaphone, Menu, MessageSquareText, ReceiptText, Users } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";
import { useCan, useSchoolMe } from "@/lib/auth/hooks";
import { useFamilyRole } from "@/lib/school/family";
import { useUnreadCount } from "@/lib/school/notifications";
import { cn } from "@/lib/utils";

type Tab = { href: string; label: string; icon: LucideIcon; badge?: number };

const ATTENDANCE_PERMISSIONS = ["attendance:view", "attendance:mark", "teacher_attendance:mark", "attendance:devices"];

/** Families and teachers: their bottom bar has Messages (the top bar's message icon then hides on a phone). */
export const useBottomNavHasMessages = () => {
  const me = useSchoolMe();
  const { familyOnly } = useFamilyRole();
  return !!me && (familyOnly || (!me.isSuperAdmin && me.roles.some((r) => r.name === "TEACHER")));
};

/** Active on its own page and the pages under it. */
const isActive = (href: string, pathname: string) => pathname === href || pathname.startsWith(`${href}/`);

/*
 * On a phone, the main pages along the bottom (like a phone app), in the school's sidebar
 * colour with the current one in gold. Which pages depends on who is logged in:
 *   families: Home, Homework, Fees, Messages
 *   teachers: Home, Attendance, Homework, Messages
 *   everyone else: Home and up to three pages they may open (Students, Attendance, Notices)
 * and always Menu last, which opens the full menu.
 */
export function SchoolBottomNav() {
  const t = useTranslations("bottomNav");
  const format = useFormatter();
  const me = useSchoolMe();
  const can = useCan();
  const { familyOnly } = useFamilyRole();
  const unread = useUnreadCount();
  const { setOpenMobile } = useSidebar();
  // the school's pages are served from app/school; compare public paths only
  const pathname = usePathname().replace(/^\/school(?=\/|$)/, "") || "/";

  if (!me) return null;

  const home: Tab = { href: "/dashboard", label: t("home"), icon: House };
  const messages: Tab = { href: "/messages", label: t("messages"), icon: MessageSquareText, badge: unread };
  const homework: Tab = { href: "/homework", label: t("homework"), icon: BookOpenCheck };
  const attendance: Tab = { href: "/attendance", label: t("attendance"), icon: ClipboardCheck };
  const isTeacher = !me.isSuperAdmin && me.roles.some((r) => r.name === "TEACHER");

  const tabs: Tab[] = familyOnly
    ? [home, homework, { href: "/fees", label: t("fees"), icon: ReceiptText }, messages]
    : isTeacher
      ? [home, ...(can(ATTENDANCE_PERMISSIONS, { any: true }) ? [attendance] : []), homework, messages].slice(0, 4)
      : [
          home,
          ...[
            can("student:view") && { href: "/students", label: t("students"), icon: Users },
            can(ATTENDANCE_PERMISSIONS, { any: true }) && attendance,
            { href: "/notices", label: t("notices"), icon: Megaphone },
          ].filter((tab): tab is Tab => !!tab),
        ].slice(0, 4);

  const itemClass = (active: boolean) =>
    cn(
      "flex min-w-0 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors",
      active ? "text-sidebar-primary" : "text-white/70 hover:text-white",
    );
  const iconBox = (active: boolean) =>
    cn("relative flex h-8 w-12 items-center justify-center rounded-xl transition-colors", active && "bg-sidebar-primary/15");

  return (
    // "dark" so the menu's own colours (its gold) apply, as in the sidebar
    <nav
      aria-label={t("label")}
      className="dark no-print fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-school-sidebar pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgb(0_0_0/0.15)] md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-1">
        {tabs.map((tab) => {
          const active = isActive(tab.href, pathname);
          return (
            <li key={tab.href} className="min-w-0">
              <Link href={tab.href} className={itemClass(active)} aria-current={active ? "page" : undefined}>
                <span className={iconBox(active)}>
                  <tab.icon className="size-5" />
                  {!!tab.badge && (
                    <span className="absolute -top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] leading-none font-semibold text-white tabular-nums ring-2 ring-school-sidebar">
                      {tab.badge > 99 ? "99+" : format.number(tab.badge)}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate">{tab.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="min-w-0">
          <button type="button" onClick={() => setOpenMobile(true)} className={cn(itemClass(false), "w-full")}>
            <span className={iconBox(false)}>
              <Menu className="size-5" />
            </span>
            <span>{t("menu")}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
