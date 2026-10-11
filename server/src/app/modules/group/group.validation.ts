import { z } from "zod";
import { idSchema } from "../../shared/financeSchemas";
import { schoolLanguageNames } from "../../shared/names";

// the name in the school's language is required (the service checks it); the other is optional
const names = schoolLanguageNames(50);

const createGroup = z.strictObject(names);

// missing = leave as it is, null or "" = clear (unless it's the school's language)
const updateGroup = z
  .strictObject(names)
  .refine((d) => d.nameEn !== undefined || d.nameBn !== undefined, {
    message: "Provide a name to change",
  });

const groupIdParams = z.object({ groupId: idSchema("Group id") });

const groupQuery = z.object({
  // student and subject counts are for this year; defaults to the current year
  academicYearId: z.string().trim().min(1).optional(),
});

export const GroupValidation = {
  createGroup,
  updateGroup,
  groupIdParams,
  groupQuery,
};
