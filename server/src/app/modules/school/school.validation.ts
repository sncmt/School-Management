import { z } from "zod";
import { withFilters } from "../../utils/querySchema";
import { SchoolStatus, SubscriptionPlan } from "../../../../generated/prisma/enums";
import { caseInsensitiveEnum } from "../../utils/caseInsensitiveEnum";
import { emailSchema } from "../../utils/identity";

const schoolStatusValues = Object.values(SchoolStatus) as [string, ...string[]];

// a web address: http(s) only (zod's url() also takes javascript:, data: and the like)
const websiteSchema = z
  .string()
  .url()
  .refine((v) => /^https?:\/\//i.test(v), "Enter a web address starting with http:// or https://");

const RESERVED_SUBDOMAINS = new Set([
  "www", "admin", "api", "app", "mail", "static", "cdn", "dashboard", "support", "help", "docs", "status",
]);

export const createSchoolSchema = z.object({
    // a school needs both names, whatever its language
    nameEn: z.string({ error: "English name is required!" }).trim().min(2, "English name is required!").max(200),
    nameBn: z.string({ error: "Bangla name is required!" }).trim().min(2, "Bangla name is required!").max(200),
    subdomain: z
      .string()
      .min(2)
      .max(63)
      .regex(/^[a-z0-9-]+$/, "Subdomain must be lowercase letters, numbers, hyphens only")
      .refine((v) => !RESERVED_SUBDOMAINS.has(v), "This subdomain is reserved"),
    email: emailSchema,
    // shown on the public homepage (the email above is the super admin's login)
    publicEmail: emailSchema.optional(),
    phone: z.string().min(10).max(15).optional(),
    website: websiteSchema.optional(),
    address: z.string().optional(),
    language: z.enum(["EN", "BN"]).optional(),
    // monthly or yearly, and the package (student limit and price a month: yearly is twelve times it)
    subscriptionPlan: z.enum(SubscriptionPlan, { error: "Choose monthly or yearly" }),
    packageId: z.string({ error: "Choose a package" }).trim().min(1, "Choose a package"),
    // a percentage off the package's price
    discount: z.number().min(0).max(100).optional(),
});


const activateSchoolSchema = z.object({
    schoolId: z.string().min(1, "School id is required!")
})
const createSchoolSuperAdminSchema = z.object({
  fullname: z.string().min(2).max(120),
  email: emailSchema,
})

const publicSiteParamsSchema = z.object({
  subdomain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,63}$/, "Invalid subdomain"),
});

// only these columns can be sorted on; anything else would reach Prisma as a bad field
const SCHOOL_SORT_FIELDS = ["createdAt", "nameEn", "subdomain", "status", "activationDate"] as const;

const getAllSchoolsQuerySchema = withFilters({
  status: caseInsensitiveEnum(schoolStatusValues).optional(),
  sortBy: z.enum(SCHOOL_SORT_FIELDS).optional(),
});

const schoolIdParamsSchema = z.object({
  schoolId: z.string().min(1, "School id is required!").max(64),
});

/*
 * Editing a school: every field but the subdomain, which is the school's
 * address (its users' links and cookies depend on it). null clears an
 * optional field. The email is also the super admin's login, so the service
 * only lets it change before activation.
 */
const updateSchoolSchema = z
  .object({
    nameEn: z.string().trim().min(2).max(200).optional(),
    nameBn: z.string().trim().min(2).max(200).optional(), // required, so it can change but not be cleared
    email: emailSchema.optional(),
    publicEmail: emailSchema.nullable().optional(),
    phone: z.string().trim().min(10).max(15).nullable().optional(),
    website: websiteSchema.nullable().optional(),
    address: z.string().trim().max(500).nullable().optional(),
    language: z.enum(["EN", "BN"]).optional(),
    // can change, not be cleared (payments already recorded keep their own plan and amount)
    subscriptionPlan: z.enum(SubscriptionPlan).optional(),
    packageId: z.string().trim().min(1).optional(),
    discount: z.number().min(0).max(100).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, "Nothing to update");

// PENDING -> ACTIVE goes through /activate, which also creates the super admin
const changeSchoolStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "INACTIVE"]),
});

// the platform admin and a school's people
const schoolUsersQuery = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  role: z.enum(["SUPER_ADMIN", "TEACHER", "STAFF", "GUARDIAN"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
const schoolUserParams = z.object({
  schoolId: z.string().min(1, "School id is required!").max(64),
  userId: z.string().trim().min(1).max(64),
});
// left out: one is made up (and shown once); 72 is bcrypt's limit
const setUserPassword = z.strictObject({
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be at most 72 characters").optional(),
});
const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SchoolUsersQuery = z.infer<typeof schoolUsersQuery>;
export type SetUserPasswordPayload = z.infer<typeof setUserPassword>;

export const SchoolValidation = {
  schoolUsersQuery,
  schoolUserParams,
  setUserPassword,
  pageQuery,
  createSchoolSchema,
  activateSchoolSchema,
  createSchoolSuperAdminSchema,
  getAllSchoolsQuerySchema,
  publicSiteParamsSchema,
  schoolIdParamsSchema,
  updateSchoolSchema,
  changeSchoolStatusSchema,
};
