import httpStatus from "http-status";
import { prisma } from "../../../../lib/prisma";
import { Prisma } from "../../../../generated/prisma/client";
import { AppError } from "../../errorHandler/AppError";
import type { CreateFeeTypePayload, UpdateFeeTypePayload } from "./feeType.type";
import { isUniqueViolation } from "../../utils/prismaError";
import { assertSchoolLanguageName, type Names } from "../../shared/names";
import { reconcileStructure } from "../feeStructure/feeStructure.service";


const assertUsableFund = async (schoolId: string, fundId: string) => {
  const fund = await prisma.fund.findFirst({
    where: { id: fundId, schoolId },
    select: { id: true, isActive: true },
  });
  if (!fund) throw new AppError("Fund not found for this school", httpStatus.NOT_FOUND);
  if (!fund.isActive) throw new AppError("Fund is inactive", httpStatus.BAD_REQUEST);
};

const DUPLICATE_MESSAGE = "A fee type with this name already exists";

/* "Tuition Fee" and "tuition fee" are the same name, in English and in Bangla. */
const assertNamesFree = async (schoolId: string, names: Names, excludeFeeTypeId?: string) => {
  const fields: Prisma.FeeTypeWhereInput[] = [];
  if (names.nameEn) fields.push({ nameEn: { equals: names.nameEn, mode: "insensitive" } });
  if (names.nameBn) fields.push({ nameBn: { equals: names.nameBn, mode: "insensitive" } });
  if (fields.length === 0) return;

  const clash = await prisma.feeType.findFirst({
    where: { schoolId, OR: fields, ...(excludeFeeTypeId ? { id: { not: excludeFeeTypeId } } : {}) },
    select: { id: true },
  });
  if (clash) throw new AppError(DUPLICATE_MESSAGE, httpStatus.CONFLICT);
};

const createFeeType = async (schoolId: string, data: CreateFeeTypePayload) => {
  await assertUsableFund(schoolId, data.fundId);
  await assertSchoolLanguageName(schoolId, data);
  await assertNamesFree(schoolId, data);

  try {
    // the unique indexes on the names are the final guard against two requests at once
    return await prisma.feeType.create({
      data: { schoolId, ...data, nameEn: data.nameEn ?? null, nameBn: data.nameBn ?? null },
      include: { fund: { select: { id: true, nameEn: true, nameBn: true } } },
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw new AppError(DUPLICATE_MESSAGE, httpStatus.CONFLICT);
    }
    throw e;
  }
};

const getFeeTypes = async (
  schoolId: string,
  opts: { includeInactive?: boolean; frequency?: "ONE_TIME" | "MONTHLY" },
) => {
  return prisma.feeType.findMany({
    where: {
      schoolId,
      ...(opts.includeInactive ? {} : { isActive: true }),
      ...(opts.frequency ? { frequency: opts.frequency } : {}),
    },
    include: { fund: { select: { id: true, nameEn: true, nameBn: true } } },
    orderBy: { createdAt: "asc" },
  });
};

const updateFeeType = async (
  schoolId: string,
  feeTypeId: string,
  data: UpdateFeeTypePayload,
) => {
  const feeType = await prisma.feeType.findFirst({ where: { id: feeTypeId, schoolId } });
  if (!feeType) throw new AppError("Fee type not found", httpStatus.NOT_FOUND);

  const fundChanged = data.fundId !== undefined && data.fundId !== feeType.fundId;
  const reactivating = data.isActive === true && !feeType.isActive;

  if (data.nameEn !== undefined || data.nameBn !== undefined) {
    await assertSchoolLanguageName(schoolId, {
      nameEn: data.nameEn !== undefined ? data.nameEn : feeType.nameEn,
      nameBn: data.nameBn !== undefined ? data.nameBn : feeType.nameBn,
    });
    await assertNamesFree(schoolId, { nameEn: data.nameEn, nameBn: data.nameBn }, feeTypeId);
  }
  if (fundChanged) await assertUsableFund(schoolId, data.fundId!);
  if (reactivating && !fundChanged) await assertUsableFund(schoolId, feeType.fundId);

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.feeType.update({
        where: { id: feeTypeId },
        data,
        include: { fund: { select: { id: true, nameEn: true, nameBn: true } } },
      });

      // Fees with nothing paid move to the new fund. Fees that already have money
      // keep their old fund, so their ledger entries stay consistent.
      let unpaidFeesMoved = 0;
      if (fundChanged) {
        const moved = await tx.studentFee.updateMany({
          where: { schoolId, feeTypeId, paidAmount: 0 },
          data: { fundId: data.fundId },
        });
        unpaidFeesMoved = moved.count;
      }

      // who pays changed: every class fee of this type is applied again, so new and old
      // students get (or lose, while unpaid) the fee by the new rule
      const sync = { removed: 0, updated: 0, blocked: 0 };
      if (data.appliesTo !== undefined && data.appliesTo !== feeType.appliesTo) {
        const structures = await tx.feeStructure.findMany({ where: { schoolId, feeTypeId, isActive: true }, select: { id: true } });
        for (const s of structures) {
          const r = await reconcileStructure(tx, schoolId, s.id);
          sync.removed += r.removed;
          sync.updated += r.updated;
          sync.blocked += r.blocked.length;
        }
      }

      return { feeType: updated, unpaidFeesMoved, sync };
    }, { maxWait: 10_000, timeout: 60_000 });
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw new AppError(DUPLICATE_MESSAGE, httpStatus.CONFLICT);
    }
    throw e;
  }
};

export const FeeTypeService = { createFeeType, getFeeTypes, updateFeeType };