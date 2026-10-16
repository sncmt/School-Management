import { z } from "zod";
import { emailSchema, loginIdentifierSchema } from "../../utils/identity";

const platformLoginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: "Password is required" }).min(1, "Password is required").max(200),
});

const schoolLoginSchema = z.object({
  identifier: loginIdentifierSchema,
  password: z.string({ error: "Password is required" }).min(1, "Password is required").max(200),
});

// 72 is bcrypt's limit: characters past it are silently ignored
const newPassword = z
  .string({ error: "New password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters");

const changePasswordSchema = z.object({
  currentPassword: z.string({ error: "Current password is required" }).min(1).max(200),
  newPassword,
});

// the school super admin changing someone's password, with the code emailed to them
const passwordCodeSchema = z.object({
  userId: z.string({ error: "Choose the account" }).trim().min(1, "Choose the account").max(64),
});

const userIdParams = z.object({ userId: z.string().trim().min(1).max(64) });

const setUserPasswordSchema = z.object({
  newPassword,
  code: z
    .string({ error: "Enter the code from the email" })
    .trim()
    .regex(/^\d{6}$/, "The code is 6 digits"),
});

export const AuthValidation = {
  platformLoginSchema,
  schoolLoginSchema,
  changePasswordSchema,
  passwordCodeSchema,
  userIdParams,
  setUserPasswordSchema,
};