"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useSchool, type SchoolDetail } from "@/lib/platform/schools";

/** Loads one school for its detail and edit pages, with the loading and error states. */
export function SchoolLoader({
  schoolId,
  children,
}: {
  schoolId: string;
  children: (school: SchoolDetail) => ReactNode;
}) {
  const t = useTranslations("platform.schoolDetail");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const { data, isPending, isError, error, refetch, isRefetching } = useSchool(schoolId);

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="font-medium">{t("loadFailed")}</p>
        <p className="text-sm text-muted-foreground">{describeError(error)}</p>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/schools">
              <ArrowLeft /> {t("back")}
            </Link>
          </Button>
          <Button onClick={() => refetch()} disabled={isRefetching}>
            {tCommon("tryAgain")}
          </Button>
        </div>
      </div>
    );
  }

  return children(data);
}
