import { Banknote, BookOpen, ShieldCheck, TrendingUp, CalendarDays, ClipboardCheck, FileText, CalendarRange, GraduationCap, LayoutDashboard, Layers, ListOrdered, Rows3, Clock, Shapes, UserCheck, Users } from "lucide-react";
import type { MenuItem } from "@/components/layout/SidebarShell";

// The school's modules, in sidebar order; each shows only with its permission.
// Add new modules here.
export const schoolMenu: MenuItem[] = [
  { href: "/dashboard", label: "dashboard", icon: LayoutDashboard },
  { href: "/academic-years", label: "academicYears", icon: CalendarRange, permission: "academic_year:view" },
  { href: "/calendar", label: "calendar", icon: CalendarDays, permission: "holiday:view" },
  { href: "/classes", label: "classes", icon: Layers, permission: "class:view" },
  { href: "/sections", label: "sections", icon: Rows3, permission: "section:view" },
  { href: "/groups", label: "groups", icon: Shapes, permission: "group:view" },
  { href: "/subjects", label: "schoolSubjects", icon: BookOpen, permission: "subject:view" },
  { href: "/class-subjects", label: "classSubjects", icon: ListOrdered, permission: "class_subject:view" },
  { href: "/students", label: "students", icon: Users, permission: "student:view" },
  { href: "/promotion", label: "promotion", icon: TrendingUp, permission: "student:promote" },
  { href: "/attendance", label: "attendance", icon: ClipboardCheck, permission: ["attendance:view", "attendance:mark", "teacher_attendance:mark"], anyPermission: true },
  { href: "/teachers", label: "teachers", icon: GraduationCap, permission: "teacher:view" },
  { href: "/subject-teachers", label: "subjectTeachers", icon: UserCheck, permission: "teacher:view" },
  { href: "/routine", label: "routine", icon: Clock, permission: "routine:view" },
  { href: "/exams", label: "exams", icon: FileText, permission: ["exam:view", "grading:view"], anyPermission: true },
  { href: "/finance", label: "finance", icon: Banknote, permission: ["payment:create", "payment:view", "student_fee:view", "fee_structure:view", "fee_type:view", "fund:view", "fund:ledger", "expense:view", "finance_report:view"], anyPermission: true },
  { href: "/roles", label: "roles", icon: ShieldCheck, superAdminOnly: true },
];
