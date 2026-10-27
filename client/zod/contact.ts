import { z } from "zod";
import { toAsciiDigits } from "@/lib/i18n/digits";

// Mirrors server/src/app/modules/contact/contact.route.ts.
// Messages are translation keys; <FormMessage> shows them in the current language.

// 01712345678, +8801712345678 or 8801712345678 (spaces and dashes allowed)
const BD_MOBILE = /^(?:\+?880|0)1[3-9]\d{8}$/;

export const contactSchema = z.object({
  name: z.string().trim().min(2, "validation.nameRequired").max(100, "validation.max100"),
  school: z.string().trim().min(2, "validation.schoolNameRequired").max(150, "validation.max150"),
  phone: z
    .string()
    .trim()
    .transform((v) => toAsciiDigits(v).replace(/[\s-]/g, ""))
    .pipe(z.string().regex(BD_MOBILE, "validation.phoneInvalid")),
  email: z.union([z.literal(""), z.string().trim().max(150, "validation.max150").pipe(z.email("validation.emailInvalid"))]),
  // "" = not chosen yet
  plan: z.string(),
  message: z.string().trim().max(1000, "validation.max1000"),
  // never shown: only bots fill it in
  website: z.string(),
});

export type ContactForm = z.input<typeof contactSchema>;

export type ContactInput = {
  name: string;
  school: string;
  phone: string;
  email?: string;
  package?: string;
  billing?: string;
  message?: string;
  website?: string;
};
