"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { StudentStatus } from "@/lib/school/students";

const variants: Record<StudentStatus, "default" | "secondary" | "outline" | "destructive"> = {
  ACTIVE: "default",
  SUSPENDED: "destructive",
  INACTIVE: "outline",
  GRADUATED: "secondary",
};

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const t = useTranslations("studentStatuses");
  return <Badge variant={variants[status]}>{t(status)}</Badge>;
}
