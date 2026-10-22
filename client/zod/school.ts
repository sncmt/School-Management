import { z } from "zod";
import { toAsciiDigits } from "@/lib/i18n/digits";

// Mirrors createSchoolSchema / updateSchoolSchema in
// server/src/app/modules/school/school.validation.ts.
// Messages are translation keys; <FormMessage> shows them in the current language.

// same list as the server; also never a school: www and admin are our own sites
const RESERVED_SUBDOMAINS = new Set([
  "www", "admin", "api", "app", "mail", "static", "cdn", "dashboard", "support", "help", "docs", "status",
]);

/*
 * An empty optional input means "not given" when creating (left out, so the
 * server's default applies) and "clear it" when editing (sent as null).
 */
const text = z.string().trim();
const asNumber = (v: string) => Number(toAsciiDigits(v)); // numbers are typed as text so Bangla digits work
const asPhone = (v: string) => toAsciiDigits(v).replace(/[\s-]/g, "");

const optionalText = (schema: z.ZodType<string, string>) =>
  text.transform((v) => (v === "" ? undefined : v)).pipe(schema.optional());
const clearableText = (schema: z.ZodType<string, string>) =>
  text.transform((v) => (v === "" ? null : v)).pipe(schema.nullable());

const optionalNumber = (schema: z.ZodNumber) =>
  text.transform((v) => (v === "" ? undefined : asNumber(v))).pipe(schema.optional());
const clearableNumber = (schema: z.ZodNumber) =>
  text.transform((v) => (v === "" ? null : asNumber(v))).pipe(schema.nullable());

const phoneRule = z.string().regex(/^\+?\d{10,14}$/, "validation.phoneInvalid");

const nameEn = z.string().trim().min(1, "validation.nameEnRequired").min(2, "validation.nameMin").max(200);
// a school needs both names, whatever its language
const nameBn = z.string().trim().min(1, "validation.banglaNameRequired").min(2, "validation.nameMin").max(200);
const email = z.string().trim().min(1, "validation.emailRequired").pipe(z.email("validation.emailInvalid"));
const language = z.enum(["BN", "EN"]);
const feeRule = z.number("validation.numberInvalid").nonnegative("validation.feeNonNegative");
const discountRule = z
  .number("validation.numberInvalid")
  .min(0, "validation.discountRange")
  .max(100, "validation.discountRange");
// monthly or yearly subscription (a select, so text); required for a new school
const planRule = z.enum(["MONTHLY", "YEARLY"], "validation.planRequired");

export const createSchoolSchema = z.object({
  nameEn,
  nameBn,
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "validation.subdomainRequired")
    .regex(/^[a-z0-9-]{2,63}$/, "validation.subdomainFormat")
    .refine((v) => !RESERVED_SUBDOMAINS.has(v), "validation.subdomainReserved"),
  email,
  // shown on the public homepage; optional
  publicEmail: optionalText(z.email("validation.emailInvalid")),
  phone: text.transform((v) => (v === "" ? undefined : asPhone(v))).pipe(phoneRule.optional()),
  website: optionalText(z.url("validation.websiteInvalid")),
  address: optionalText(z.string().max(500)),
  language,
  subscriptionPlan: z.string().pipe(planRule),
  monthlyFee: optionalNumber(feeRule),
  yearlyFee: optionalNumber(feeRule),
  discount: optionalNumber(discountRule),
});

// The same form, editing. The subdomain is shown but not part of this schema, so
// zod drops it and it's never sent (it can't change). An emptied discount means 0
// (the server keeps no "no discount" value).
export const updateSchoolSchema = z.object({
  nameEn,
  nameBn,
  email,
  publicEmail: clearableText(z.email("validation.emailInvalid")),
  phone: text.transform((v) => (v === "" ? null : asPhone(v))).pipe(phoneRule.nullable()),
  website: clearableText(z.url("validation.websiteInvalid")),
  address: clearableText(z.string().max(500)),
  language,
  // a school activated before plans has none: left empty, it isn't sent (it stays as it is)
  subscriptionPlan: z
    .string()
    .transform((v) => (v === "" ? undefined : v))
    .pipe(planRule.optional()),
  monthlyFee: clearableNumber(feeRule),
  yearlyFee: clearableNumber(feeRule),
  discount: text.transform((v) => (v === "" ? 0 : asNumber(v))).pipe(discountRule),
});

// Both forms edit the same text inputs
export type SchoolFormInput = z.input<typeof createSchoolSchema>;
export type CreateSchoolValues = z.output<typeof createSchoolSchema>;
export type UpdateSchoolValues = z.output<typeof updateSchoolSchema>;
