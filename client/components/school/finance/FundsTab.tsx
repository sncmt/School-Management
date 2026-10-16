"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftRight, MoreHorizontal, Pencil, PiggyBank, Plus, Power, PowerOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useCreateFund, useFunds, useMoney, useUpdateFund, type Fund } from "@/lib/school/finance";
import { cn } from "@/lib/utils";
import { fundFormSchema, type FundFormInput, type FundFormValues } from "@/zod/finance";
import { NameFields, useSchoolLanguage } from "../NameFields";
import { DepositDialog, TransferDialog } from "./money/MoneyDialogs";
import { ListState, NameCell } from "./shared";

/** The funds fee money goes into, with each one's balance (worked out from its ledger). */
export function FundsTab({
  canCreate,
  canUpdate,
  canDeposit,
  canTransfer,
}: {
  canCreate: boolean;
  canUpdate: boolean;
  canDeposit: boolean;
  canTransfer: boolean;
}) {
  const t = useTranslations("school.finance.funds");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const money = useMoney();
  const { data, isPending, error, refetch, isFetching } = useFunds();
  const update = useUpdateFund();
  const [editing, setEditing] = useState<Fund | null | undefined>();
  const [depositing, setDepositing] = useState<Fund | null>(null);
  const [transferring, setTransferring] = useState(false);
  const activeCount = (data ?? []).filter((f) => f.isActive).length;

  const setActive = (fund: Fund, isActive: boolean) =>
    update.mutate(
      { fundId: fund.id, body: { isActive } },
      {
        onSuccess: () => toast.success(t(isActive ? "activated" : "deactivated", { name: name(fund) })),
        onError: (e) => toast.error(describeError(e)),
      },
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
        <div className="flex gap-2">
          {canTransfer && activeCount >= 2 && (
            <Button variant="outline" onClick={() => setTransferring(true)}>
              <ArrowLeftRight /> {t("transfer")}
            </Button>
          )}
          {canCreate && (
            <Button onClick={() => setEditing(null)}>
              <Plus /> {t("add")}
            </Button>
          )}
        </div>
      </div>

      <ListState isPending={isPending} error={error} onRetry={() => refetch()} empty={data?.length === 0 ? t("empty") : null}>
        <div className={cn("rounded-md border", isFetching && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead className="text-right">{t("columns.balance")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((fund) => (
                <TableRow key={fund.id} className={cn(!fund.isActive && "text-muted-foreground")}>
                  <TableCell>
                    <NameCell record={fund} />
                    {fund.description && <div className="text-xs text-muted-foreground">{fund.description}</div>}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{money(fund.balance)}</TableCell>
                  <TableCell>
                    <Badge variant={fund.isActive ? "secondary" : "outline"}>{t(fund.isActive ? "active" : "inactive")}</Badge>
                  </TableCell>
                  <TableCell>
                    {(canUpdate || (canDeposit && fund.isActive)) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8" aria-label={t("actions")}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canDeposit && fund.isActive && (
                            <DropdownMenuItem onSelect={() => setDepositing(fund)}>
                              <PiggyBank /> {t("deposit")}
                            </DropdownMenuItem>
                          )}
                          {canUpdate && (
                            <DropdownMenuItem onSelect={() => setEditing(fund)}>
                              <Pencil /> {t("edit")}
                            </DropdownMenuItem>
                          )}
                          {!canUpdate ? null : fund.isActive ? (
                            <DropdownMenuItem variant="destructive" onSelect={() => setActive(fund, false)}>
                              <PowerOff /> {t("deactivate")}
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onSelect={() => setActive(fund, true)}>
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

      <FundFormDialog fund={editing} onClose={() => setEditing(undefined)} />
      <DepositDialog fund={depositing} onClose={() => setDepositing(null)} />
      <TransferDialog open={transferring} onClose={() => setTransferring(false)} />
    </div>
  );
}

function FundFormDialog({ fund, onClose }: { fund: Fund | null | undefined; onClose: () => void }) {
  const t = useTranslations("school.finance.funds.form");
  return (
    <Dialog open={fund !== undefined} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{fund ? t("editTitle") : t("addTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {fund !== undefined && <FundForm key={fund?.id ?? "new"} fund={fund} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function FundForm({ fund, onDone }: { fund: Fund | null; onDone: () => void }) {
  const t = useTranslations("school.finance.funds.form");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const language = useSchoolLanguage();
  const name = useLocalizedName();
  const create = useCreateFund();
  const update = useUpdateFund();
  const [formError, setFormError] = useState<string | null>(null);
  const saving = create.isPending || update.isPending;

  const form = useForm<FundFormInput, unknown, FundFormValues>({
    resolver: zodResolver(fundFormSchema(language)),
    defaultValues: { nameEn: fund?.nameEn ?? "", nameBn: fund?.nameBn ?? "", description: fund?.description ?? "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const body = { nameEn: values.nameEn, nameBn: values.nameBn, description: values.description || (fund ? null : undefined) };
    try {
      if (fund) await update.mutateAsync({ fundId: fund.id, body });
      else await create.mutateAsync(body);
      toast.success(t(fund ? "updated" : "created", { name: name(values) }));
      onDone();
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, ["nameEn", "nameBn", "description"], describeError));
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />
        <NameFields control={form.control} labels={{ nameEn: t("nameEn"), nameBn: t("nameBn") }} autoFocus />
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
