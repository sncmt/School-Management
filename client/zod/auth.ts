import { z } from "zod";
import { toAsciiDigits } from "@/lib/i18n/digits";

// Mirrors server/src/app/modules/auth/auth.validation.ts.
// Messages are translation keys; <FormMessage> shows them in the current language.

const password = z.string().min(1, "validation.passwordRequired").max(200);

export const platformLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "validation.emailRequired")
    .pipe(z.email("validation.emailInvalid")),
  password,
});

// The server normalises the identifier (lowercase email or +8801XXXXXXXXX).
// A phone typed with Bangla digits is converted first.
export const schoolLoginSchema = z.object({
  identifier: z.string().trim().min(1, "validation.identifierRequired").transform(toAsciiDigits),
  password,
});

// 72 is bcrypt's limit
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "validation.currentPasswordRequired").max(200),
    newPassword: z.string().min(8, "validation.newPasswordMin").max(72, "validation.newPasswordMax"),
    confirmPassword: z.string().min(1, "validation.confirmPasswordRequired"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "validation.passwordsDontMatch",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "validation.newPasswordSameAsCurrent",
  });

export type PlatformLoginInput = z.input<typeof platformLoginSchema>;
export type SchoolLoginInput = z.input<typeof schoolLoginSchema>;
export type SchoolLoginValues = z.output<typeof schoolLoginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
