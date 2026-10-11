import { BookOpen, CalendarRange, GraduationCap, LayoutDashboard, Layers, ListOrdered, Rows3, Shapes, UserCheck, Users } from "lucide-react";
import type { MenuItem } from "@/components/layout/SidebarShell";

// The school's modules, in sidebar order; each shows only with its permission.
// Add new modules here.
export const schoolMenu: MenuItem[] = [
  { href: "/dashboard", label: "dashboard", icon: LayoutDashboard },
  { href: "/academic-years", label: "academicYears", icon: CalendarRange, permission: "academic_year:view" },
  { href: "/classes", label: "classes", icon: Layers, permission: "class:view" },
  { href: "/sections", label: "sections", icon: Rows3, permission: "section:view" },
  { href: "/groups", label: "groups", icon: Shapes, permission: "group:view" },
  { href: "/subjects", label: "schoolSubjects", icon: BookOpen, permission: "subject:view" },
  { href: "/class-subjects", label: "classSubjects", icon: ListOrdered, permission: "class_subject:view" },
  { href: "/students", label: "students", icon: Users, permission: "student:view" },
  { href: "/teachers", label: "teachers", icon: GraduationCap, permission: "teacher:view" },
  { href: "/subject-teachers", label: "subjectTeachers", icon: UserCheck, permission: "teacher:view" },
];
