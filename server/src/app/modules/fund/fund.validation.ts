import { z } from "zod";
import {
  FundTransactionSource,
  FundTransactionType,
} from "../../../../generated/prisma/enums";
import { schoolLanguageNames } from "../../shared/names";

const amount = z
  .number({ error: "Amount is required!" })
  .positive("Amount must be greater than zero")
  .max(9_999_999_999, "Amount is too large")
  .refine(
    (n) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6,
    "Amount can have at most 2 decimal places",
  );

const transactionDate = z.coerce
  .date({ error: "Valid date is required" })
  .refine((d) => d.getTime() <= Date.now() + 60_000, "Date cannot be in the future")
  .optional();

const description = z.string().trim().max(500).optional();

// the name in the school's language is required (the service checks it); the other is optional
const createFund = z.object({
  ...schoolLanguageNames(100),
  description,
});

const updateFund = z
  .object({
    ...schoolLanguageNames(100),
    description: z.string().trim().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update",
  });

const fundIdParams = z.object({
  fundId: z.string().trim().min(1, "Fund id is required!"),
});

const listFundsQuery = z.object({
  includeInactive: z.enum(["true", "false"]).optional(),
});

const deposit = z.object({ amount, description, transactionDate });

const transfer = z
  .object({
    fromFundId: z.string({ error: "Source fund is required!" }).trim().min(1),
    toFundId: z.string({ error: "Destination fund is required!" }).trim().min(1),
    amount,
    description,
    transactionDate,
  })
  .refine((d) => d.fromFundId !== d.toFundId, {
    message: "Source and destination fund must be different",
    path: ["toFundId"],
  });

const ledgerQuery = z
  .object({
    fundId: z.string().trim().min(1).optional(),
    type: z.enum(FundTransactionType).optional(),
    source: z.enum(FundTransactionSource).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((d) => !d.from || !d.to || d.from <= d.to, {
    message: "'from' must be earlier than 'to'",
    path: ["to"],
  });

export const FundValidation = {
  createFund,
  updateFund,
  fundIdParams,
  listFundsQuery,
  deposit,
  transfer,
  ledgerQuery,
};