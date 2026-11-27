import { z } from "zod";
import { MidYearFeeRule } from "../../../../generated/prisma/enums";
import { trackSchema } from "../../shared/academicYears";

// the whole settings form is sent when saving
const saveSettings = z.strictObject({
  // a student admitted mid-year: monthly fees from the admission month, or for the whole year
  midYearMonthlyFees: z.enum(MidYearFeeRule),
});

// ISO timestamps (a Bangladesh day's start and end); left out = today
const collectionReportQuery = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine((d) => !d.from || !d.to || d.from <= d.to, { message: "The start must be before the end", path: ["to"] });

const duesReportQuery = z.object({
  // defaults to the current academic year (of the class's track, or of this track)
  academicYearId: z.string().trim().min(1).optional(),
  track: trackSchema.optional(),
  // one class: each student who owes; left out = every class (of the year's track)
  classId: z.string().trim().min(1).optional(),
});

export const FinanceValidation = { saveSettings, collectionReportQuery, duesReportQuery };

export type FinanceSettingsPayload = z.infer<typeof saveSettings>;
export type CollectionReportQuery = z.infer<typeof collectionReportQuery>;
export type DuesReportQuery = z.infer<typeof duesReportQuery>;
