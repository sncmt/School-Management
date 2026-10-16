import httpStatus from "http-status";
import { z } from "zod";
import type { Prisma, PrismaClient } from "../../../generated/prisma/client";
import { prisma } from "../../../lib/prisma";
import { AppError } from "../errorHandler/AppError";

/*
 * Names in two languages.
 *
 * - Schools and students: both names are required (their own validation).
 * - The platform's shared lists (NCTB subjects, national holidays): both required.
 * - Everything a school creates (groups, its own subjects, exams, holidays, period
 *   templates, final result formulas...): the name in the school's language is
 *   required, the other is optional and the apps fall back to it.
 *
 * Validation can't know the school's language, so the fields below accept either
 * name and the service calls assertSchoolLanguageNames() before saving.
 */

export type Names = { nameEn?: string | null; nameBn?: string | null };

/**
 * One optional name. "" and null mean "no name in this language" (null), and a
 * missing field means "leave it as it is" on an update (undefined).
 */
export const optionalName = (max = 100) =>
  z
    .string()
    .trim()
    .max(max, `A name can be at most ${max} characters`)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v || null));

/** nameEn + nameBn for a record a school creates. */
export const schoolLanguageNames = (max = 100) => ({ nameEn: optionalName(max), nameBn: optionalName(max) });

/** A record's name in the given language, falling back to the other one. */
export const nameIn = (language: "EN" | "BN", record: Names) =>
  (language === "BN" ? record.nameBn || record.nameEn : record.nameEn || record.nameBn) || "";

/** A record's name for messages and sorting: English if it has one, else Bangla. */
export const displayName = (record: Names) => record.nameEn || record.nameBn || "";

type Db = PrismaClient | Prisma.TransactionClient;

const LANGUAGE = {
  BN: { field: "nameBn", label: "Bangla" },
  EN: { field: "nameEn", label: "English" },
} as const;

/**
 * Each record must have its name in the school's language. Pass records as they
 * will be saved (for an update: current values merged with the change), each with
 * the path of its fields in the request body ("" at the top, "periods.2" in a list),
 * so the error lands on the right field in the form.
 */
export const assertSchoolLanguageNames = async (
  schoolId: string,
  records: { names: Names; path?: string }[],
  db: Db = prisma,
) => {
  const school = await db.school.findUnique({ where: { id: schoolId }, select: { language: true } });
  if (!school) throw new AppError("School not found", httpStatus.NOT_FOUND);

  const { field, label } = LANGUAGE[school.language];
  const missing = records.find((r) => !r.names[field]?.trim());
  if (!missing) return;

  const message = `${label} name is required: this school works in ${label}`;
  throw new AppError(message, httpStatus.BAD_REQUEST, [
    { path: missing.path ? `${missing.path}.${field}` : field, message },
  ]);
};

/** Shorthand for one record at the top of the request body. */
export const assertSchoolLanguageName = (schoolId: string, names: Names, db?: Db) =>
  assertSchoolLanguageNames(schoolId, [{ names }], db);
