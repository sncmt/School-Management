import { z } from "zod";
import { SubscriptionPlan } from "../../../../generated/prisma/enums";
import { idSchema } from "../../shared/financeSchemas";
import { dateOnlySchema } from "../../shared/scheduleSchemas";

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

/*
 * One paid period: a year and month (monthly) or a year (yearly). The plan is the school's own
 * unless given (activation, or a school that has none yet).
 */
export const paymentInput = z.object({
  plan: z.enum(SubscriptionPlan).optional(),
  year: z.coerce.number({ error: "Year is required" }).int().min(2000, "Enter a real year").max(2100, "Enter a real year"),
  // monthly only
  month: z.preprocess(blank, z.coerce.number().int().min(1).max(12).optional()),
  amount: z.preprocess(blank, z.coerce.number().nonnegative("The amount can't be negative").max(99_999_999).optional()),
  // left out: today
  paidOn: z.preprocess(blank, dateOnlySchema.optional()),
  note: z.preprocess(blank, z.string().trim().max(300).optional()),
});

const listQuery = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const schoolIdParams = z.object({ schoolId: idSchema("School id") });
const paymentIdParams = z.object({ paymentId: idSchema("Payment id") });
const setPlan = z.strictObject({ plan: z.enum(SubscriptionPlan, { error: "Choose monthly or yearly" }) });

export const SubscriptionValidation = { paymentInput, listQuery, schoolIdParams, paymentIdParams, setPlan };

export type PaymentInput = z.infer<typeof paymentInput>;
export type SubscriptionListQuery = z.infer<typeof listQuery>;
