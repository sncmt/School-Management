"use client";

import { CheckCircle2, CircleDashed } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useMarksProgress } from "@/lib/school/marks";
import { cn } from "@/lib/utils";

/** How far marks entry has got for a class: each subject in each section. */
export function MarksProgressView({
  examId,
  classId,
  onOpen,
}: {
  examId: string;
  classId: string;
  onOpen: (examSubjectId: string, sectionId: string) => void;
}) {
  const t = useTranslations("school.exams.marks");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const name = useLocalizedName();
  const { data, isPending, isError, error, refetch } = useMarksProgress({ examId, classId });

  if (isPending) return <Skeleton className="h-48" />;
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
        <p>{describeError(error)}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {tCommon("tryAgain")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className={cn("flex items-center gap-2 text-sm", data.complete ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400")}>
        {data.complete ? <CheckCircle2 className="size-4" /> : <CircleDashed className="size-4" />}
        {data.complete ? t("allIn") : t("missing", { count: data.missing })}
      </p>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("subject")}</TableHead>
              <TableHead>{t("section")}</TableHead>
              <TableHead>{t("entered")}</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                  {t("noSubjects")}
                </TableCell>
              </TableRow>
            ) : (
              data.items.map((i) => (
                <TableRow key={`${i.examSubjectId}-${i.section.id}`}>
                  <TableCell className="font-medium">{name(i.subject)}</TableCell>
                  <TableCell>{i.section.isDefault ? t("wholeClass") : i.section.name}</TableCell>
                  <TableCell className={cn("tabular-nums", !i.complete && "text-amber-700 dark:text-amber-400")}>
                    {format.number(i.entered)} / {format.number(i.students)}
                    {i.absent > 0 && <span className="text-muted-foreground"> · {t("absentCount", { count: i.absent })}</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => onOpen(i.examSubjectId, i.section.id)}>
                      {t("open")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
