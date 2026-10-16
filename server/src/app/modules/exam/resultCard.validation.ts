import { z } from "zod";
import { idSchema } from "../../shared/financeSchemas";

/*
 * A school's result card design. Every field has a default, so a school that never saved
 * settings (or saved them before a field existed) still gets a complete design.
 */
export const cardSettingsSchema = z.object({
  // the ready layouts the app draws
  layout: z.enum(["CLASSIC", "MODERN", "COMPACT"]).default("CLASSIC"),
  accentColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a colour like #1e3a8a")
    .default("#1e3a8a"),
  // the card's heading; empty = "Progress report" in the school's language
  title: z.string().trim().max(60).default(""),

  // header and student details
  showLogo: z.boolean().default(true),
  showAddress: z.boolean().default(true),
  showPhoto: z.boolean().default(true),
  showParents: z.boolean().default(true),
  showAdmissionNo: z.boolean().default(true),

  // subject table columns
  showCode: z.boolean().default(false),
  showFullMarks: z.boolean().default(true),
  showPassMarks: z.boolean().default(false),
  showParts: z.boolean().default(true),
  // the top marks in each subject, in the student's section or the whole class
  highestMarks: z.enum(["NONE", "SECTION", "CLASS"]).default("CLASS"),
  showGrade: z.boolean().default(true),
  showPoint: z.boolean().default(true),
  // final result cards: each component's percentage (Half-yearly 30%, Annual 70%…)
  showComponents: z.boolean().default(true),

  // below the table
  position: z.enum(["NONE", "SECTION", "CLASS", "BOTH"]).default("SECTION"),
  showAttendance: z.boolean().default(true),
  showRemarks: z.boolean().default(false),
  showGradingTable: z.boolean().default(true),

  // up to four signature lines, e.g. Class teacher, Guardian, Head teacher; empty = the defaults
  signatures: z.array(z.string().trim().min(1).max(40)).max(4).optional(),
  footerNote: z.string().trim().max(200).default(""),
});

export type CardSettings = z.output<typeof cardSettingsSchema>;

// a full design is sent when saving (the screen always has every field)
const saveSettings = cardSettingsSchema.strict();

const cardsQuery = z.object({
  examId: idSchema("Exam"),
  classId: idSchema("Class"),
  // one section, or one student; neither = the whole class
  sectionId: z.string().trim().min(1).optional(),
  enrollmentId: z.string().trim().min(1).optional(),
});

const remarksQuery = z.object({
  examId: idSchema("Exam"),
  classId: idSchema("Class"),
  sectionId: idSchema("Section"),
});

const saveRemarks = z.strictObject({
  examId: idSchema("Exam"),
  classId: idSchema("Class"),
  sectionId: idSchema("Section"),
  remarks: z
    .array(
      z.strictObject({
        enrollmentId: idSchema("Student enrollment"),
        // empty or null removes the remark
        remark: z.string().trim().max(300).nullable(),
      }),
    )
    .min(1)
    .max(300)
    .refine((rs) => new Set(rs.map((r) => r.enrollmentId)).size === rs.length, "A student is listed twice"),
});

export const ResultCardValidation = { saveSettings, cardsQuery, remarksQuery, saveRemarks };

export type CardsQuery = z.infer<typeof cardsQuery>;
export type RemarksQuery = z.infer<typeof remarksQuery>;
export type SaveRemarksPayload = z.infer<typeof saveRemarks>;
