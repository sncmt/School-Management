"use client";

import { useTranslations } from "next-intl";
import type { StudentStatus } from "@/lib/school/students";
import { cn } from "@/lib/utils";

// a soft pill with a dot: the word carries the meaning, the colour only helps
const tones: Record<StudentStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-950/40 dark:text-emerald-300 [&>span]:bg-emerald-500",
  SUSPENDED: "bg-red-50 text-red-700 ring-red-600/15 dark:bg-red-950/40 dark:text-red-300 [&>span]:bg-red-500",
  INACTIVE: "bg-muted text-muted-foreground ring-border [&>span]:bg-muted-foreground/60",
  GRADUATED: "bg-navy-soft text-navy ring-navy/15 [&>span]:bg-brand",
};

export function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const t = useTranslations("studentStatuses");
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset", tones[status])}>
      <span className="size-1.5 rounded-full" />
      {t(status)}
    </span>
  );
}
