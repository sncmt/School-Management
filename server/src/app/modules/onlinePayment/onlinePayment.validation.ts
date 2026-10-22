import { z } from "zod";
import { OnlinePaymentStatus } from "../../../../generated/prisma/enums";

const saveSettings = z.strictObject({
  enabled: z.boolean(),
  sandbox: z.boolean(),
  storeId: z
    .string()
    .trim()
    .max(80)
    .regex(/^[A-Za-z0-9_-]*$/, "Use the Store ID exactly as SSLCommerz gave it")
    .nullable(),
  // left out: the saved password stays; "" removes it
  storePassword: z.string().trim().max(200).optional(),
  chargePercent: z
    .number({ error: "Enter the charge" })
    .min(0, "The charge can't be below 0")
    .max(5, "At most 5%")
    .refine((n) => Math.round(n * 100) === n * 100, "At most 2 decimal places"),
});

const studentParams = z.object({ studentId: z.string().trim().min(1, "Student is required!") });
const tranParams = z.object({ tranId: z.string().trim().regex(/^[A-Z0-9]{8,40}$/, "Unknown payment") });

const startPayment = z.strictObject({
  studentId: z.string().trim().min(1, "Student is required!"),
  feeIds: z.array(z.string().trim().min(1)).min(1, "Choose the fees to pay").max(60, "At most 60 fees at a time"),
});

const idParams = z.object({ id: z.string().trim().min(1, "Online payment is required!") });

const listQuery = z
  .object({
    status: z.enum(OnlinePaymentStatus).optional(),
    // OWED: paid but to be given back; DONE: given back
    refund: z.enum(["OWED", "DONE"]).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    search: z.string().trim().max(80).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine((d) => !d.from || !d.to || d.from <= d.to, { message: "'from' must be earlier than 'to'", path: ["to"] });

const markRefund = z.strictObject({
  refunded: z.boolean(),
  note: z.string().trim().max(300).optional(),
});

export const OnlinePaymentValidation = { saveSettings, studentParams, tranParams, startPayment, idParams, listQuery, markRefund };

export type ListOnlineQuery = z.infer<typeof listQuery>;
export type MarkRefundPayload = z.infer<typeof markRefund>;

export type SaveOnlineSettingsPayload = z.infer<typeof saveSettings>;
