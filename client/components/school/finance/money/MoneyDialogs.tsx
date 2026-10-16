"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bangladeshDay } from "@/lib/dates";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useFunds, useMoney, type Fund } from "@/lib/school/finance";
import { entryDate, useDeposit, useTransfer } from "@/lib/school/ledger";
import { Field, parseMoney, TakaInput } from "../formBits";

const today = () => bangladeshDay(new Date().toISOString());

/** The date of a money entry: today or an earlier day (never the future). */
export function DayInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const max = today();
  return <Input id={id} type="date" value={value} max={max} onChange={(e) => onChange(e.target.value || max)} className="w-40" />;
}

// ------------------------------------------------------------------- deposit

/** Money put into a fund by hand: a donation, a grant, last year's balance. */
export function DepositDialog({ fund, onClose }: { fund: Fund | null; onClose: () => void }) {
  const t = useTranslations("school.finance.money.deposit");
  const name = useLocalizedName();
  return (
    <Dialog open={!!fund} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title", { fund: fund ? name(fund) : "" })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {fund && <DepositForm key={fund.id} fund={fund} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function DepositForm({ fund, onDone }: { fund: Fund; onDone: () => void }) {
  const t = useTranslations("school.finance.money.deposit");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const money = useMoney();
  const deposit = useDeposit();
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState(today());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const n = parseMoney(amount);
    if (!(n > 0)) return setError(t("badAmount"));
    setError(null);
    deposit.mutate(
      { fundId: fund.id, amount: n, transactionDate: entryDate(day), ...(note.trim() ? { description: note.trim() } : {}) },
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
      <p className="text-sm text-muted-foreground">{t("balance", { balance: money(fund.balance) })}</p>
      <Field label={t("amount")} htmlFor="deposit-amount" required>
        <TakaInput id="deposit-amount" value={amount} onChange={setAmount} />
      </Field>
      <Field label={t("date")} htmlFor="deposit-day">
        <DayInput id="deposit-day" value={day} onChange={setDay} />
      </Field>
      <Field label={t("note")} htmlFor="deposit-note">
        <Input id="deposit-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder={t("notePlaceholder")} />
      </Field>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={deposit.isPending}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={submit} disabled={deposit.isPending}>
          {deposit.isPending ? t("saving") : t("save")}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ------------------------------------------------------------------ transfer

/** Money moved from one fund to another. */
export function TransferDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("school.finance.money.transfer");
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open && <TransferForm onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function TransferForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("school.finance.money.transfer");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const money = useMoney();
  const funds = useFunds();
  const transfer = useTransfer();
  const active = (funds.data ?? []).filter((f) => f.isActive);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState(today());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const from = active.find((f) => f.id === fromId);

  const submit = () => {
    const n = parseMoney(amount);
    if (!fromId || !toId) return setError(t("chooseBoth"));
    if (fromId === toId) return setError(t("sameFund"));
    if (!(n > 0)) return setError(t("badAmount"));
    if (from && n > Number(from.balance)) return setError(t("tooMuch", { balance: money(from.balance) }));
    setError(null);
    transfer.mutate(
      { fromFundId: fromId, toFundId: toId, amount: n, transactionDate: entryDate(day), ...(note.trim() ? { description: note.trim() } : {}) },
      {
        onSuccess: () => {
          toast.success(t("done", { amount: money(n) }));
          onDone();
        },
        onError: (e) => setError(describeError(e)),
      },
    );
  };

  const fundSelect = (value: string, onChange: (v: string) => void, placeholder: string) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {active.map((f) => (
          <SelectItem key={f.id} value={f.id}>
            {name(f)} · {money(f.balance)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-4">
      <FormError message={error} />
      <Field label={t("from")} required>
        {fundSelect(fromId, setFromId, t("chooseFund"))}
      </Field>
      <Field label={t("to")} required>
        {fundSelect(toId, setToId, t("chooseFund"))}
      </Field>
      <Field label={t("amount")} htmlFor="transfer-amount" required>
        <TakaInput id="transfer-amount" value={amount} onChange={setAmount} />
      </Field>
      <Field label={t("date")} htmlFor="transfer-day">
        <DayInput id="transfer-day" value={day} onChange={setDay} />
      </Field>
      <Field label={t("note")} htmlFor="transfer-note">
        <Input id="transfer-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={transfer.isPending}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={submit} disabled={transfer.isPending}>
          {transfer.isPending ? t("saving") : t("save")}
        </Button>
      </DialogFooter>
    </div>
  );
}
