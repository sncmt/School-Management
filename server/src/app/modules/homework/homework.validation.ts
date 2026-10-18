import { z } from "zod";
import { HomeworkCheckStatus } from "../../../../generated/prisma/enums";
import { idSchema } from "../../shared/financeSchemas";
import { dateOnlySchema } from "../../shared/scheduleSchemas";

const hasMaxTwoDecimals = (n: number) => Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;

const marksSchema = z
  .number({ error: "Marks must be a number" })
  .min(0, "Marks cannot be negative")
  .max(1000, "Marks are too large")
  .refine(hasMaxTwoDecimals, "Marks can have at most 2 decimal places");

const fullMarksSchema = z
  .number({ error: "Full marks must be a number" })
  .positive("Full marks must be more than zero")
  .max(1000, "Full marks are too large")
  .refine(hasMaxTwoDecimals, "Full marks can have at most 2 decimal places");

const fields = {
  title: z.string({ error: "Title is required!" }).trim().min(2, "Title is required!").max(200),
  // plain text, like notices: blank lines between paragraphs, **bold**, "- " list items
  instructions: z.string().trim().max(5000).default(""),
  sectionIds: z.array(idSchema("Section")).min(1, "Choose at least one section").max(30),
  assignedOn: dateOnlySchema,
  dueDate: dateOnlySchema,
  // null: no marks, only the tick and a comment
  fullMarks: fullMarksSchema.nullable().default(null),
};

const createHomework = z
  .strictObject({
    classSubjectId: idSchema("Subject"),
    ...fields,
    // left out: today
    assignedOn: dateOnlySchema.optional(),
  })
  .refine((d) => !d.assignedOn || d.dueDate >= d.assignedOn, { path: ["dueDate"], message: "The due date can't be before the day it is given" });

// the subject stays; sections, when sent, replace the old ones
const updateHomework = z
  .strictObject({
    title: fields.title.optional(),
    instructions: z.string().trim().max(5000).optional(),
    sectionIds: fields.sectionIds.optional(),
    assignedOn: dateOnlySchema.optional(),
    dueDate: dateOnlySchema.optional(),
    fullMarks: fullMarksSchema.nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field to update" })
  .refine((d) => !d.assignedOn || !d.dueDate || d.dueDate >= d.assignedOn, {
    path: ["dueDate"],
    message: "The due date can't be before the day it is given",
  });

const saveChecks = z.strictObject({
  checks: z
    .array(
      z.strictObject({
        enrollmentId: idSchema("Student"),
        // null: clear the tick
        status: z.enum(HomeworkCheckStatus).nullable(),
        marks: marksSchema.nullable().optional(),
        comment: z.string().trim().max(300).nullable().optional(),
      }),
    )
    .min(1)
    .max(300),
});

const homeworkIdParams = z.object({ homeworkId: idSchema("Homework id") });
const attachmentParams = z.object({ homeworkId: idSchema("Homework id"), attachmentId: idSchema("Attachment id") });

const listQuery = z.object({
  classId: z.string().trim().min(1).optional(),
  sectionId: z.string().trim().min(1).optional(),
  classSubjectId: z.string().trim().min(1).optional(),
  // due on or after / on or before
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  // only the homework of the person's own subjects
  mine: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  // by due date: the latest first (default) or the soonest first
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const familyQuery = z.object({
  studentId: idSchema("Student"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const HomeworkValidation = { createHomework, updateHomework, saveChecks, homeworkIdParams, attachmentParams, listQuery, familyQuery };

export type CreateHomeworkPayload = z.infer<typeof createHomework>;
export type UpdateHomeworkPayload = z.infer<typeof updateHomework>;
export type SaveChecksPayload = z.infer<typeof saveChecks>;
export type HomeworkListQuery = z.infer<typeof listQuery>;
export type FamilyHomeworkQuery = z.infer<typeof familyQuery>;
