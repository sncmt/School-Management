import { z } from "zod";
import { idSchema } from "../../shared/financeSchemas";
import { timeSchema as time } from "../../shared/scheduleSchemas";

// validateRequest({ body }) parses req.body directly, so these schemas are the bodies themselves

const sectionName = z
  .string({ error: "Section name is required!" })
  .trim()
  .min(1, "Section name is required!")
  .max(50, "Section name cannot exceed 50 characters");

const optionalId = z.string().trim().min(1).optional();

/*
 * One or more section names for one or more classes: every class gets every name
 * ("A" and "B" for classes 6, 7 and 8 = six sections). A class that already has one
 * of the names keeps it and that pair is skipped.
 */
const createSectionSchema = z.object({
  classIds: z
    .array(idSchema("Class"))
    .min(1, "Choose at least one class")
    .max(50)
    .refine((ids) => new Set(ids).size === ids.length, "A class is listed twice"),
  names: z
    .array(sectionName)
    .min(1, "Enter at least one section name")
    .max(20)
    // "A" and "a" are the same name
    .refine((names) => new Set(names.map((n) => n.toLowerCase())).size === names.length, "A section name is listed twice"),
});

// the class of a section never changes: enrollments store both, so only a rename is allowed
const updateSectionSchema = z.strictObject({
  name: sectionName,
});

const sectionIdParams = z.object({ sectionId: idSchema("Section id") });

const listSectionsQuery = z.object({
  classId: optionalId,
  // teacher, capacity, class hours and student counts are for this year; defaults to the current year
  academicYearId: optionalId,
});

const sectionQuery = z.object({
  academicYearId: optionalId,
});

const yearConfigQuery = z.object({
  academicYearId: idSchema("Academic year"),
});

// missing = leave as it is, null = clear
const setYearConfigSchema = z
  .strictObject({
    academicYearId: idSchema("Academic year"),
    classTeacherMembershipId: z.string().trim().min(1).nullable().optional(),
    // optional and only a warning: it never blocks an admission
    capacity: z.number().int("Capacity must be a whole number").positive("Capacity must be greater than zero").max(500).nullable().optional(),
    // the section's normal class hours; both are set together (checked after merging with what is saved)
    startTime: time.nullable().optional(),
    endTime: time.nullable().optional(),
    // the section's periods (bell schedule) this year
    periodTemplateId: z.string().trim().min(1).nullable().optional(),
  })
  .refine(
    (d) =>
      d.classTeacherMembershipId !== undefined ||
      d.capacity !== undefined ||
      d.startTime !== undefined ||
      d.endTime !== undefined ||
      d.periodTemplateId !== undefined,
    { message: "Provide a class teacher, a capacity, class hours or a period template" },
  );

export const SectionValidation = {
  createSectionSchema,
  updateSectionSchema,
  sectionIdParams,
  listSectionsQuery,
  sectionQuery,
  yearConfigQuery,
  setYearConfigSchema,
};
