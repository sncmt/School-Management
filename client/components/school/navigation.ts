import {
  Settings,
  Banknote,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  Clock,
  FileText,
  GraduationCap,
  IdCard,
  LayoutDashboard,
  Layers,
  ListOrdered,
  Megaphone,
  ReceiptText,
  Rows3,
  Shapes,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import type { MenuGroup } from "@/components/layout/SidebarShell";
import { FEES_PERMISSIONS, FINANCE_PERMISSIONS } from "@/lib/school/moneyPermissions";
import { SMS_PERMISSIONS } from "@/lib/school/smsKinds";

// The school's modules, in sidebar order: the most used first (dashboard, students, teachers,
// academics), then the daily work, exams and money, then messages and the occasional tools.
// A titled group opens into a list of its pages (shown as one row when only one of them is
// visible); each page shows only with its permission, and a group with nothing to show is
// hidden. Add new modules here.
export const schoolMenu: MenuGroup[] = [
  {
    // no title: each is its own row in the menu, not a page inside a group
    items: [
      { href: "/dashboard", label: "dashboard", icon: LayoutDashboard },
      { href: "/students", label: "students", icon: Users, permission: "student:view" },
      { href: "/teachers", label: "teachers", icon: GraduationCap, permission: "teacher:view" },
    ],
  },
  {
    label: "academics",
    icon: BookOpen,
    items: [
      { href: "/academic-years", label: "academicYears", icon: CalendarRange, permission: "academic_year:view" },
      { href: "/classes", label: "classes", icon: Layers, permission: "class:view" },
      { href: "/sections", label: "sections", icon: Rows3, permission: "section:view" },
      { href: "/groups", label: "groups", icon: Shapes, permission: "group:view" },
      { href: "/subjects", label: "schoolSubjects", icon: BookOpen, permission: "subject:view" },
      { href: "/class-subjects", label: "classSubjects", icon: ListOrdered, permission: "class_subject:view" },
      { href: "/subject-teachers", label: "subjectTeachers", icon: UserCheck, permission: "teacher:view" },
      { href: "/routine", label: "routine", icon: Clock, permission: "routine:view" },
      { href: "/calendar", label: "calendar", icon: CalendarDays, permission: "holiday:view" },
    ],
  },
  {
    items: [
      { href: "/attendance", label: "attendance", icon: ClipboardCheck, permission: ["attendance:view", "attendance:mark", "teacher_attendance:mark", "attendance:devices"], anyPermission: true },
      // teachers (their own subjects), staff with homework permissions and families
      { href: "/homework", label: "homework", icon: BookOpenCheck },
    ],
  },
  {
    label: "results",
    icon: FileText,
    items: [{ href: "/exams", label: "exams", icon: FileText, permission: ["exam:view", "grading:view"], anyPermission: true }],
  },
  {
    items: [
      // fee work; family logins see their children's payments there
      { href: "/fees", label: "fees", icon: ReceiptText, permission: FEES_PERMISSIONS, anyPermission: true, family: true },
      // the school's funds, expenses and ledger
      { href: "/finance", label: "finance", icon: Banknote, permission: FINANCE_PERMISSIONS, anyPermission: true },
    ],
  },
  {
    items: [
      // every member: each reads the notices meant for them
      { href: "/notices", label: "notices", icon: Megaphone },
      // SMS to guardians: anyone with one of its permissions (each tab checks its own)
      { href: "/sms", label: "sms", icon: Smartphone, permission: SMS_PERMISSIONS, anyPermission: true },
      // student tools used now and then: printing ID cards, moving to the next year
      { href: "/id-cards", label: "idCards", icon: IdCard, permission: "student:view" },
      { href: "/promotion", label: "promotion", icon: TrendingUp, permission: "student:promote" },
    ],
  },
  {
    label: "administration",
    icon: ShieldCheck,
    items: [
      { href: "/roles", label: "roles", icon: ShieldCheck, superAdminOnly: true },
      // the school's own look (its accent colour)
      { href: "/settings", label: "schoolSettings", icon: Settings, superAdminOnly: true },
    ],
  },
];
