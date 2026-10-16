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
  // a monthly fee: the same every month, or different amounts for parts of the year
  byMonth: boolean;
  amount: string;
  periods: { fromMonth: number; toMonth: number; amount: string }[];
};
export type FeeStructureFormValues = {
  feeTypeId: string;
  byMonth: boolean;
  amount?: number;
  periods: { fromMonth: number; toMonth: number; amount: number }[];
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
    periods: z.array(z.object({ fromMonth: z.number(), toMonth: z.number(), amount: z.string() })),
  })
  .superRefine((v, ctx) => {
    const check = (text: string, path: (string | number)[]) => {
      const r = moneyField.safeParse(text);
      if (!r.success) ctx.addIssue({ code: "custom", path, message: r.error.issues[0].message });
    };
    if (!v.byMonth) return check(v.amount, ["amount"]);

    if (v.periods.length === 0) ctx.addIssue({ code: "custom", path: ["periods", "root"], message: "validation.periodsRequired" });
    const seen = new Set<number>();
    v.periods.forEach((p, i) => {
      check(p.amount, ["periods", i, "amount"]);
      for (const m of monthsOf(p.fromMonth, p.toMonth)) {
        if (seen.has(m)) {
          ctx.addIssue({ code: "custom", path: ["periods", i, "toMonth"], message: "validation.monthsOverlap" });
          break;
        }
        seen.add(m);
      }
    });
  })
  .transform((v) => ({
    feeTypeId: v.feeTypeId,
    byMonth: v.byMonth,
    amount: v.byMonth ? undefined : Number(toAsciiDigits(v.amount.trim())),
    periods: v.byMonth ? v.periods.map((p) => ({ ...p, amount: Number(toAsciiDigits(p.amount.trim())) })) : [],
  })) as unknown as z.ZodType<FeeStructureFormValues, FeeStructureFormInput>;
