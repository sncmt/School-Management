"use client";

import { Ban, MoreHorizontal, Plus } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCan } from "@/lib/auth/hooks";
import { bangladeshDay } from "@/lib/dates";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { bdDayEnd, bdDayStart } from "@/lib/school/collection";
import { useFunds, useMoney } from "@/lib/school/finance";
import { entryDate, useAddExpense, useExpenseCategories, useExpenses, useVoidExpense, type Expense } from "@/lib/school/ledger";
import { cn } from "@/lib/utils";
import { Pager } from "../collect/PaymentsTab";
import { Field, parseMoney, TakaInput } from "../formBits";
import { ListState } from "../shared";
import { DayRange, thisMonth } from "./DayRange";
import { Tile } from "./LedgerTab";
import { DayInput } from "./MoneyDialogs";

const ALL = "all";

/** Money spent from the funds, by category; a mistake is voided (the money returns to its fund). */
export function ExpensesTab() {
  const t = useTranslations("school.finance.expenses");
  const format = useFormatter();
  const name = useLocalizedName();
  const money = useMoney();
  const can = useCan();
  const funds = useFunds();
  const categories = useExpenseCategories();
  const [range, setRange] = useState(thisMonth);
  const [fundId, setFundId] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [showVoided, setShowVoided] = useState(false);
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [voiding, setVoiding] = useState<Expense | null>(null);
  const expenses = useExpenses({
    page,
    limit: 30,
    from: bdDayStart(range.from),
    to: bdDayEnd(range.to),
    ...(fundId !== ALL ? { fundId } : {}),
    ...(category !== ALL ? { category } : {}),
    ...(showVoided ? { includeVoided: "true" as const } : {}),
  });
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };
  const s = expenses.data?.summary;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <DayRange value={range} onChange={reset(setRange)} idPrefix="expenses" />
        <Select value={fundId} onValueChange={reset(setFundId)}>
          <SelectTrigger className="w-44" aria-label={t("fund")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allFunds")}</SelectItem>
            {funds.data?.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {name(f)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={reset(setCategory)}>
          <SelectTrigger className="w-44" aria-label={t("category")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allCategories")}</SelectItem>
            {categories.data?.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex h-9 items-center gap-2 text-sm">
          <Switch checked={showVoided} onCheckedChange={reset(setShowVoided)} />
          {t("showVoided")}
        </label>
        {can("expense:create") && (
          <Button className="ml-auto" onClick={() => setAdding(true)}>
            <Plus /> {t("add")}
          </Button>
        )}
      </div>

      {s && (
        <div className="grid gap-2 sm:grid-cols-[14rem_1fr]">
          <Tile label={t("total")} value={money(s.totalExpense)} />
          {s.byCategory.length > 0 && (
            <div className="flex flex-wrap content-start gap-1.5 rounded-md border p-3 text-sm">
              {s.byCategory.map((c) => (
                <span key={c.category ?? ""} className="rounded bg-muted px-2 py-0.5">
                  {c.category ?? t("noCategory")} <span className="font-medium tabular-nums">{money(c.amount)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <ListState isPending={expenses.isPending} error={expenses.error} onRetry={() => expenses.refetch()} empty={expenses.data?.items.length === 0 ? t("empty") : null}>
        <div className={cn("rounded-md border", expenses.isFetching && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.date")}</TableHead>
                <TableHead>{t("columns.category")}</TableHead>
                <TableHead>{t("columns.fund")}</TableHead>
                <TableHead className="text-right">{t("columns.amount")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.data?.items.map((e) => {
                const voided = !!e.reversedBy;
                return (
                  <TableRow key={e.id} className={cn(voided && "text-muted-foreground")}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format.dateTime(new Date(e.transactionDate), { dateStyle: "medium", timeZone: "Asia/Dhaka" })}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {e.category}
                        {voided && (
                          <Badge variant="outline" className="ml-2 border-rose-300 text-rose-700 dark:text-rose-400">
                            {t("voided")}
                          </Badge>
                        )}
                      </div>
                      {e.description && <div className="text-xs text-muted-foreground">{e.description}</div>}
                      {voided && e.reversedBy?.description && <div className="text-xs text-rose-700 dark:text-rose-400">{e.reversedBy.description}</div>}
                    </TableCell>
                    <TableCell className="text-sm">{name(e.fund)}</TableCell>
                    <TableCell className={cn("text-right font-medium tabular-nums", voided && "line-through")}>{money(e.amount)}</TableCell>
                    <TableCell>
                      {!voided && can("expense:void") && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8" aria-label={t("actions")}>
                              <MoreHorizontal />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem variant="destructive" onSelect={() => setVoiding(e)}>
                              <Ban /> {t("void")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </ListState>
      {expenses.data && expenses.data.meta.totalPages > 1 && <Pager page={page} totalPages={expenses.data.meta.totalPages} onPage={setPage} />}

      <AddExpenseDialog open={adding} onClose={() => setAdding(false)} />
      <VoidExpenseDialog expense={voiding} onClose={() => setVoiding(null)} />
    </div>
  );
}

function AddExpenseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("school.finance.expenses.form");
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open && <AddExpenseForm onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function AddExpenseForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("school.finance.expenses.form");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const money = useMoney();
  const funds = useFunds();
  const categories = useExpenseCategories();
  const add = useAddExpense();
  const active = (funds.data ?? []).filter((f) => f.isActive);
  const [fundId, setFundId] = useState(active.length === 1 ? active[0].id : "");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [day, setDay] = useState(bangladeshDay(new Date().toISOString()));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fund = active.find((f) => f.id === fundId);

  const submit = () => {
    const n = parseMoney(amount);
    if (!fundId) return setError(t("chooseFund"));
    if (!(n > 0)) return setError(t("badAmount"));
    if (category.trim().length < 2) return setError(t("categoryRequired"));
    if (fund && n > Number(fund.balance)) return setError(t("tooMuch", { balance: money(fund.balance) }));
    setError(null);
    add.mutate(
      { fundId, amount: n, category: category.trim(), transactionDate: entryDate(day), ...(note.trim() ? { description: note.trim() } : {}) },
      {
        onSuccess: (r) => {
          toast.success(t("done", { amount: money(n), balance: money(r.balance) }));
          onDone();
        },
        onError: (e) => setError(describeError(e)),
      },
    );
  };

  return (
    <div className="space-y-4">
      <FormError message={error} />
      <Field label={t("fund")} required hint={fund ? t("balance", { balance: money(fund.balance) }) : undefined}>
        <Select value={fundId} onValueChange={setFundId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("chooseFund")} />
          </SelectTrigger>
          <SelectContent>
            {active.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {name(f)} · {money(f.balance)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label={t("amount")} htmlFor="expense-amount" required>
        <TakaInput id="expense-amount" value={amount} onChange={setAmount} />
      </Field>
      <Field label={t("category")} htmlFor="expense-category" required hint={t("categoryHint")}>
        <Input id="expense-category" list="expense-categories" value={category} maxLength={100} onChange={(e) => setCategory(e.target.value)} placeholder={t("categoryPlaceholder")} />
        <datalist id="expense-categories">
          {categories.data?.map((c) => <option key={c} value={c} />)}
        </datalist>
      </Field>
      <Field label={t("date")} htmlFor="expense-day">
        <DayInput id="expense-day" value={day} onChange={setDay} />
      </Field>
      <Field label={t("note")} htmlFor="expense-note">
        <Input id="expense-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder={t("notePlaceholder")} />
      </Field>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={add.isPending}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={submit} disabled={add.isPending}>
          {add.isPending ? t("saving") : t("save")}
        </Button>
      </DialogFooter>
    </div>
  );
}

function VoidExpenseDialog({ expense, onClose }: { expense: Expense | null; onClose: () => void }) {
  const t = useTranslations("school.finance.expenses.voidDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const money = useMoney();
  const voidExpense = useVoidExpense();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setReason("");
    setError(null);
    onClose();
  };
  const submit = () => {
    if (reason.trim().length < 3) return setError(t("reasonRequired"));
    voidExpense.mutate(
      { expenseId: expense!.id, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(t("done"));
          close();
        },
        onError: (e) => setError(describeError(e)),
      },
    );
  };

  return (
    <Dialog open={!!expense} onOpenChange={(open) => !open && !voidExpense.isPending && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title", { category: expense?.category ?? "", amount: money(expense?.amount) })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <FormError message={error} />
        <div className="space-y-1.5">
          <Label htmlFor="void-reason" required>
            {t("reason")}
          </Label>
          <Input id="void-reason" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder={t("reasonPlaceholder")} autoFocus />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={voidExpense.isPending}>
            {tCommon("cancel")}
          </Button>
          <Button variant="destructive" onClick={submit} disabled={voidExpense.isPending}>
            <Ban /> {voidExpense.isPending ? t("working") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
