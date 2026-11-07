import { z } from "zod";
import { idSchema } from "../../shared/financeSchemas";

const name = z.string({ error: "Name is required!" }).trim().min(2, "Name is required!").max(60);
// null: unlimited students
const maxStudents = z.number().int("Whole students only").min(1, "At least 1 student").max(1_000_000).nullable();
const monthlyPrice = z
  .number({ error: "Price is required!" })
  .min(0, "The price can't be negative")
  .max(9_999_999, "The price is too large")
  .refine((n) => Math.round(n * 100) === n * 100, "At most 2 decimal places");

const createPackage = z.strictObject({
  // a stable key for the code: BASIC, STANDARD...
  code: z
    .string({ error: "Code is required!" })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9_]{1,29}$/, "Use capital letters, digits and _ (e.g. GOLD)"),
  name,
  maxStudents,
  monthlyPrice,
  sortOrder: z.number().int().min(0).max(999).optional(),
});

// the code never changes (seeds and the code know a package by it)
const updatePackage = z
  .strictObject({
    name: name.optional(),
    maxStudents: maxStudents.optional(),
    monthlyPrice: monthlyPrice.optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).max(999).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field to update" });

const packageIdParams = z.object({ packageId: idSchema("Package id") });

export const PackageValidation = { createPackage, updatePackage, packageIdParams };

export type CreatePackagePayload = z.infer<typeof createPackage>;
export type UpdatePackagePayload = z.infer<typeof updatePackage>;
