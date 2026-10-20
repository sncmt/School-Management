"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useFieldArray, useForm, useWatch, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import type { AcademicYear } from "@/lib/school/academicYears";
import { useFeeTypes, useMonthName, useSaveFeeStructure, type FeeStructure } from "@/lib/school/finance";
import { feeStructureFormSchema, monthsOf, type FeeStructureFormInput, type FeeStructureFormValues } from "@/zod/finance";
import { useSyncToast, yearMonths } from "./FeeStructuresTab";

/** Set one fee for a class and year, or change its amounts. */
export function FeeStructureDialog({
  open,
  structure,
  year,
  schoolClass,
  taken,
  onClose,
  onOpenFeeTypes,
}: {
  open: boolean;
  structure: FeeStructure | null;
  year: AcademicYear;
  schoolClass: { id: string; name: string };
  // fee types the class already has (a new one is chosen from the others)
  taken: string[];
  onClose: () => void;
  // to the Fee types tab, when there is none to choose (for those who may see it)
  onOpenFeeTypes?: () => void;
}) {
  const t = useTranslations("school.finance.structures.form");
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(structure ? "editTitle" : "addTitle", { class: schoolClass.name, year: year.name })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open && (
          <FeeStructureForm
            key={structure?.id ?? "new"}
            structure={structure}
            year={year}
            classId={schoolClass.id}
            taken={taken}
            onDone={onClose}
            onOpenFeeTypes={
              onOpenFeeTypes &&
              (() => {
                onClose();
                onOpenFeeTypes();
              })
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FeeStructureForm({
  structure,
  year,
  classId,
  taken,
  onDone,
  onOpenFeeTypes,
}: {
  structure: FeeStructure | null;
  year: AcademicYear;
  classId: string;
  taken: string[];
  onDone: () => void;
  onOpenFeeTypes?: () => void;
}) {
  const t = useTranslations("school.finance.structures.form");
  const tTypes = useTranslations("school.finance.feeTypes");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const monthName = useMonthName();
  const feeTypes = useFeeTypes();
  const save = useSaveFeeStructure();
  const syncToast = useSyncToast();
  const [formError, setFormError] = useState<string | null>(null);
  const months = yearMonths(year);

  const options = (feeTypes.data ?? []).filter((f) => (f.isActive && !taken.includes(f.id)) || f.id === structure?.feeTypeId);
  // nothing to choose: no active fee type at all yet, or the class already has every one
  const noneToChoose = !structure && feeTypes.isSuccess && options.length === 0;
  const noFeeTypesYet = noneToChoose && !feeTypes.data.some((f) => f.isActive);
  // the schedule as periods of the year: consecutive months with the same amount
  const initialPeriods = () => {
    if (!structure || structure.monthlyAmounts.length === 0) return [];
    const by = new Map(structure.monthlyAmounts.map((m) => [m.month, String(Number(m.amount))]));
    const periods: FeeStructureFormInput["periods"] = [];
    let i = 0;
    while (i < months.length) {
      const amount = by.get(months[i]);
      let j = i;
      while (j + 1 < months.length && by.get(months[j + 1]) === amount) j++;
      if (amount !== undefined) periods.push({ fromMonth: months[i], toMonth: months[j], amount });
      i = j + 1;
    }
    return periods;
  };

  const form = useForm<FeeStructureFormInput, unknown, FeeStructureFormValues>({
    resolver: zodResolver(feeStructureFormSchema),
    defaultValues: {
      feeTypeId: structure?.feeTypeId ?? "",
      byMonth: !!structure && structure.monthlyAmounts.length > 0,
      amount: structure && structure.monthlyAmounts.length === 0 ? String(Number(structure.amount)) : "",
      periods: initialPeriods(),
    },
  });
  const periods = useFieldArray({ control: form.control, name: "periods" });
  const feeTypeId = useWatch({ control: form.control, name: "feeTypeId" });
  const byMonth = useWatch({ control: form.control, name: "byMonth" });
  const watchedPeriods = useWatch({ control: form.control, name: "periods" });
  const feeType = options.find((f) => f.id === feeTypeId);
  const monthly = feeType?.frequency === "MONTHLY";
  const covered = new Set(watchedPeriods.flatMap((p) => monthsOf(p.fromMonth, p.toMonth)));
  const nextFree = months.find((m) => !covered.has(m));
  const rootError = form.formState.errors.periods?.root?.message;
  const tValidation = useTranslations("validation");

  const toggleByMonth = (on: boolean) => {
    form.setValue("byMonth", on);
    if (on && periods.fields.length === 0) {
      periods.append({ fromMonth: months[0], toMonth: months[months.length - 1], amount: form.getValues("amount") });
    }
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const useSchedule = monthly && values.byMonth;
    try {
      const result = await save.mutateAsync({
        academicYearId: year.id,
        classId,
        feeTypeId: values.feeTypeId,
        ...(useSchedule
          ? { monthlySchedule: values.periods.map((p) => ({ fromMonth: p.fromMonth, toMonth: p.toMonth, amount: p.amount })) }
          : { amount: values.amount }),
      });
      toast.success(t("saved", { name: feeType ? name(feeType) : "" }));
      syncToast(result.sync);
      onDone();
    } catch (error) {
      const fields = ["feeTypeId", "amount", ...values.periods.map((_, i) => `periods.${i}.amount`)] as FieldPath<FeeStructureFormInput>[];
      setFormError(applyServerErrors(error, form.setError, fields, describeError));
    }
  });

  const monthSelect = (value: number, onChange: (m: number) => void, label: string) => (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-full" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {months.map((m) => (
          <SelectItem key={m} value={String(m)}>
            {monthName(m)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />

        <FormField
          control={form.control}
          name="feeTypeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t("feeType")}</FormLabel>
              {noneToChoose ? (
                // an empty dropdown would open as a blank box that blocks the page: say why instead
                <div className="space-y-2 rounded-md border border-amber-500/30 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                  <p>{t(noFeeTypesYet ? "noFeeTypesYet" : "noFeeTypes")}</p>
                  {onOpenFeeTypes && (
                    <Button type="button" size="sm" variant="outline" onClick={onOpenFeeTypes}>
                      {t("openFeeTypes")}
                    </Button>
                  )}
                </div>
              ) : (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    // another fee type starts from one amount
                    form.setValue("byMonth", false);
                    periods.replace([]);
                  }}
                  disabled={!!structure || !feeTypes.isSuccess}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t(feeTypes.isSuccess ? "chooseFeeType" : "loadingFeeTypes")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {options.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {name(f)} · {tTypes(`frequencies.${f.frequency}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {feeTypes.isError && <p className="text-sm text-destructive">{describeError(feeTypes.error)}</p>}
              <FormMessage />
            </FormItem>
          )}
        />

        {feeType && monthly && (
          <label className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
            <span>
              <span className="font-medium">{t("byMonth")}</span>
              <span className="block text-xs text-muted-foreground">{t("byMonthHint")}</span>
            </span>
            <Switch checked={byMonth} onCheckedChange={toggleByMonth} />
          </label>
        )}

        {feeType && (!monthly || !byMonth) && (
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t(monthly ? "monthlyAmount" : "amount")}</FormLabel>
                <FormControl>
                  <div className="relative w-48">
                    <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">৳</span>
                    <Input inputMode="decimal" className="pl-7" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {feeType && monthly && byMonth && (
          <div className="space-y-2">
            {periods.fields.map((p, i) => (
              // on a phone: the two months on one line, the amount and the remove button under them
              <div key={p.id} className="grid grid-cols-2 items-start gap-2 rounded-md border p-2 sm:grid-cols-[1fr_1fr_8rem_auto] sm:border-0 sm:p-0">
                <FormField
                  control={form.control}
                  name={`periods.${i}.fromMonth`}
                  render={({ field }) => <FormItem>{monthSelect(field.value, field.onChange, t("from"))}</FormItem>}
                />
                <FormField
                  control={form.control}
                  name={`periods.${i}.toMonth`}
                  render={({ field }) => (
                    <FormItem>
                      {monthSelect(field.value, field.onChange, t("to"))}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`periods.${i}.amount`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">৳</span>
                          <Input inputMode="decimal" className="pl-7" aria-label={t("monthlyAmount")} {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="button" variant="ghost" size="icon" className="justify-self-end sm:justify-self-auto" onClick={() => periods.remove(i)} aria-label={t("removePeriod")}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            {rootError && <p className="text-sm text-destructive">{tValidation(rootError.replace("validation.", "") as "periodsRequired")}</p>}
            {nextFree !== undefined && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => periods.append({ fromMonth: nextFree, toMonth: months[months.length - 1], amount: "" })}
              >
                <Plus /> {t("addPeriod")}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">{t("periodsHint")}</p>
          </div>
        )}

        <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">{t("applyNote")}</p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone} disabled={save.isPending}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" disabled={save.isPending || !feeType}>
            {save.isPending ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
