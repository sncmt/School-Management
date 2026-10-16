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
import { useAcademicYears } from "@/lib/school/academicYears";
import { useTimeLabel } from "@/lib/school/routine";
import { useDeleteScheduleOverride, useScheduleOverrides, type ScheduleOverride } from "@/lib/school/schedule";
import { useDateRange } from "../calendar/shared";
import { SpecialHoursFormDialog } from "./SpecialHoursFormDialog";

/** Different hours for some days: Ramadan timing, an exam day, a sports day. */
export function SpecialHours({ canManage }: { canManage: boolean }) {
  const t = useTranslations("school.routine.special");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const time = useTimeLabel();
  const dateRange = useDateRange();
  const years = useAcademicYears();
  const [yearId, setYearId] = useState<string | undefined>();
  const yearList = years.data ?? [];
  const shownYearId = yearId ?? yearList.find((y) => y.isCurrent)?.id ?? yearList[0]?.id;
  const { data, isPending, isError, error, refetch } = useScheduleOverrides(shownYearId);
  const [form, setForm] = useState<{ override: ScheduleOverride | null } | null>(null);
  const [deleting, setDeleting] = useState<ScheduleOverride | null>(null);

  const targetLabel = (r: ScheduleOverride["rules"][number]) =>
    r.section ? t("sectionTarget", { class: r.class?.name ?? "", name: r.section.name }) : r.class ? r.class.name : t("wholeSchool");

  if (years.isSuccess && yearList.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("noYears")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
          {yearList.length > 1 && (
            <Select value={shownYearId} onValueChange={setYearId}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearList.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {canManage && (
          <Button onClick={() => setForm({ override: null })}>
            <Plus /> {t("add")}
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.dates")}</TableHead>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.hours")}</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending && !!shownYearId ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Skeleton className="h-10 w-full" />
                </TableCell>
              </TableRow>
            ) : isError ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  <p>{t("loadFailed")}</p>
                  <p className="text-xs">{describeError(error)}</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
                    {tCommon("tryAgain")}
                  </Button>
                </TableCell>
              </TableRow>
            ) : !data || data.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  {t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              data.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="whitespace-nowrap">{dateRange(o.fromDate, o.toDate)}</TableCell>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell>
                    <ul className="space-y-0.5 text-sm">
                      {o.rules.map((r) => (
                        <li key={r.id}>
                          <span className="text-muted-foreground">{targetLabel(r)}:</span>{" "}
                          <span className="tabular-nums">
                            {time(r.startTime)} – {time(r.endTime)}
                          </span>
                          {r.periodTemplate && <span className="text-muted-foreground"> · {name(r.periodTemplate)}</span>}
                        </li>
                      ))}
                    </ul>
                  </TableCell>
                  <TableCell>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8" aria-label={t("actions")}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setForm({ override: o })}>
                            <Pencil /> {t("edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(o)}>
                            <Trash2 /> {t("delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SpecialHoursFormDialog
        open={!!form}
        override={form?.override ?? null}
        years={yearList}
        defaultYearId={shownYearId}
        onClose={() => setForm(null)}
      />
      <DeleteOverrideDialog override={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function DeleteOverrideDialog({ override, onClose }: { override: ScheduleOverride | null; onClose: () => void }) {
  const t = useTranslations("school.routine.special.deleteDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const remove = useDeleteScheduleOverride();

  const confirm = () => {
    if (!override) return;
    remove.mutate(override.id, {
      onSuccess: () => {
        toast.success(t("done", { name: override.name }));
        onClose();
      },
      onError: (e) => toast.error(describeError(e)),
    });
  };

  return (
    <AlertDialog open={!!override} onOpenChange={(open) => !open && !remove.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name: override?.name ?? "" })}</AlertDialogTitle>
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
