import { z } from "zod";
import { Gender, TeacherStatus } from "../../../../generated/prisma/enums";
import { idSchema } from "../../shared/financeSchemas";
import { dateOnlySchema } from "../../shared/scheduleSchemas";
import { bdPhoneSchema } from "../../utils/identity";

// forms send "" for blank fields: treat that as "not provided" (or null on update)
const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const opt = <T extends z.ZodType>(schema: T) => z.preprocess(blank, schema.optional());
const clearable = <T extends z.ZodType>(schema: T) => z.preprocess(blankToNull, schema.nullable().optional());

const text = (max: number) => z.string().trim().max(max);
// both names are required, whatever the school's language
const name = (label: string) =>
  z.string({ error: `${label} is required!` }).trim().min(2, `${label} is required!`).max(150);
const nameEn = name("English name");
const nameBn = name("Bangla name");

// every profile field is optional; the photo is uploaded on its own (PUT /:teacherId/photo)
const profileFields = {
  designation: text(100),
  mpoIndex: text(30),
  joiningDate: dateOnlySchema,
  qualification: text(200),
  specialization: text(200),
  gender: z.enum(Gender),
  nid: z.string().trim().regex(/^\d{10}$|^\d{13}$|^\d{17}$/, "NID must be 10, 13 or 17 digits"),
};

const createTeacher = z.strictObject({
  nameEn,
  nameBn,
  // the teacher's login; an existing account with this number is linked, not replaced
  phone: bdPhoneSchema,
  designation: opt(profileFields.designation),
  mpoIndex: opt(profileFields.mpoIndex),
  joiningDate: opt(profileFields.joiningDate),
  qualification: opt(profileFields.qualification),
  specialization: opt(profileFields.specialization),
  gender: opt(profileFields.gender),
  nid: opt(profileFields.nid),
});

// missing = leave as it is, null or "" = clear
const updateTeacher = z
  .strictObject({
    // the names are this school's; the phone is the account's login, only changeable
    // when the account is used in this school alone
    nameEn: nameEn.optional(),
    nameBn: nameBn.optional(),
    phone: bdPhoneSchema.optional(),
    designation: clearable(profileFields.designation),
    mpoIndex: clearable(profileFields.mpoIndex),
    joiningDate: clearable(profileFields.joiningDate),
    qualification: clearable(profileFields.qualification),
    specialization: clearable(profileFields.specialization),
    gender: clearable(profileFields.gender),
    nid: clearable(profileFields.nid),
    // a working teacher is ACTIVE or ON_LEAVE; leaving goes through /deactivate
    status: z.enum(["ACTIVE", "ON_LEAVE"]).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field to update" });

const deactivateTeacher = z.strictObject({
  status: z.enum(["RESIGNED", "RETIRED"]),
  // defaults to today
  leftAt: dateOnlySchema.optional(),
});

const teacherIdParams = z.object({ teacherId: idSchema("Teacher id") });

const listTeachersQuery = z.object({
  search: z.string().trim().min(1).optional(),
  status: z.enum(TeacherStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const yearQuery = z.object({
  // defaults to the current academic year
  academicYearId: z.string().trim().min(1).optional(),
});

const scheduleQuery = z.object({
  // defaults to today
  date: dateOnlySchema.optional(),
});

export const TeacherValidation = {
  createTeacher,
  updateTeacher,
  deactivateTeacher,
  teacherIdParams,
  listTeachersQuery,
  yearQuery,
  scheduleQuery,
};
