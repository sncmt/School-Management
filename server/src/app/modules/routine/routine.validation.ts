import { z } from "zod";
import { idSchema } from "../../shared/financeSchemas";
import { schoolLanguageNames } from "../../shared/names";
import { dateOnlySchema, timeSchema } from "../../shared/scheduleSchemas";

const optionalId = z.string().trim().min(1).optional();
// a template's and each period's name in the school's language is required (the service
// checks it); the other is optional
const names = schoolLanguageNames(50);

// ------------------------------------------------------------ period templates

const period = z
  .strictObject({
    number: z.number().int().min(1).max(20),
    ...names, // "1st period", "Tiffin"
    startTime: timeSchema,
    endTime: timeSchema,
    // tiffin, prayer: no class can be placed in it
    isBreak: z.boolean().default(false),
  })
  .refine((p) => p.endTime > p.startTime, { message: "End time must be after start time", path: ["endTime"] });

/* A template's periods, in order: numbered once each, one after another without overlapping. */
const templateBody = z
  .strictObject({
    ...names,
    periods: z.array(period).min(1, "Add at least one period").max(20),
  })
  .superRefine((d, ctx) => {
    const numbers = d.periods.map((p) => p.number);
    if (new Set(numbers).size !== numbers.length) {
      ctx.addIssue({ code: "custom", message: "Each period needs its own number", path: ["periods"] });
      return;
    }
    const sorted = [...d.periods].sort((a, b) => a.number - b.number);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].startTime < sorted[i - 1].endTime) {
        ctx.addIssue({
          code: "custom",
          message: `Period ${sorted[i].number} starts before period ${sorted[i - 1].number} ends`,
          path: ["periods"],
        });
      }
    }
  });

const templateIdParams = z.object({ templateId: idSchema("Period template id") });

// ------------------------------------------------------------- routine entries

/*
 * One class in the weekly routine. Several sections of the class = taught together
 * (combined). Any teacher of the school may be placed; null = not decided yet.
 */
const entryBody = z.strictObject({
  // defaults to the current academic year
  academicYearId: optionalId,
  classId: idSchema("Class"),
  sectionIds: z
    .array(idSchema("Section"))
    .min(1, "Choose the section (or the sections taught together)")
    .max(10)
    .refine((ids) => new Set(ids).size === ids.length, "A section is listed twice"),
  weekday: z.number().int().min(0, "Weekdays are 0 (Sunday) to 6 (Saturday)").max(6, "Weekdays are 0 (Sunday) to 6 (Saturday)"),
  periodNumber: z.number().int().min(1).max(20),
  classSubjectId: idSchema("Class subject"),
  teacherId: idSchema("Teacher").nullable().optional(),
});

const entryIdParams = z.object({ entryId: idSchema("Routine entry id") });

const sectionWeekQuery = z.object({
  sectionId: idSchema("Section"),
  academicYearId: optionalId,
});

const teacherWeekQuery = z.object({
  teacherId: idSchema("Teacher"),
  academicYearId: optionalId,
});

const yearQuery = z.object({ academicYearId: optionalId });

/* One date: a section's or a teacher's routine that day. */
const dayQuery = z
  .object({
    // defaults to today
    date: dateOnlySchema.optional(),
    sectionId: optionalId,
    teacherId: optionalId,
  })
  .refine((d) => (d.sectionId === undefined) !== (d.teacherId === undefined), {
    message: "Give a section or a teacher",
  });

const myDayQuery = z.object({ date: dateOnlySchema.optional() });

// --------------------------------------------------------------- substitutes

const freeTeachersQuery = z.object({
  date: dateOnlySchema,
  sectionId: idSchema("Section"),
  periodNumber: z.coerce.number().int().min(1).max(20),
});

const substitutionBody = z.strictObject({
  entryId: idSchema("Routine entry"),
  date: dateOnlySchema,
  teacherId: idSchema("Teacher"),
  note: z.string().trim().max(200).optional(),
});

const substitutionIdParams = z.object({ substitutionId: idSchema("Substitution id") });

const substitutionsQuery = z.object({ date: dateOnlySchema });

export const RoutineValidation = {
  templateBody,
  templateIdParams,
  entryBody,
  entryIdParams,
  sectionWeekQuery,
  teacherWeekQuery,
  yearQuery,
  dayQuery,
  myDayQuery,
  freeTeachersQuery,
  substitutionBody,
  substitutionIdParams,
  substitutionsQuery,
};

export type TemplatePayload = z.infer<typeof templateBody>;
export type EntryPayload = z.infer<typeof entryBody>;
export type SectionWeekQuery = z.infer<typeof sectionWeekQuery>;
export type TeacherWeekQuery = z.infer<typeof teacherWeekQuery>;
export type YearQuery = z.infer<typeof yearQuery>;
export type DayQuery = z.infer<typeof dayQuery>;
export type MyDayQuery = z.infer<typeof myDayQuery>;
export type FreeTeachersQuery = z.infer<typeof freeTeachersQuery>;
export type SubstitutionPayload = z.infer<typeof substitutionBody>;
export type SubstitutionsQuery = z.infer<typeof substitutionsQuery>;
