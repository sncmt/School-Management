"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toAsciiDigits } from "@/lib/i18n/digits";
import type { PaymentBody, SubscriptionPlan } from "@/lib/platform/subscriptions";
import { cn } from "@/lib/utils";

/* What the fields hold while being filled in (text boxes keep text). */
export type PaymentDraft = { year: string; month: string; amount: string; paidOn: string; note: string };

const bdToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date()); // YYYY-MM-DD

/** A new payment: this month and year (Bangladesh), paid today; the amount from the school's fee, if any. */
export const newPaymentDraft = (amount?: string | null): PaymentDraft => {
  const today = bdToday();
  return { year: today.slice(0, 4), month: String(Number(today.slice(5, 7))), amount: amount ? String(Number(amount)) : "", paidOn: today, note: "" };
};

/** The draft as the server wants it; null while the year (or a monthly payment's month) isn't valid. */
export const paymentBody = (plan: SubscriptionPlan, d: PaymentDraft): Omit<PaymentBody, "plan"> | null => {
  const year = Number(toAsciiDigits(d.year.trim()));
  const amountText = toAsciiDigits(d.amount.trim());
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
  if (amountText && !/^\d+(\.\d{1,2})?$/.test(amountText)) return null;
  return {
    year,
    ...(plan === "MONTHLY" ? { month: Number(d.month) } : {}),
    ...(amountText ? { amount: Number(amountText) } : {}),
    ...(d.paidOn ? { paidOn: d.paidOn } : {}),
    ...(d.note.trim() ? { note: d.note.trim() } : {}),
  };
};

/** Monthly or yearly, as two big buttons. */
export function PlanPicker({ value, onChange, disabled }: { value: SubscriptionPlan | null; onChange: (plan: SubscriptionPlan) => void; disabled?: boolean }) {
  const t = useTranslations("platform.subscriptions");
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t("plan")}>
      {(["MONTHLY", "YEARLY"] as const).map((plan) => (
        <button
          key={plan}
          type="button"
          role="radio"
          aria-checked={value === plan}
          disabled={disabled}
          onClick={() => onChange(plan)}
          className={cn(
            "rounded-lg border p-3 text-left transition-colors disabled:opacity-50",
            value === plan ? "border-brand bg-brand-soft/60 ring-1 ring-brand" : "hover:bg-muted/50",
          )}
        >
          <div className="font-medium">{t(`plans.${plan}`)}</div>
          <div className="text-xs text-muted-foreground">{t(`planHints.${plan}`)}</div>
        </button>
      ))}
    </div>
  );
}

/** The period paid (year and month, or year), the amount, the day and a note. */
export function PaymentFields({ plan, draft, onChange }: { plan: SubscriptionPlan; draft: PaymentDraft; onChange: (draft: PaymentDraft) => void }) {
  const t = useTranslations("platform.subscriptions.payment");
  const format = useFormatter();
  const set = (patch: Partial<PaymentDraft>) => onChange({ ...draft, ...patch });
  const monthName = (m: number) => format.dateTime(new Date(Date.UTC(2026, m - 1, 1)), { month: "long", timeZone: "UTC" });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="sub-year" required>
          {t("year")}
        </Label>
        <Input id="sub-year" inputMode="numeric" value={draft.year} onChange={(e) => set({ year: e.target.value })} maxLength={4} />
      </div>
      {plan === "MONTHLY" ? (
        <div className="space-y-1.5">
          <Label htmlFor="sub-month" required>
            {t("month")}
          </Label>
          <Select value={draft.month} onValueChange={(month) => set({ month })}>
            <SelectTrigger id="sub-month" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {monthName(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <p className="flex items-end pb-2 text-xs text-muted-foreground">{t("wholeYear")}</p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="sub-amount">{t("amount")}</Label>
        <div className="relative">
          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">৳</span>
          <Input id="sub-amount" inputMode="decimal" className="pl-7" value={draft.amount} onChange={(e) => set({ amount: e.target.value })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="sub-paid-on">{t("paidOn")}</Label>
        <Input id="sub-paid-on" type="date" value={draft.paidOn} onChange={(e) => set({ paidOn: e.target.value })} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="sub-note">{t("note")}</Label>
        <Textarea id="sub-note" rows={2} maxLength={300} value={draft.note} onChange={(e) => set({ note: e.target.value })} placeholder={t("notePlaceholder")} />
      </div>
    </div>
  );
}
