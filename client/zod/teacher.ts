import { z } from "zod";
import { toAsciiDigits } from "@/lib/i18n/digits";

// Mirrors createTeacher / updateTeacher in server/src/app/modules/teacher/teacher.validation.ts.
// The server normalises the phone (+8801XXXXXXXXX); here it only has to look like one.
// Messages are translation keys; <FormMessage> shows them in the current language.

const text = (max: 100 | 200) =>
  z
    .string()
    .trim()
    .max(max, max === 100 ? "validation.max100" : "validation.max200");

export const teacherFormSchema = z.object({
  // both required, whatever the school's language
  nameEn: z.string().trim().min(2, "validation.englishNameRequired").max(150),
  nameBn: z.string().trim().min(2, "validation.banglaNameRequired").max(150),
  // 01712345678, +8801712345678, 8801712345678, in either digit set
  phone: z
    .string()
    .trim()
    .transform((v) => toAsciiDigits(v).replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^(\+?880|0)1[3-9]\d{8}$/, "validation.phoneInvalid")),
  designation: text(100),
  mpoIndex: z.string().trim().max(30),
  joiningDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/), // "" = not given
  qualification: text(200),
  specialization: text(200),
  gender: z.enum(["MALE", "FEMALE", "OTHER", ""]),
  nid: z
    .string()
    .trim()
    .transform(toAsciiDigits)
    .pipe(z.string().regex(/^(\d{10}|\d{13}|\d{17})?$/, "validation.nidInvalid")),
});

export type TeacherFormInput = z.input<typeof teacherFormSchema>;
export type TeacherFormValues = z.output<typeof teacherFormSchema>;
