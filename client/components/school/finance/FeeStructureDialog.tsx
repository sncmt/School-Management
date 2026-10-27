"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, useWatch, type FieldPath } from "react-hook-form";
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
import { feeStructureFormSchema, type FeeStructureFormInput, type FeeStructureFormValues } from "@/zod/finance";
import { cn } from "@/lib/utils";
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
  // every month of the year: ticked (with its amount) when the fee is charged in it
  const initialMonths = (): FeeStructureFormInput["months"] => {
    const by = new Map((structure?.monthlyAmounts ?? []).map((m) => [m.month, String(Number(m.amount))]));
    return months.map((month) => ({ month, on: by.has(month), amount: by.get(month) ?? "" }));
  };

  const form = useForm<FeeStructureFormInput, unknown, FeeStructureFormValues>({
    resolver: zodResolver(feeStructureFormSchema),
    defaultValues: {
      feeTypeId: structure?.feeTypeId ?? "",
      byMonth: !!structure && structure.monthlyAmounts.length > 0,
      amount: structure && structure.monthlyAmounts.length === 0 ? String(Number(structure.amount)) : "",
      months: initialMonths(),
    },
  });
  const feeTypeId = useWatch({ control: form.control, name: "feeTypeId" });
  const byMonth = useWatch({ control: form.control, name: "byMonth" });
  const rows = useWatch({ control: form.control, name: "months" });
  const feeType = options.find((f) => f.id === feeTypeId);
  const monthly = feeType?.frequency === "MONTHLY";
  const rootError = form.formState.errors.months?.root?.message;
  const tValidation = useTranslations("validation");
  // one amount for every ticked month at once
  const [fill, setFill] = useState("");
  const ticked = rows.filter((r) => r.on).length;

  // month by month starts from what it was: nothing ticked yet means every month at the one amount
  const toggleByMonth = (on: boolean) => {
    form.setValue("byMonth", on);
    if (on && !form.getValues("months").some((m) => m.on)) {
      const amount = form.getValues("amount");
      form.setValue("months", months.map((month) => ({ month, on: true, amount })));
    }
  };
  const tickAll = (on: boolean) =>
    form.setValue("months", form.getValues("months").map((m) => ({ ...m, on })), { shouldValidate: form.formState.isSubmitted });
  const fillTicked = () =>
    form.setValue("months", form.getValues("months").map((m) => (m.on ? { ...m, amount: fill.trim() } : m)), { shouldValidate: form.formState.isSubmitted });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const useSchedule = monthly && values.byMonth;
    try {
      const result = await save.mutateAsync({
        academicYearId: year.id,
        classId,
        feeTypeId: values.feeTypeId,
        // each ticked month is its own part of the year
        ...(useSchedule
          ? { monthlySchedule: values.months.map((m) => ({ fromMonth: m.month, toMonth: m.month, amount: m.amount })) }
          : { amount: values.amount }),
      });
      toast.success(t("saved", { name: feeType ? name(feeType) : "" }));
      syncToast(result.sync);
      onDone();
    } catch (error) {
      const fields = ["feeTypeId", "amount", ...months.map((_, i) => `months.${i}.amount`)] as FieldPath<FeeStructureFormInput>[];
      setFormError(applyServerErrors(error, form.setError, fields, describeError));
    }
  });

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
                    form.setValue("months", months.map((month) => ({ month, on: false, amount: "" })));
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
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-32">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">৳</span>
                <Input inputMode="decimal" className="h-8 pl-7" value={fill} onChange={(e) => setFill(e.target.value)} aria-label={t("fillAmount")} placeholder={t("fillAmount")} />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={fillTicked} disabled={!fill.trim() || ticked === 0}>
                {t("fillTicked")}
              </Button>
              <span className="ml-auto flex gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => tickAll(true)}>
                  <CheckCheck /> {t("tickAll")}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => tickAll(false)}>
                  {t("tickNone")}
                </Button>
              </span>
            </div>
            <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
              {months.map((month, i) => (
                <div key={month} className={cn("flex items-center gap-2 rounded-md border px-2 py-1.5", !rows[i]?.on && "bg-muted/30")}>
                  <FormField
                    control={form.control}
                    name={`months.${i}.on`}
                    render={({ field }) => (
                      <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="size-4 cursor-pointer accent-primary"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                        <span className={cn(!field.value && "text-muted-foreground")}>{monthName(month)}</span>
                      </label>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`months.${i}.amount`}
                    render={({ field, fieldState }) => (
                      <FormItem className="w-28">
                        <FormControl>
                          <div className="relative">
                            <span className="absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-muted-foreground">৳</span>
                            <Input
                              inputMode="decimal"
                              className={cn("h-8 pl-6 text-right tabular-nums", fieldState.error && "border-destructive")}
                              disabled={!rows[i]?.on}
                              aria-label={t("amountOf", { month: monthName(month) })}
                              {...field}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>
            {form.formState.errors.months?.some?.((m) => m?.amount) && <p className="text-sm text-destructive">{t("badMonthAmount")}</p>}
            {rootError && <p className="text-sm text-destructive">{tValidation(rootError.replace("validation.", "") as "monthsRequired")}</p>}
            <p className="text-xs text-muted-foreground">{t("monthsHint")}</p>
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
