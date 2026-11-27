import { z } from "zod";
import { idSchema } from "../../shared/financeSchemas";
import { rollNumber } from "../student/student.validation";

const optionalId = z.string().trim().min(1).optional();

/*
 * One class's roll numbers in one academic year: the whole class, or one section of it.
 * The year defaults to the current year of the class's track (school or college).
 */
const rollsQuery = z.object({
  academicYearId: optionalId,
  classId: idSchema("Class"),
  // left out: every section of the class (or a class without sections)
  sectionId: optionalId,
});

const saveRolls = z.strictObject({
  academicYearId: optionalId,
  classId: idSchema("Class"),
  sectionId: optionalId,
  items: z
    .array(
      z.strictObject({
        enrollmentId: idSchema("Enrollment"),
        // null or "" clears the roll
        rollNumber: z.preprocess((v) => (v === "" ? null : v), rollNumber.nullable()),
      }),
    )
    .min(1, "Nothing to save")
    .max(500)
    .refine((items) => new Set(items.map((i) => i.enrollmentId)).size === items.length, "A student is listed twice"),
});

export const RollNumberValidation = { rollsQuery, saveRolls };

export type RollsQuery = z.infer<typeof rollsQuery>;
export type SaveRollsPayload = z.infer<typeof saveRolls>;
