import {
  Banknote,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  Clock,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Layers,
  ListOrdered,
  Megaphone,
  Rows3,
  Shapes,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import type { MenuGroup } from "@/components/layout/SidebarShell";
import { SMS_PERMISSIONS } from "@/lib/school/smsKinds";

// The school's modules, in sidebar order. A titled group opens into a list of its pages
// (shown as one row when only one of them is visible); each page shows only with its
// permission, and a group with nothing to show is hidden. Add new modules here.
export const schoolMenu: MenuGroup[] = [
  {
    items: [
      { href: "/dashboard", label: "dashboard", icon: LayoutDashboard },
      // every member: each reads the notices meant for them
      { href: "/notices", label: "notices", icon: Megaphone },
      // SMS to guardians: anyone with one of its permissions (each tab checks its own)
      { href: "/sms", label: "sms", icon: Smartphone, permission: SMS_PERMISSIONS, anyPermission: true },
      // teachers (their own subjects), staff with homework permissions and families
      { href: "/homework", label: "homework", icon: BookOpenCheck },
    ],
  },
  {
    // no title: each is its own row in the menu, not a page inside a group
    items: [
      { href: "/students", label: "students", icon: Users, permission: "student:view" },
      { href: "/teachers", label: "teachers", icon: GraduationCap, permission: "teacher:view" },
      { href: "/attendance", label: "attendance", icon: ClipboardCheck, permission: ["attendance:view", "attendance:mark", "teacher_attendance:mark"], anyPermission: true },
      { href: "/promotion", label: "promotion", icon: TrendingUp, permission: "student:promote" },
    ],
  },
  {
    label: "academics",
    icon: BookOpen,
    items: [
      { href: "/academic-years", label: "academicYears", icon: CalendarRange, permission: "academic_year:view" },
      { href: "/calendar", label: "calendar", icon: CalendarDays, permission: "holiday:view" },
      { href: "/classes", label: "classes", icon: Layers, permission: "class:view" },
      { href: "/sections", label: "sections", icon: Rows3, permission: "section:view" },
      { href: "/groups", label: "groups", icon: Shapes, permission: "group:view" },
      { href: "/subjects", label: "schoolSubjects", icon: BookOpen, permission: "subject:view" },
      { href: "/class-subjects", label: "classSubjects", icon: ListOrdered, permission: "class_subject:view" },
      { href: "/subject-teachers", label: "subjectTeachers", icon: UserCheck, permission: "teacher:view" },
      { href: "/routine", label: "routine", icon: Clock, permission: "routine:view" },
    ],
  },
  {
    label: "results",
    icon: FileText,
    items: [{ href: "/exams", label: "exams", icon: FileText, permission: ["exam:view", "grading:view"], anyPermission: true }],
  },
  {
    label: "money",
    icon: Banknote,
    items: [
      {
        href: "/finance",
        label: "finance",
        icon: Banknote,
        permission: ["payment:create", "payment:view", "student_fee:view", "fee_structure:view", "fee_type:view", "fund:view", "fund:ledger", "expense:view", "finance_report:view"],
        anyPermission: true,
      },
    ],
  },
  {
    label: "administration",
    icon: ShieldCheck,
    items: [{ href: "/roles", label: "roles", icon: ShieldCheck, superAdminOnly: true }],
  },
];
