"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useAcademicYears } from "@/lib/school/academicYears";
import { useAddCustomFee, useDiscount, useDiscountByFeeType, type StudentFee } from "@/lib/school/collection";
import { academicMonths, useFeeTypes, useMoney, useMonthName } from "@/lib/school/finance";
import { Field, parseMoney, TakaInput } from "../formBits";
import { useFeeLabel } from "../shared";

// ------------------------------------------------------------- one fee's discount

/** A discount on one fee (one month, or a one-time fee). 0 removes it. */
export function DiscountDialog({ fee, onClose }: { fee: StudentFee | null; onClose: () => void }) {
  const t = useTranslations("school.finance.collect.discount");
  const feeLabel = useFeeLabel();
  return (
    <Dialog open={!!fee} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{fee ? feeLabel(fee) : ""}</DialogDescription>
        </DialogHeader>
        {fee && <DiscountForm key={fee.id} fee={fee} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function DiscountForm({ fee, onDone }: { fee: StudentFee; onDone: () => void }) {
  const t = useTranslations("school.finance.collect.discount");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const money = useMoney();
  const discount = useDiscount();
  const [amount, setAmount] = useState(Number(fee.discountAmount) > 0 ? String(Number(fee.discountAmount)) : "");
  const [reason, setReason] = useState(fee.discountReason ?? "");
  const [error, setError] = useState<string | null>(null);
  // a discount can't take the fee below what is already paid
  const max = Number(fee.amount) - Number(fee.paidAmount);

  const submit = () => {
    const n = amount.trim() === "" ? 0 : parseMoney(amount);
    if (Number.isNaN(n) || n > max) return setError(t("tooMuch", { max: money(max) }));
    setError(null);
    discount.mutate(
      { studentFeeId: fee.id, discountAmount: n, ...(reason.trim() ? { discountReason: reason.trim() } : {}) },
      {
        onSuccess: () => {
          toast.success(n > 0 ? t("saved", { amount: money(n) }) : t("removed"));
          onDone();
        },
        onError: (e) => setError(describeError(e)),
      },
    );
  };

  return (
    <div className="space-y-4">
      <FormError message={error} />
      <p className="text-sm text-muted-foreground">{t("feeIs", { amount: money(fee.amount), paid: money(fee.paidAmount) })}</p>
      <Field label={t("amount")} htmlFor="discount-amount" hint={t("zeroRemoves")}>
        <TakaInput id="discount-amount" value={amount} onChange={setAmount} />
      </Field>
      <Field label={t("reason")} htmlFor="discount-reason">
        <Input id="discount-reason" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder={t("reasonPlaceholder")} />
      </Field>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={discount.isPending}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={submit} disabled={discount.isPending}>
          {discount.isPending ? t("saving") : t("save")}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ------------------------------------------------------- a fee type's discount

/** The same discount on every month of a fee type (or some of the months): a scholarship, a sibling discount. */
export function BulkDiscountDialog({
  open,
  studentId,
  academicYearId,
  fees,
  onClose,
}: {
  open: boolean;
  studentId: string;
  academicYearId: string;
  fees: StudentFee[];
  onClose: () => void;
}) {
  const t = useTranslations("school.finance.collect.bulkDiscount");
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open && <BulkDiscountForm studentId={studentId} academicYearId={academicYearId} fees={fees} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function BulkDiscountForm({ studentId, academicYearId, fees, onDone }: { studentId: string; academicYearId: string; fees: StudentFee[]; onDone: () => void }) {
  const t = useTranslations("school.finance.collect.bulkDiscount");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const money = useMoney();
  const monthName = useMonthName();
  const save = useDiscountByFeeType();
  // the fee types the student has this year, each with its months in order
  const types = [...new Map(fees.map((f) => [f.feeTypeId, f.feeType])).values()];
  const [feeTypeId, setFeeTypeId] = useState(types[0]?.id ?? "");
  const months = fees.filter((f) => f.feeTypeId === feeTypeId && f.month !== null).map((f) => f.month!);
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(Math.max(months.length - 1, 0));
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const monthly = months.length > 0;

  const pickType = (id: string) => {
    setFeeTypeId(id);
    const count = fees.filter((f) => f.feeTypeId === id && f.month !== null).length;
    setFrom(0);
    setTo(Math.max(count - 1, 0));
  };

  const submit = () => {
    const n = parseMoney(amount);
    if (Number.isNaN(n)) return setError(t("badAmount"));
    setError(null);
    const whole = !monthly || (from === 0 && to === months.length - 1);
    save.mutate(
      {
        studentId,
        academicYearId,
        feeTypeId,
        ...(whole ? { discountAmount: n } : { discounts: [{ fromMonth: months[from], toMonth: months[to], discountAmount: n }] }),
        ...(reason.trim() ? { discountReason: reason.trim() } : {}),
      },
      {
        onSuccess: (r) => {
          toast.success(t("saved", { count: r.updatedCount, amount: money(n) }));
          onDone();
        },
        onError: (e) => setError(describeError(e)),
      },
    );
  };

  const monthPicker = (value: number, onChange: (i: number) => void, label: string) => (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-full" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {months.map((m, i) => (
          <SelectItem key={m} value={String(i)}>
            {monthName(m)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-4">
      <FormError message={error} />
      <Field label={t("feeType")} required>
        <Select value={feeTypeId} onValueChange={pickType}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {types.map((ft) => (
              <SelectItem key={ft.id} value={ft.id}>
                {name(ft)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {monthly && (
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("from")}>{monthPicker(from, (i) => (setFrom(i), i > to && setTo(i)), t("from"))}</Field>
          <Field label={t("to")}>{monthPicker(to, (i) => (setTo(i), i < from && setFrom(i)), t("to"))}</Field>
        </div>
      )}
      <Field label={t(monthly ? "amountPerMonth" : "amount")} htmlFor="bulk-amount" required hint={t("zeroRemoves")}>
        <TakaInput id="bulk-amount" value={amount} onChange={setAmount} />
      </Field>
      <Field label={t("reason")} htmlFor="bulk-reason">
        <Input id="bulk-reason" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder={t("reasonPlaceholder")} />
      </Field>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={save.isPending}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={submit} disabled={save.isPending || !feeTypeId}>
          {save.isPending ? t("saving") : t("save")}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ---------------------------------------------------- a fee for this student only

/** A fee for this student only: a fine, a lost ID card, a fee the class doesn't have. */
export function CustomFeeDialog({ open, studentId, academicYearId, onClose }: { open: boolean; studentId: string; academicYearId: string; onClose: () => void }) {
  const t = useTranslations("school.finance.collect.customFee");
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open && <CustomFeeForm studentId={studentId} academicYearId={academicYearId} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function CustomFeeForm({ studentId, academicYearId, onDone }: { studentId: string; academicYearId: string; onDone: () => void }) {
  const t = useTranslations("school.finance.collect.customFee");
  const tTypes = useTranslations("school.finance.feeTypes");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const monthName = useMonthName();
  const feeTypes = useFeeTypes();
  const years = useAcademicYears();
  const add = useAddCustomFee();
  const year = years.data?.find((y) => y.id === academicYearId);
  const months = year ? academicMonths(year) : [];
  const [feeTypeId, setFeeTypeId] = useState("");
  const [month, setMonth] = useState(0);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const feeType = feeTypes.data?.find((f) => f.id === feeTypeId);
  const monthly = feeType?.frequency === "MONTHLY";

  const submit = () => {
    const n = parseMoney(amount);
    if (!(n > 0)) return setError(t("badAmount"));
    setError(null);
    const m = months[month];
    add.mutate(
      {
        studentId,
        academicYearId,
        feeTypeId,
        amount: n,
        ...(monthly && m ? { month: m.month, year: m.year } : {}),
        ...(note.trim() ? { description: note.trim() } : {}),
      },
      {
        onSuccess: () => {
          toast.success(t("added"));
          onDone();
        },
        onError: (e) => setError(describeError(e)),
      },
    );
  };

  return (
    <div className="space-y-4">
      <FormError message={error} />
      <Field label={t("feeType")} required>
        <Select value={feeTypeId} onValueChange={setFeeTypeId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("chooseFeeType")} />
          </SelectTrigger>
          <SelectContent>
            {feeTypes.data
              ?.filter((f) => f.isActive)
              .map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {name(f)} · {tTypes(`frequencies.${f.frequency}`)}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </Field>
      {monthly && (
        <Field label={t("month")} required>
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m, i) => (
                <SelectItem key={`${m.year}-${m.month}`} value={String(i)}>
                  {monthName(m.month)} {m.year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
      <Field label={t("amount")} htmlFor="custom-amount" required>
        <TakaInput id="custom-amount" value={amount} onChange={setAmount} />
      </Field>
      <Field label={t("note")} htmlFor="custom-note" hint={t("noteHint")}>
        <Input id="custom-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder={t("notePlaceholder")} />
      </Field>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={add.isPending}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={submit} disabled={add.isPending || !feeTypeId}>
          {add.isPending ? t("saving") : t("save")}
        </Button>
      </DialogFooter>
    </div>
  );
}
