import { z } from "zod";
import { idSchema } from "../../shared/financeSchemas";

const previewQuery = z.object({
  // the year being finished; defaults to the current one
  academicYearId: z.string().trim().min(1).optional(),
  classId: idSchema("Class"),
  // which published final result guides the choices; defaults to the latest one
  formulaId: z.string().trim().min(1).optional(),
});

/*
 * What happens to each student of the class at the end of the year:
 * PROMOTE to the next class, REPEAT the same class, GRADUATE (the last class),
 * or LEAVE the school. Students not listed are left as they are.
 */
const promote = z.object({
  academicYearId: z.string().trim().min(1).optional(),
  classId: idSchema("Class"),
  // the section of the next class for everyone moving up (one each can override)
  sectionId: z.string().trim().min(1).optional(),
  students: z
    .array(
      z.object({
        enrollmentId: idSchema("Enrollment"),
        action: z.enum(["PROMOTE", "REPEAT", "GRADUATE", "LEAVE"]),
        // this student's section next year (PROMOTE: in the next class; REPEAT: in this class)
        sectionId: z.string().trim().min(1).optional(),
      }),
    )
    .min(1, "Choose at least one student")
    .max(500)
    .refine((list) => new Set(list.map((s) => s.enrollmentId)).size === list.length, "A student is listed twice"),
});

const enrollmentIdParams = z.object({ enrollmentId: idSchema("Enrollment") });

export const PromotionValidation = { previewQuery, promote, enrollmentIdParams };

export type PromotionPreviewQuery = z.infer<typeof previewQuery>;
export type PromotePayload = z.infer<typeof promote>;
