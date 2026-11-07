import httpStatus from "http-status";
import { Prisma } from "../../../../generated/prisma/client";
import type { SubscriptionPlan } from "../../../../generated/prisma/enums";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { isUniqueViolation } from "../../utils/prismaError";
import type { CreatePackagePayload, UpdatePackagePayload } from "./package.validation";

/*
 * The platform's subscription packages: a student limit and a price a month. Every package
 * includes all the free modules. A school pays its package's price a month (monthly plan) or
 * twelve times it a year (yearly plan), less its own discount. Prices can change: a school
 * pays the package's price of the day; payments already recorded keep their own amount.
 */

type Db = Prisma.TransactionClient | typeof prisma;

const round2 = (d: Prisma.Decimal) => d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

/** What a school on this package and plan pays a period (a month or a year), with its discount. */
export const priceOf = (
  pkg: { monthlyPrice: Prisma.Decimal | string | number },
  plan: SubscriptionPlan | null,
  discountPercent: Prisma.Decimal | string | number = 0,
) => {
  const monthly = new Prisma.Decimal(pkg.monthlyPrice);
  const yearly = monthly.times(12);
  const discount = new Prisma.Decimal(discountPercent);
  const off = (amount: Prisma.Decimal) => round2(amount.minus(amount.times(discount).dividedBy(100)));
  const base = plan === "YEARLY" ? yearly : monthly;
  return {
    monthly: monthly.toFixed(2),
    yearly: yearly.toFixed(2),
    discount: discount.toFixed(2),
    // the plan's price after the discount (null: the school has no plan yet)
    due: plan ? off(base).toFixed(2) : null,
  };
};

/** The ACTIVE students a school has (what a package's limit counts). */
export const activeStudents = (db: Db, schoolId: string) => db.student.count({ where: { schoolId, status: "ACTIVE" } });

/*
 * Before a student becomes active (admitted, or back): the school's package must have room.
 * The school row is locked meanwhile, so two admissions at once can't both take the last place.
 * A school with no package (made before packages) has no limit.
 */
export const assertStudentRoom = async (tx: Prisma.TransactionClient, schoolId: string) => {
  await tx.$queryRaw`SELECT "id" FROM "School" WHERE "id" = ${schoolId} FOR UPDATE`;
  const school = await tx.school.findUnique({ where: { id: schoolId }, select: { package: { select: { name: true, maxStudents: true } } } });
  const limit = school?.package?.maxStudents;
  if (limit == null) return;
  const count = await activeStudents(tx, schoolId);
  if (count >= limit) {
    throw new AppError(
      `Your ${school!.package!.name} package allows up to ${limit} active students (you have ${count}). Ask the platform to move you to a bigger package`,
      httpStatus.FORBIDDEN,
    );
  }
};

const shape = <T extends { monthlyPrice: Prisma.Decimal }>(p: T) => ({ ...p, monthlyPrice: p.monthlyPrice.toFixed(2), yearlyPrice: p.monthlyPrice.times(12).toFixed(2) });

/* Every package, in order, with how many schools are on each. */
const listPackages = async () => {
  const rows = await prisma.subscriptionPackage.findMany({
    orderBy: [{ sortOrder: "asc" }, { monthlyPrice: "asc" }],
    include: { _count: { select: { schools: true } } },
  });
  return rows.map(({ _count, ...p }) => ({ ...shape(p), schools: _count.schools }));
};

const findPackage = async (packageId: string) => {
  const pkg = await prisma.subscriptionPackage.findUnique({ where: { id: packageId } });
  if (!pkg) throw new AppError("Package not found", httpStatus.NOT_FOUND);
  return pkg;
};

const createPackage = async (data: CreatePackagePayload) => {
  try {
    return shape(await prisma.subscriptionPackage.create({ data }));
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("A package with this code already exists", httpStatus.CONFLICT);
    throw e;
  }
};

/* Name, limit, price, on / off. A new price applies to payments recorded from now on. */
const updatePackage = async (packageId: string, data: UpdatePackagePayload) => {
  await findPackage(packageId);
  return shape(await prisma.subscriptionPackage.update({ where: { id: packageId }, data }));
};

/* Only a package no school was ever put on (a mistake); otherwise switch it off. */
const deletePackage = async (packageId: string) => {
  await findPackage(packageId);
  const schools = await prisma.school.count({ where: { packageId } });
  if (schools > 0) throw new AppError(`${schools} school(s) are on this package. Switch it off instead`, httpStatus.CONFLICT);
  await prisma.subscriptionPackage.delete({ where: { id: packageId } });
  return { id: packageId };
};

/** A package a school can be put on now (it must exist and be switched on), or a 400. */
export const assertChoosablePackage = async (db: Db, packageId: string) => {
  const pkg = await db.subscriptionPackage.findUnique({ where: { id: packageId }, select: { id: true, isActive: true } });
  if (!pkg) throw new AppError("Package not found", httpStatus.BAD_REQUEST);
  if (!pkg.isActive) throw new AppError("This package is switched off. Choose another one", httpStatus.BAD_REQUEST);
};

export const PackageService = { listPackages, createPackage, updatePackage, deletePackage };
