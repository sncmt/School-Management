"use client";

import { CheckCircle2, MoreHorizontal, Pencil, Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCan } from "@/lib/auth/hooks";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useAcademicYears, useMakeAcademicYearCurrent, type AcademicYear } from "@/lib/school/academicYears";
import { cn } from "@/lib/utils";
import { AcademicYearFormDialog } from "./AcademicYearFormDialog";

const COLUMNS = ["name", "dates", "students", "exams"] as const;

export function AcademicYearsList() {
  const t = useTranslations("school.years");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const can = useCan();
  const { data, isPending, isError, error, isFetching, refetch } = useAcademicYears();

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<AcademicYear | null>(null);
  const [makingCurrent, setMakingCurrent] = useState<AcademicYear | null>(null);

  const years = data ?? [];
  const canUpdate = can("academic_year:update");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">{t("title")}</h1>
          <p className="page-subtitle">{t("description")}</p>
        </div>
        {can("academic_year:create") && (
          <Button onClick={() => setAdding(true)}>
            <Plus /> {t("add")}
          </Button>
        )}
      </div>

      <div className={cn("rounded-md border transition-opacity", isFetching && !isPending && "opacity-60")}>
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableHead key={column}>{t(`columns.${column}`)}</TableHead>
              ))}
              <TableHead className="w-12">
                <span className="sr-only">{t("columns.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 3 }, (_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: COLUMNS.length + 1 }, (_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <MessageRow>
                <p>{t("loadFailed")}</p>
                <p className="text-xs">{describeError(error)}</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  {tCommon("tryAgain")}
                </Button>
              </MessageRow>
            ) : years.length === 0 ? (
              <MessageRow>
                <p>{t("empty")}</p>
              </MessageRow>
            ) : (
              years.map((year) => (
                <YearRow
                  key={year.id}
                  year={year}
                  canUpdate={canUpdate}
                  onEdit={() => setEditing(year)}
                  onMakeCurrent={() => setMakingCurrent(year)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AcademicYearFormDialog
        open={adding || !!editing}
        year={editing}
        isFirstYear={years.length === 0}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
      />
      <MakeCurrentDialog year={makingCurrent} onClose={() => setMakingCurrent(null)} />
    </div>
  );
}

function MessageRow({ children }: { children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={COLUMNS.length + 1} className="h-32">
        <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
          {children}
        </div>
      </TableCell>
    </TableRow>
  );
}

function YearRow({
  year,
  canUpdate,
  onEdit,
  onMakeCurrent,
}: {
  year: AcademicYear;
  canUpdate: boolean;
  onEdit: () => void;
  onMakeCurrent: () => void;
}) {
  const t = useTranslations("school.years");
  const format = useFormatter();
  // calendar dates: format them as the UTC day the server stored
  const dateOptions = { dateStyle: "medium", timeZone: "UTC" } as const;

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-medium">{year.name}</span>
          {year.isCurrent && <Badge>{t("current")}</Badge>}
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {format.dateTimeRange(new Date(year.startDate), new Date(year.endDate), dateOptions)}
      </TableCell>
      <TableCell>{format.number(year._count.enrollments)}</TableCell>
      <TableCell>{format.number(year._count.exams)}</TableCell>
      <TableCell>
        {canUpdate && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label={t("columns.actions")}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil /> {t("edit")}
              </DropdownMenuItem>
              {!year.isCurrent && (
                <DropdownMenuItem onSelect={onMakeCurrent}>
                  <CheckCircle2 /> {t("makeCurrent")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );
}

function MakeCurrentDialog({ year, onClose }: { year: AcademicYear | null; onClose: () => void }) {
  const t = useTranslations("school.years.currentDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const makeCurrent = useMakeAcademicYearCurrent();

  const confirm = () => {
    if (!year) return;
    makeCurrent.mutate(year.id, {
      onSuccess: () => {
        toast.success(t("done", { name: year.name }));
        onClose();
      },
      onError: (error) => toast.error(describeError(error)),
    });
  };

  return (
    <AlertDialog open={!!year} onOpenChange={(open) => !open && !makeCurrent.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name: year?.name ?? "" })}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={makeCurrent.isPending}>{tCommon("cancel")}</AlertDialogCancel>
          <Button onClick={confirm} disabled={makeCurrent.isPending}>
            {makeCurrent.isPending ? t("working") : t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
