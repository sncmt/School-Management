import { z } from "zod";
import { FeeAppliesTo } from "../../../../generated/prisma/enums";
import { idSchema } from "../../shared/financeSchemas";
import { schoolLanguageNames } from "../../shared/names";


// the name in the school's language is required (the service checks it); the other is optional
const createFeeType = z.object({
  ...schoolLanguageNames(100),
  description: z.string().trim().max(500).optional(),
  frequency: z.enum(["ONE_TIME", "MONTHLY"], {
    error: "Frequency must be ONE_TIME or MONTHLY",
  }),
  fundId: idSchema("Fund"),
  // who is charged: every student, or only new / only old students of the year
  appliesTo: z.enum(FeeAppliesTo).default("ALL"),
});

// strictObject: sending `frequency` here is rejected. It is locked after creation
// because fee structures and student fees are built on it.
const updateFeeType = z
  .strictObject({
    ...schoolLanguageNames(100),
    description: z.string().trim().max(500).nullable().optional(),
    fundId: z.string().trim().min(1).optional(),
    // a change re-applies the class fees of this type to every student
    appliesTo: z.enum(FeeAppliesTo).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Provide at least one field to update",
  });

const feeTypeIdParams = z.object({ feeTypeId: idSchema("Fee type id") });

const listFeeTypesQuery = z.object({
  includeInactive: z.enum(["true", "false"]).optional(),
  frequency: z.enum(["ONE_TIME", "MONTHLY"]).optional(),
});

export const FeeTypeValidation = {
  createFeeType,
  updateFeeType,
  feeTypeIdParams,
  listFeeTypesQuery,
};