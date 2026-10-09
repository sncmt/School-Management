import { z } from "zod";
import { withFilters } from "../../utils/querySchema";
import { SchoolStatus } from "../../../../generated/prisma/enums";
import { caseInsensitiveEnum } from "../../utils/caseInsensitiveEnum";
import { emailSchema } from "../../utils/identity";

const schoolStatusValues = Object.values(SchoolStatus) as [string, ...string[]];

const RESERVED_SUBDOMAINS = new Set([
  "www", "admin", "api", "app", "mail", "static", "cdn", "dashboard", "support", "help", "docs", "status",
]);

export const createSchoolSchema = z.object({
    nameEn: z.string().min(2).max(200),
    nameBn: z.string().min(2).max(200).optional(), 
    subdomain: z
      .string()
      .min(2)
      .max(63)
      .regex(/^[a-z0-9-]+$/, "Subdomain must be lowercase letters, numbers, hyphens only")
      .refine((v) => !RESERVED_SUBDOMAINS.has(v), "This subdomain is reserved"),
    email: emailSchema,
    phone: z.string().min(10).max(15).optional(),
    website: z.string().url().optional(),
    address: z.string().optional(),
    language: z.enum(["EN", "BN"]).optional(),
    monthlyFee: z.number().nonnegative().optional(),
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
    nameBn: z.string().trim().min(2).max(200).nullable().optional(),
    email: emailSchema.optional(),
    phone: z.string().trim().min(10).max(15).nullable().optional(),
    website: z.string().url().nullable().optional(),
    address: z.string().trim().max(500).nullable().optional(),
    language: z.enum(["EN", "BN"]).optional(),
    monthlyFee: z.number().nonnegative().nullable().optional(),
    discount: z.number().min(0).max(100).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, "Nothing to update");

// PENDING -> ACTIVE goes through /activate, which also creates the super admin
const changeSchoolStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "INACTIVE"]),
});

export const SchoolValidation = {
  createSchoolSchema,
  activateSchoolSchema,
  createSchoolSuperAdminSchema,
  getAllSchoolsQuerySchema,
  publicSiteParamsSchema,
  schoolIdParamsSchema,
  updateSchoolSchema,
  changeSchoolStatusSchema,
};
