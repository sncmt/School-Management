import { z } from "zod";
import { idSchema } from "../../shared/financeSchemas";

const saveSettings = z.strictObject({
  // one rule per line
  rules: z.string().trim().max(1500, "The rules are too long"),
  signatures: z.array(z.string().trim().min(1, "Write the signature line").max(40)).max(3, "At most 3 signatures"),
});

const cardsQuery = z.object({
  classId: z.string().trim().min(1).optional(),
  sectionId: z.string().trim().min(1).optional(),
  enrollmentId: z.string().trim().min(1).optional(),
});

const release = z.strictObject({ released: z.boolean() });

const examParams = z.object({ examId: idSchema("Exam id") });

const familyQuery = z.object({ studentId: idSchema("Student"), examId: idSchema("Exam") });

export const AdmitCardValidation = { saveSettings, cardsQuery, release, examParams, familyQuery };

export type AdmitSettingsPayload = z.infer<typeof saveSettings>;
export type CardsQuery = z.infer<typeof cardsQuery>;
