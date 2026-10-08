import { z } from "zod";

// Mirrors server/src/app/modules/auth/auth.validation.ts

const password = z.string().min(1, "Password is required").max(200);

export const platformLoginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").pipe(z.email("Enter a valid email address")),
  password,
});

// The server normalises the identifier (lowercase email or +8801XXXXXXXXX).
export const schoolLoginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or mobile number is required"),
  password,
});

// 72 is bcrypt's limit
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required").max(200),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ["newPassword"],
    message: "New password must be different from the current one",
  });

export type PlatformLoginInput = z.infer<typeof platformLoginSchema>;
export type SchoolLoginInput = z.infer<typeof schoolLoginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
