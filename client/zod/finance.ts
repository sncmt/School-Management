import { z } from "zod";
import { toAsciiDigits } from "@/lib/i18n/digits";
import type { FeeAppliesTo, FeeFrequency } from "@/lib/school/finance";
import { schoolNameFields, type SchoolLanguage } from "./names";

// Mirrors server/src/app/modules/{fund,feeType,feeStructure}/*.validation.ts.
// Amounts are typed as text (either digit set) and checked here.

/** Taka: more than 0, at most 2 decimals. */
export const moneyField = z
  .string()
  .trim()
  .transform(toAsciiDigits)
  .pipe(
    z
      .string()
      .min(1, "validation.numberRequired")
      .regex(/^\d+(\.\d{1,2})?$/, "validation.decimal2")
      .transform(Number)
      .pipe(z.number().gt(0, "validation.amountRange").max(9_999_999, "validation.amountRange")),
  );

const description = z.string().trim().max(500, "validation.max500");

// ----------------------------------------------------------------- funds

export type FundFormInput = { nameEn: string; nameBn: string; description: string };
export type FundFormValues = { nameEn: string | null; nameBn: string | null; description: string };

export const fundFormSchema = (language: SchoolLanguage) =>
  z.object({ ...schoolNameFields(language, 100), description }) as unknown as z.ZodType<FundFormValues, FundFormInput>;

// ------------------------------------------------------------- fee types

export type FeeTypeFormInput = {
  nameEn: string;
  nameBn: string;
  description: string;
  frequency: FeeFrequency;
  fundId: string;
  appliesTo: FeeAppliesTo;
};
export type FeeTypeFormValues = Omit<FeeTypeFormInput, "nameEn" | "nameBn"> & { nameEn: string | null; nameBn: string | null };

export const feeTypeFormSchema = (language: SchoolLanguage) =>
  z.object({
    ...schoolNameFields(language, 100),
    description,
    frequency: z.enum(["ONE_TIME", "MONTHLY"]),
    fundId: z.string().min(1, "validation.chooseFund"),
    appliesTo: z.enum(["ALL", "NEW_STUDENTS", "OLD_STUDENTS"]),
  }) as unknown as z.ZodType<FeeTypeFormValues, FeeTypeFormInput>;

// -------------------------------------------------------- fee structures

export type FeeStructureFormInput = {
  feeTypeId: string;
  // a monthly fee: the same every month, or month by month (only the ticked months, each its amount)
  byMonth: boolean;
  amount: string;
  // every month of the year, in its order
  months: { month: number; on: boolean; amount: string }[];
};
export type FeeStructureFormValues = {
  feeTypeId: string;
  byMonth: boolean;
  amount?: number;
  // the ticked months only
  months: { month: number; amount: number }[];
};

/** 11 -> 2 gives [11, 12, 1, 2] (a period may cross the new year). */
export const monthsOf = (fromMonth: number, toMonth: number) => {
  const months: number[] = [];
  for (let m = fromMonth, i = 0; i < 12; i++) {
    months.push(m);
    if (m === toMonth) break;
    m = m === 12 ? 1 : m + 1;
  }
  return months;
};

export const feeStructureFormSchema = z
  .object({
    feeTypeId: z.string().min(1, "validation.chooseFeeType"),
    byMonth: z.boolean(),
    amount: z.string(),
    months: z.array(z.object({ month: z.number(), on: z.boolean(), amount: z.string() })),
  })
  .superRefine((v, ctx) => {
    const check = (text: string, path: (string | number)[]) => {
      const r = moneyField.safeParse(text);
      if (!r.success) ctx.addIssue({ code: "custom", path, message: r.error.issues[0].message });
    };
    if (!v.byMonth) return check(v.amount, ["amount"]);

    if (!v.months.some((m) => m.on)) ctx.addIssue({ code: "custom", path: ["months", "root"], message: "validation.monthsRequired" });
    v.months.forEach((m, i) => m.on && check(m.amount, ["months", i, "amount"]));
  })
  .transform((v) => ({
    feeTypeId: v.feeTypeId,
    byMonth: v.byMonth,
    amount: v.byMonth ? undefined : Number(toAsciiDigits(v.amount.trim())),
    months: v.byMonth ? v.months.filter((m) => m.on).map((m) => ({ month: m.month, amount: Number(toAsciiDigits(m.amount.trim())) })) : [],
  })) as unknown as z.ZodType<FeeStructureFormValues, FeeStructureFormInput>;
