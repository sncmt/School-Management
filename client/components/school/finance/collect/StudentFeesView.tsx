"use client";

import { BadgePercent, MoreHorizontal, Percent, Plus, Trash2 } from "lucide-react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCan } from "@/lib/auth/hooks";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useRemoveCustomFee, useStudentFees, type StudentFee } from "@/lib/school/collection";
import { useMoney } from "@/lib/school/finance";
import type { Enrollment } from "@/lib/school/students";
import { cn } from "@/lib/utils";
import { FeeStatusBadge, ListState, useFeeLabel } from "../shared";
import { BulkDiscountDialog, CustomFeeDialog, DiscountDialog } from "./FeeDialogs";

/** Every fee of the student in a year, with discounts and fees for this student only. */
export function StudentFeesView({ studentId, enrollments }: { studentId: string; enrollments: Enrollment[] }) {
  const t = useTranslations("school.finance.collect.fees");
  const describeError = useErrorMessage();
  const money = useMoney();
  const feeLabel = useFeeLabel();
  const can = useCan();
  const canDiscount = can("student_fee:discount");
  const canCustom = can("student_fee:create_custom");
  const [yearId, setYearId] = useState(enrollments[0]?.academicYearId);
  const fees = useStudentFees(studentId, { academicYearId: yearId, page: 1, limit: 100 });
  const remove = useRemoveCustomFee();
  const [discounting, setDiscounting] = useState<StudentFee | null>(null);
  const [bulk, setBulk] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<StudentFee | null>(null);

  const items = fees.data?.items ?? [];
  const s = fees.data?.summary;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {enrollments.length > 1 && (
          <Select value={yearId} onValueChange={setYearId}>
            <SelectTrigger className="w-36" aria-label={t("year")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {enrollments.map((e) => (
                <SelectItem key={e.academicYearId} value={e.academicYearId}>
                  {e.academicYear.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="ml-auto flex gap-2">
          {canDiscount && items.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setBulk(true)}>
              <BadgePercent /> {t("bulkDiscount")}
            </Button>
          )}
          {canCustom && yearId && (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus /> {t("addFee")}
            </Button>
          )}
        </div>
      </div>

      <ListState isPending={fees.isPending} error={fees.error} onRetry={() => fees.refetch()} empty={items.length === 0 ? t("empty") : null}>
        <div className={cn("rounded-md border", fees.isFetching && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.fee")}</TableHead>
                <TableHead className="text-right">{t("columns.amount")}</TableHead>
                <TableHead className="text-right">{t("columns.discount")}</TableHead>
                <TableHead className="text-right">{t("columns.paid")}</TableHead>
                <TableHead className="text-right">{t("columns.remaining")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((f) => {
                const custom = f.feeStructureId === null;
                const removable = custom && Number(f.paidAmount) === 0;
                return (
                  <TableRow key={f.id}>
                    <TableCell>
                      <div className="font-medium">{feeLabel(f)}</div>
                      {custom && <div className="text-xs text-muted-foreground">{t("customFee")}</div>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(f.amount)}</TableCell>
                    <TableCell className="text-right tabular-nums" title={f.discountReason ?? undefined}>
                      {Number(f.discountAmount) > 0 ? money(f.discountAmount) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(f.paidAmount)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{money(f.remaining)}</TableCell>
                    <TableCell>
                      <FeeStatusBadge status={f.status} />
                    </TableCell>
                    <TableCell>
                      {(canDiscount || (canCustom && removable)) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8" aria-label={t("actions")}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canDiscount && (
                              <DropdownMenuItem onSelect={() => setDiscounting(f)}>
                                <Percent /> {t("discount")}
                              </DropdownMenuItem>
                            )}
                            {canCustom && removable && (
                              <DropdownMenuItem variant="destructive" onSelect={() => setRemoving(f)}>
                                <Trash2 /> {t("remove")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            {s && (
              <TableFooter>
                <TableRow className="font-semibold">
                  <TableCell>{t("total")}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(s.totalAmount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(s.totalDiscount)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(s.totalPaid)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(s.totalRemaining)}</TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </ListState>

      <DiscountDialog fee={discounting} onClose={() => setDiscounting(null)} />
      {yearId && (
        <>
          <BulkDiscountDialog open={bulk} studentId={studentId} academicYearId={yearId} fees={items} onClose={() => setBulk(false)} />
          <CustomFeeDialog open={adding} studentId={studentId} academicYearId={yearId} onClose={() => setAdding(false)} />
        </>
      )}

      <AlertDialog open={!!removing} onOpenChange={(open) => !open && !remove.isPending && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeTitle", { fee: removing ? feeLabel(removing) : "" })}</AlertDialogTitle>
            <AlertDialogDescription>{t("removeDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>{t("cancel")}</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                removing &&
                remove.mutate(removing.id, {
                  onSuccess: () => {
                    toast.success(t("removed"));
                    setRemoving(null);
                  },
                  onError: (e) => toast.error(describeError(e)),
                })
              }
            >
              <Trash2 /> {t("remove")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
