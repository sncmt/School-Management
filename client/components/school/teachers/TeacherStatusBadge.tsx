"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { TeacherStatus } from "@/lib/school/teachers";

const variants: Record<TeacherStatus, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  ON_LEAVE: "secondary",
  RESIGNED: "outline",
  RETIRED: "outline",
};

export function TeacherStatusBadge({ status }: { status: TeacherStatus }) {
  const t = useTranslations("teacherStatuses");
  return <Badge variant={variants[status]}>{t(status)}</Badge>;
}
