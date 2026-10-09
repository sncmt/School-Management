"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { SchoolStatus } from "@/lib/platform/schools";

const variants: Record<SchoolStatus, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  PENDING: "secondary",
  INACTIVE: "outline",
  SUSPENDED: "destructive",
  EXPIRED: "destructive",
};

export function SchoolStatusBadge({ status }: { status: SchoolStatus }) {
  const t = useTranslations("statuses");
  return <Badge variant={variants[status]}>{t(status)}</Badge>;
}
