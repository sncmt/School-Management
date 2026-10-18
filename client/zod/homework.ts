import { z } from "zod";

// Mirrors createHomework in server/src/app/modules/homework/homework.validation.ts.
// Messages are translation keys; <FormMessage> shows them in the current language.

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validation.dateRequired");

export const homeworkFormSchema = z
  .object({
    classSubjectId: z.string().min(1, "validation.chooseSubject"),
    sectionIds: z.array(z.string()).min(1, "validation.chooseSections"),
    title: z.string().trim().min(2, "validation.homeworkTitleRequired").max(200, "validation.max200"),
    instructions: z.string().trim().max(5000, "validation.homeworkTooLong"),
    assignedOn: day,
    dueDate: day,
    hasMarks: z.boolean(),
    // a text box: checked below only when the homework has marks
    fullMarks: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.dueDate < v.assignedOn) ctx.addIssue({ code: "custom", path: ["dueDate"], message: "validation.dueBeforeGiven" });
    if (v.hasMarks) {
      const n = Number(v.fullMarks);
      if (!v.fullMarks.trim() || !Number.isFinite(n) || n <= 0 || n > 1000 || Math.round(n * 100) !== n * 100) {
        ctx.addIssue({ code: "custom", path: ["fullMarks"], message: "validation.fullMarksInvalid" });
      }
    }
  });

export type HomeworkFormValues = z.infer<typeof homeworkFormSchema>;
