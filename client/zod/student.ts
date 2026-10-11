import { z } from "zod";
import { toAsciiDigits } from "@/lib/i18n/digits";

// Mirrors createStudent / updateStudent in server/src/app/modules/student/student.validation.ts.
// Messages are translation keys; <FormMessage> shows them in the current language.

const text = (max: 20 | 100 | 200 | 300) =>
  z
    .string()
    .trim()
    .max(max, max <= 100 ? "validation.max100" : "validation.max300");

// a required person's name
const name = (message: string) => z.string().trim().min(2, message).max(150, "validation.max150");

// "" = not given; otherwise 01712345678, +8801712345678 or 8801712345678, in either digit set
const optionalPhone = z
  .string()
  .trim()
  .transform((v) => toAsciiDigits(v).replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^((\+?880|0)1[3-9]\d{8})?$/, "validation.phoneInvalid"));

const rollNumber = z
  .string()
  .trim()
  .transform(toAsciiDigits)
  .pipe(z.string().regex(/^[A-Za-z0-9-]{0,10}$/, "validation.rollFormat"));

const profileFields = {
  nameEn: name("validation.englishNameRequired"),
  nameBn: name("validation.banglaNameRequired"),
  gender: z.enum(["MALE", "FEMALE", "OTHER", ""]).refine((v) => v !== "", "validation.genderRequired"),
  religion: z
    .enum(["ISLAM", "HINDUISM", "CHRISTIANITY", "BUDDHISM", "OTHER", ""])
    .refine((v) => v !== "", "validation.religionRequired"),
  dob: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/)
    .refine((v) => !v || new Date(v).getTime() < Date.now(), "validation.dobPast"),
  fatherName: name("validation.fatherNameRequired"),
  motherName: name("validation.motherNameRequired"),
  guardianName: text(100),
  guardianPhone: optionalPhone,
  phone: optionalPhone,
  email: z.string().trim().pipe(z.union([z.literal(""), z.email("validation.emailInvalid")])),
  whatsApp: z.string().trim().transform(toAsciiDigits).pipe(z.string().max(20, "validation.max100")),
  presentAddress: text(300),
  permanentAddress: text(300),
  // "" = the next number is given automatically (only when admitting)
  admissionNo: z
    .string()
    .trim()
    .transform(toAsciiDigits)
    .pipe(z.string().max(30, "validation.max100")),
};

export const studentFormSchema = z.object({
  ...profileFields,
  classId: z.string(),
  sectionId: z.string(),
  groupId: z.string(),
  rollNumber,
});

/** Admitting: the class and section are required. */
export const admitStudentSchema = studentFormSchema.superRefine((v, ctx) => {
  if (!v.classId) ctx.addIssue({ code: "custom", path: ["classId"], message: "validation.classRequired" });
  else if (!v.sectionId) ctx.addIssue({ code: "custom", path: ["sectionId"], message: "validation.sectionRequired" });
});

/** Editing: the placement is changed on its own, and the admission number can't be blank. */
export const editStudentSchema = studentFormSchema.superRefine((v, ctx) => {
  if (!v.admissionNo) ctx.addIssue({ code: "custom", path: ["admissionNo"], message: "validation.admissionNoRequired" });
});

export type StudentFormInput = z.input<typeof studentFormSchema>;
export type StudentFormValues = z.output<typeof studentFormSchema>;

/** The current year's section, group and roll. */
export const placementSchema = z.object({
  sectionId: z.string().min(1, "validation.sectionRequired"),
  groupId: z.string(),
  rollNumber,
});

export type PlacementInput = z.input<typeof placementSchema>;
export type PlacementValues = z.output<typeof placementSchema>;
