"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MoreHorizontal, Pencil, Plus, Power, PowerOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useCreateFeeType, useFeeTypes, useFunds, useUpdateFeeType, type FeeType } from "@/lib/school/finance";
import { cn } from "@/lib/utils";
import { feeTypeFormSchema, type FeeTypeFormInput, type FeeTypeFormValues } from "@/zod/finance";
import { NameFields, useSchoolLanguage } from "../NameFields";
import { ListState, NameCell } from "./shared";

/** The kinds of fees the school charges (tuition, admission, exam fee…) and the fund each goes into. */
export function FeeTypesTab({ canCreate, canUpdate }: { canCreate: boolean; canUpdate: boolean }) {
  const t = useTranslations("school.finance.feeTypes");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const { data, isPending, error, refetch, isFetching } = useFeeTypes();
  const funds = useFunds();
  const update = useUpdateFeeType();
  const [editing, setEditing] = useState<FeeType | null | undefined>();
  const noFund = funds.data && !funds.data.some((f) => f.isActive);

  const setActive = (feeType: FeeType, isActive: boolean) =>
    update.mutate(
      { feeTypeId: feeType.id, body: { isActive } },
      {
        onSuccess: () => toast.success(t(isActive ? "activated" : "deactivated", { name: name(feeType) })),
        onError: (e) => toast.error(describeError(e)),
      },
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
        {canCreate && (
          <Button onClick={() => setEditing(null)} disabled={noFund}>
            <Plus /> {t("add")}
          </Button>
        )}
      </div>
      {canCreate && noFund && <p className="text-sm text-amber-700 dark:text-amber-400">{t("fundFirst")}</p>}

      <ListState isPending={isPending} error={error} onRetry={() => refetch()} empty={data?.length === 0 ? t("empty") : null}>
        <div className={cn("rounded-md border", isFetching && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{t("columns.frequency")}</TableHead>
                <TableHead>{t("columns.fund")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((feeType) => (
                <TableRow key={feeType.id} className={cn(!feeType.isActive && "text-muted-foreground")}>
                  <TableCell>
                    <NameCell record={feeType} />
                    {feeType.description && <div className="text-xs text-muted-foreground">{feeType.description}</div>}
                  </TableCell>
                  <TableCell>
                    {t(`frequencies.${feeType.frequency}`)}
                    {feeType.appliesTo !== "ALL" && <div className="text-xs text-muted-foreground">{t(`appliesTo.${feeType.appliesTo}`)}</div>}
                  </TableCell>
                  <TableCell>{name(feeType.fund)}</TableCell>
                  <TableCell>
                    <Badge variant={feeType.isActive ? "secondary" : "outline"}>{t(feeType.isActive ? "active" : "inactive")}</Badge>
                  </TableCell>
                  <TableCell>
                    {canUpdate && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8" aria-label={t("actions")}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setEditing(feeType)}>
                            <Pencil /> {t("edit")}
                          </DropdownMenuItem>
                          {feeType.isActive ? (
                            <DropdownMenuItem variant="destructive" onSelect={() => setActive(feeType, false)}>
                              <PowerOff /> {t("deactivate")}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onSelect={() => setActive(feeType, true)}>
                              <Power /> {t("activate")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ListState>

      <FeeTypeFormDialog feeType={editing} onClose={() => setEditing(undefined)} />
    </div>
  );
}

function FeeTypeFormDialog({ feeType, onClose }: { feeType: FeeType | null | undefined; onClose: () => void }) {
  const t = useTranslations("school.finance.feeTypes.form");
  return (
    <Dialog open={feeType !== undefined} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{feeType ? t("editTitle") : t("addTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {feeType !== undefined && <FeeTypeForm key={feeType?.id ?? "new"} feeType={feeType} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function FeeTypeForm({ feeType, onDone }: { feeType: FeeType | null; onDone: () => void }) {
  const t = useTranslations("school.finance.feeTypes.form");
  const tTypes = useTranslations("school.finance.feeTypes");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const language = useSchoolLanguage();
  const name = useLocalizedName();
  const funds = useFunds();
  const create = useCreateFeeType();
  const update = useUpdateFeeType();
  const [formError, setFormError] = useState<string | null>(null);
  const saving = create.isPending || update.isPending;
  // active funds, and the current one even if it was deactivated since
  const fundOptions = (funds.data ?? []).filter((f) => f.isActive || f.id === feeType?.fundId);

  const form = useForm<FeeTypeFormInput, unknown, FeeTypeFormValues>({
    resolver: zodResolver(feeTypeFormSchema(language)),
    defaultValues: {
      nameEn: feeType?.nameEn ?? "",
      nameBn: feeType?.nameBn ?? "",
      description: feeType?.description ?? "",
      frequency: feeType?.frequency ?? "MONTHLY",
      fundId: feeType?.fundId ?? (fundOptions.length === 1 ? fundOptions[0].id : ""),
      appliesTo: feeType?.appliesTo ?? "ALL",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const body = {
      nameEn: values.nameEn,
      nameBn: values.nameBn,
      fundId: values.fundId,
      appliesTo: values.appliesTo,
      description: values.description || (feeType ? null : undefined),
    };
    try {
      if (feeType) {
        const result = await update.mutateAsync({ feeTypeId: feeType.id, body });
        toast.success(t("updated", { name: name(values) }));
        if (result.unpaidFeesMoved > 0) toast.info(t("feesMoved", { count: result.unpaidFeesMoved }));
        // who pays changed: the class fees were applied again
        if (result.sync.removed > 0) toast.info(t("appliesToRemoved", { count: result.sync.removed }));
        if (result.sync.blocked > 0) toast.warning(t("appliesToBlocked", { count: result.sync.blocked }), { duration: 10_000 });
      } else {
        await create.mutateAsync({ ...body, frequency: values.frequency });
        toast.success(t("created", { name: name(values) }));
      }
      onDone();
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, ["nameEn", "nameBn", "fundId", "appliesTo", "description"], describeError));
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />
        <NameFields control={form.control} labels={{ nameEn: t("nameEn"), nameBn: t("nameBn") }} autoFocus />

        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t("frequency")}</FormLabel>
              <div className="grid gap-2 sm:grid-cols-2">
                {(["MONTHLY", "ONE_TIME"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    disabled={!!feeType}
                    onClick={() => field.onChange(f)}
                    className={cn(
                      "rounded-md border p-3 text-left text-sm transition-colors disabled:cursor-not-allowed",
                      field.value === f ? "border-primary bg-primary/5 ring-1 ring-primary" : "cursor-pointer hover:bg-muted",
                      feeType && field.value !== f && "opacity-50",
                    )}
                  >
                    <div className="font-medium">{tTypes(`frequencies.${f}`)}</div>
                    <div className="text-xs text-muted-foreground">{t(`frequencyHints.${f}`)}</div>
                  </button>
                ))}
              </div>
              {feeType && <FormDescription>{t("frequencyFixed")}</FormDescription>}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="appliesTo"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t("appliesTo")}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(["ALL", "NEW_STUDENTS", "OLD_STUDENTS"] as const).map((a) => (
                    <SelectItem key={a} value={a}>
                      {tTypes(`appliesTo.${a}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>{t(feeType ? "appliesToChangeHint" : "appliesToHint")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fundId"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t("fund")}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("chooseFund")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {fundOptions.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {name(f)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>{t(feeType ? "fundChangeHint" : "fundHint")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("note")}</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone} disabled={saving}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
