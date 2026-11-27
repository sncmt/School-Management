import { z } from "zod";
import { trackSchema } from "../../shared/academicYears";
import { idSchema } from "../../shared/financeSchemas";

const name = z
  .string({ error: "Class name is required" })
  .trim()
  .min(1, "Class name is required")
  .max(50, "Class name cannot exceed 50 characters");

// orders the classes and drives promotion: Nursery = 0, Class 1 = 1 ... Class 12 = 12
const numericLevel = z
  .number({ error: "Level is required" })
  .int("Level must be a whole number")
  .min(0, "Level cannot be negative")
  .max(30, "Level cannot be more than 30");

// school or college (an institution with both); the others get their one track
const createClass = z.object({ name, numericLevel, track: trackSchema.optional() });

// missing = leave as it is
const updateClass = z
  .strictObject({ name: name.optional(), numericLevel: numericLevel.optional(), track: trackSchema.optional() })
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field to update" });

const classIdParams = z.object({ classId: idSchema("Class id") });

const classQuery = z.object({
  // student counts are for this year; defaults to the current year
  academicYearId: z.string().trim().min(1).optional(),
  // only this track's classes (an institution with school and college classes)
  track: trackSchema.optional(),
});

export const ClassValidation = {
  createClass,
  updateClass,
  classIdParams,
  classQuery,
};
