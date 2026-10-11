import { z } from "zod";
import { idSchema } from "../../shared/financeSchemas";
import { dateOnlySchema } from "../../shared/scheduleSchemas";

const name = z
  .string({ error: "Academic year name is required!" })
  .trim()
  .min(1, "Academic year name is required")
  .max(50, "Academic year name cannot exceed 50 characters");

const createAcademicYear = z
  .object({
    name,
    // calendar dates "YYYY-MM-DD"
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
    isCurrent: z.boolean().optional().default(false),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

// missing = leave as it is; the service checks the dates together with the stored ones
const updateAcademicYear = z
  .strictObject({
    name: name.optional(),
    startDate: dateOnlySchema.optional(),
    endDate: dateOnlySchema.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field to update" })
  .refine((d) => !d.startDate || !d.endDate || d.endDate > d.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

const academicYearIdParams = z.object({ academicYearId: idSchema("Academic year id") });

export const AcademicYearValidation = {
  createAcademicYear,
  updateAcademicYear,
  academicYearIdParams,
};
