"use client";

import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import type { AcademicYear } from "@/lib/school/academicYears";
import {
  daysInRange,
  useCalendarEntries,
  useDeleteCalendarEntry,
  type CalendarEntry,
} from "@/lib/school/calendar";
import { cn } from "@/lib/utils";
import { DAY_STYLES, useDateRange } from "./shared";

const COLUMNS = ["dates", "name", "kind", "appliesTo"] as const;

export function EntriesTab({
  years,
  yearId,
  onYearChange,
  canManage,
  onAdd,
  onEdit,
}: {
  years: AcademicYear[];
  yearId: string | undefined;
  onYearChange: (id: string) => void;
  canManage: boolean;
  onAdd: () => void;
  onEdit: (entry: CalendarEntry) => void;
}) {
  const t = useTranslations("school.calendar.entries");
  const tType = useTranslations("school.calendar.holidayTypes");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const dateRange = useDateRange();
  const { data, isPending, isError, error, refetch } = useCalendarEntries(yearId);
  const [deleting, setDeleting] = useState<CalendarEntry | null>(null);

  const entries = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("year")}</span>
          <Select value={yearId} onValueChange={onYearChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y.id} value={y.id}>
                  {y.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {canManage && (
          <Button onClick={onAdd}>
            <Plus /> {t("add")}
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((c) => (
                <TableHead key={c}>{t(`columns.${c}`)}</TableHead>
              ))}
              <TableHead className="w-12">
                <span className="sr-only">{t("columns.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && !!yearId ? (
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
            ) : entries.length === 0 ? (
              <MessageRow>
                <p>{t("empty")}</p>
              </MessageRow>
            ) : (
              entries.map((entry) => {
                const days = daysInRange(entry.fromDate, entry.toDate);
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">
                      <div>{dateRange(entry.fromDate, entry.toDate)}</div>
                      {days > 1 && <div className="text-xs text-muted-foreground">{t("days", { count: days })}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{name(entry)}</div>
                      {entry.description && <div className="text-xs text-muted-foreground">{entry.description}</div>}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "size-2.5 rounded-sm",
                            DAY_STYLES[entry.kind === "WORKING_DAY" ? "WORKING_DAY" : "HOLIDAY"].dot,
                          )}
                        />
                        {entry.kind === "WORKING_DAY" ? t("workingDay") : entry.type ? tType(entry.type) : ""}
                      </span>
                    </TableCell>
                    <TableCell>
                      {entry.allClasses ? (
                        t("allClasses")
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {entry.classes.map((c) => (
                            <Badge key={c.class.id} variant="secondary">
                              {c.class.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {entry.kind === "HOLIDAY" && !entry.teachersOff && (
                        <div className="text-xs text-muted-foreground">{t("teachersWork")}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8" aria-label={t("columns.actions")}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => onEdit(entry)}>
                              <Pencil /> {t("edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(entry)}>
                              <Trash2 /> {t("delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <DeleteEntryDialog entry={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function MessageRow({ children }: { children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={COLUMNS.length + 1} className="h-28">
        <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
          {children}
        </div>
      </TableCell>
    </TableRow>
  );
}

function DeleteEntryDialog({ entry, onClose }: { entry: CalendarEntry | null; onClose: () => void }) {
  const t = useTranslations("school.calendar.entries.deleteDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const remove = useDeleteCalendarEntry();

  const confirm = () => {
    if (!entry) return;
    remove.mutate(entry.id, {
      onSuccess: () => {
        toast.success(t("done", { name: name(entry) }));
        onClose();
      },
      onError: (e) => toast.error(describeError(e)),
    });
  };

  return (
    <AlertDialog open={!!entry} onOpenChange={(open) => !open && !remove.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name: entry ? name(entry) : "" })}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>{tCommon("cancel")}</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={remove.isPending}>
            {remove.isPending ? t("working") : t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
