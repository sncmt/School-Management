import httpStatus from "http-status";
import { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import {
  computeFeeStatus,
  expandMonthRange,
  feeAppliesTo,
  generateStudentFees,
  lockStudentFees,
  round2,
} from "../studentFee/studentFee.service";
import type { CreateFeeStructurePayload, ListFeeStructuresQuery } from "./feeStructure.type";
import type { CopyFeeStructuresPayload } from "./feeStructure.validation";

type TxClient = Prisma.TransactionClient;

type BlockedFee = {
  studentFeeId: string;
  studentId: string;
  month: number | null;
  paidAmount: string;
  reason: string;
};

/*
 * Makes already-generated StudentFee rows match the structure's current amounts.
 * - no payments and nothing to protect: the row is re-priced or removed
 * - money paid, payment history, or a discount larger than the new amount:
 *   the row is left alone and returned in `blocked` for a human to decide
 */
async function syncStructureFees(tx: TxClient, schoolId: string, feeStructureId: string) {
  const structure = await tx.feeStructure.findFirst({
    where: { id: feeStructureId, schoolId },
    include: { feeType: true, monthlyAmounts: true },
  });
  if (!structure) throw new AppError("Fee structure not found", httpStatus.NOT_FOUND);

  const isMonthly = structure.feeType.frequency === "MONTHLY";
  const scheduled = new Map(structure.monthlyAmounts.map((m) => [m.month, Number(m.amount)]));

  const expectedFor = (month: number | null): number | undefined => {
    if (!isMonthly) return Number(structure.amount);
    if (month === null) return undefined;
    return scheduled.size > 0 ? scheduled.get(month) : Number(structure.amount);
  };

  // locked first (as payments and discounts do), then read: a payment taken at this moment
  // waits, or is seen, so a fee just paid is never re-priced as unpaid
  const feeIds = (await tx.studentFee.findMany({ where: { schoolId, feeStructureId }, select: { id: true } })).map((f) => f.id);
  await lockStudentFees(tx, feeIds);
  const fees = await tx.studentFee.findMany({
    where: { id: { in: feeIds } },
    select: {
      id: true,
      studentId: true,
      academicYearId: true,
      month: true,
      amount: true,
      discountAmount: true,
      paidAmount: true,
      _count: { select: { allocations: true } },
    },
  });

  // new or old this year: a fee for new (or old) students only doesn't belong to the others
  const enrollments =
    structure.feeType.appliesTo === "ALL"
      ? []
      : await tx.enrollment.findMany({
          where: { academicYearId: structure.academicYearId, studentId: { in: [...new Set(fees.map((f) => f.studentId))] } },
          select: { studentId: true, admissionType: true },
        });
  const admissionTypeOf = new Map(enrollments.map((e) => [e.studentId, e.admissionType]));

  const removable: string[] = [];
  const updateGroups = new Map<string, { amount: number; status: string; ids: string[] }>();
  const blocked: BlockedFee[] = [];

  for (const fee of fees) {
    const block = (reason: string) =>
      blocked.push({
        studentFeeId: fee.id,
        studentId: fee.studentId,
        month: fee.month,
        paidAmount: fee.paidAmount.toString(),
        reason,
      });

    const paid = Number(fee.paidAmount);
    if (!feeAppliesTo(structure.feeType.appliesTo, admissionTypeOf.get(fee.studentId) ?? "NEW")) {
      if (paid > 0 || fee._count.allocations > 0) block("the student's admission type doesn't take this fee, but payments exist");
      else removable.push(fee.id);
      continue;
    }
    const expected = expectedFor(fee.month);

    if (expected === undefined) {
      if (paid > 0) block("month removed from schedule, but payments exist");
      else if (fee._count.allocations > 0) block("month removed from schedule, but it has payment history");
      else removable.push(fee.id);
      continue;
    }

    if (round2(Number(fee.amount)) === expected) continue;

    if (paid > 0) {
      block("amount changed, but payments exist");
      continue;
    }
    const discount = Number(fee.discountAmount);
    if (discount > expected) {
      block("existing discount is larger than the new amount");
      continue;
    }

    const status = computeFeeStatus(expected, discount, 0);
    const key = `${expected}:${status}`;
    const group = updateGroups.get(key) ?? { amount: expected, status, ids: [] };
    group.ids.push(fee.id);
    updateGroups.set(key, group);
  }

  if (removable.length > 0) {
    await tx.studentFee.deleteMany({ where: { id: { in: removable } } });
  }

  let updated = 0;
  for (const group of updateGroups.values()) {
    await tx.studentFee.updateMany({
      where: { id: { in: group.ids } },
      data: { amount: group.amount, status: group.status as any },
    });
    updated += group.ids.length;
  }

  return { removed: removable.length, updated, blocked };
}

/* Assign the structure to everyone enrolled in the class, then reconcile existing rows. */
export async function reconcileStructure(tx: TxClient, schoolId: string, feeStructureId: string) {
  const structure = await tx.feeStructure.findFirst({
    where: { id: feeStructureId, schoolId },
    select: { academicYearId: true, classId: true },
  });
  if (!structure) throw new AppError("Fee structure not found", httpStatus.NOT_FOUND);

  const enrollments = await tx.enrollment.findMany({
    where: {
      academicYearId: structure.academicYearId,
      classId: structure.classId,
      status: "ACTIVE",
      // students who left (inactive, graduated) get no new fees
      student: { schoolId, status: { in: ["ACTIVE", "SUSPENDED"] } },
    },
    select: { studentId: true },
  });

  await generateStudentFees(tx, {
    schoolId,
    studentIds: enrollments.map((e) => e.studentId),
    academicYearId: structure.academicYearId,
    classId: structure.classId,
  });

  return syncStructureFees(tx, schoolId, feeStructureId);
}

const TX_OPTIONS = { maxWait: 10_000, timeout: 60_000 };

const createFeeStructure = async (schoolId: string, data: CreateFeeStructurePayload) => {
  const [academicYear, schoolClass, feeType] = await Promise.all([
    prisma.academicYear.findFirst({ where: { id: data.academicYearId, schoolId } }),
    prisma.schoolClass.findFirst({ where: { id: data.classId, schoolId } }),
    prisma.feeType.findFirst({ where: { id: data.feeTypeId, schoolId } }),
  ]);
  if (!academicYear) throw new AppError("Academic year not found for this school", httpStatus.NOT_FOUND);
  if (!schoolClass) throw new AppError("Class not found for this school", httpStatus.NOT_FOUND);
  if (!feeType) throw new AppError("Fee type not found for this school", httpStatus.NOT_FOUND);
  if (!feeType.isActive) throw new AppError("Fee type is inactive", httpStatus.BAD_REQUEST);

  const schedule = data.monthlySchedule ?? [];
  if (schedule.length > 0 && feeType.frequency !== "MONTHLY") {
    throw new AppError("A monthly schedule only applies to MONTHLY fee types", httpStatus.BAD_REQUEST);
  }

  const amountByMonth = new Map<number, number>();
  for (const period of schedule) {
    for (const month of expandMonthRange(period.fromMonth, period.toMonth)) {
      if (amountByMonth.has(month)) {
        throw new AppError(`Month ${month} appears in more than one period`, httpStatus.BAD_REQUEST);
      }
      amountByMonth.set(month, period.amount);
    }
  }

  const baseAmount = data.amount ?? schedule[0]?.amount;
  if (baseAmount === undefined) {
    throw new AppError("Either amount or monthlySchedule is required", httpStatus.BAD_REQUEST);
  }

  return prisma.$transaction(async (tx) => {
    const structure = await tx.feeStructure.upsert({
      where: {
        schoolId_academicYearId_classId_feeTypeId: {
          schoolId,
          academicYearId: data.academicYearId,
          classId: data.classId,
          feeTypeId: data.feeTypeId,
        },
      },
      update: { amount: baseAmount, isActive: true },
      create: {
        schoolId,
        academicYearId: data.academicYearId,
        classId: data.classId,
        feeTypeId: data.feeTypeId,
        amount: baseAmount,
      },
    });

    // the schedule is configuration only, so replacing it wholesale is safe
    await tx.feeStructureMonth.deleteMany({ where: { feeStructureId: structure.id } });
    if (amountByMonth.size > 0) {
      await tx.feeStructureMonth.createMany({
        data: [...amountByMonth].map(([month, amount]) => ({
          feeStructureId: structure.id,
          month,
          amount,
        })),
      });
    }

    const sync = await reconcileStructure(tx, schoolId, structure.id);

    const saved = await tx.feeStructure.findUnique({
      where: { id: structure.id },
      include: { monthlyAmounts: { orderBy: { month: "asc" } } },
    });

    return { structure: saved, sync };
  }, TX_OPTIONS);
};

const getFeeStructures = async (schoolId: string, filters: ListFeeStructuresQuery) => {
  return prisma.feeStructure.findMany({
    where: {
      schoolId,
      ...(filters.academicYearId ? { academicYearId: filters.academicYearId } : {}),
      ...(filters.classId ? { classId: filters.classId } : {}),
    },
    include: {
      feeType: { include: { fund: { select: { id: true, nameEn: true, nameBn: true } } } },
      schoolClass: { select: { id: true, name: true } },
      monthlyAmounts: { orderBy: { month: "asc" } },
    },
    orderBy: [{ schoolClass: { numericLevel: "asc" } }, { feeType: { createdAt: "asc" } }],
  });
};

/* Repair tool: re-assign missing fees and re-price existing ones for one structure. */
const syncFeeStructure = async (schoolId: string, feeStructureId: string) => {
  return prisma.$transaction((tx) => reconcileStructure(tx, schoolId, feeStructureId), TX_OPTIONS);
};

/*
 * A new year's class fees from an earlier year (the one just before, by default): every
 * class's fee the new year doesn't have yet, with the same amounts and monthly schedule.
 * Fees already set for the new year stay as they are; inactive fee types are left out.
 * Each copied fee is then given to the students already enrolled in the new year.
 */
const copyFromYear = async (schoolId: string, data: CopyFeeStructuresPayload) =>
  prisma.$transaction(async (tx) => {
    const to = await tx.academicYear.findFirst({ where: { id: data.toAcademicYearId, schoolId } });
    if (!to) throw new AppError("Academic year not found for this school", httpStatus.NOT_FOUND);
    const from = data.fromAcademicYearId
      ? await tx.academicYear.findFirst({ where: { id: data.fromAcademicYearId, schoolId } })
      : await tx.academicYear.findFirst({ where: { schoolId, startDate: { lt: to.startDate } }, orderBy: { startDate: "desc" } });
    if (!from) throw new AppError("There is no earlier academic year to copy from", httpStatus.BAD_REQUEST);
    if (from.id === to.id) throw new AppError("Choose a different year to copy from", httpStatus.BAD_REQUEST);

    const source = await tx.feeStructure.findMany({
      where: { schoolId, academicYearId: from.id, isActive: true, feeType: { isActive: true } },
      include: { monthlyAmounts: true },
    });
    const existing = await tx.feeStructure.findMany({ where: { schoolId, academicYearId: to.id }, select: { classId: true, feeTypeId: true } });
    const taken = new Set(existing.map((s) => `${s.classId}:${s.feeTypeId}`));
    const toCopy = source.filter((s) => !taken.has(`${s.classId}:${s.feeTypeId}`));

    for (const s of toCopy) {
      const copy = await tx.feeStructure.create({
        data: {
          schoolId,
          academicYearId: to.id,
          classId: s.classId,
          feeTypeId: s.feeTypeId,
          amount: s.amount,
          monthlyAmounts: { create: s.monthlyAmounts.map((m) => ({ month: m.month, amount: m.amount })) },
        },
      });
      await reconcileStructure(tx, schoolId, copy.id);
    }
    // students of the new year who now have class fees
    const studentsWithFees = (
      await tx.studentFee.groupBy({ by: ["studentId"], where: { schoolId, academicYearId: to.id, feeStructureId: { not: null } } })
    ).length;

    return {
      from: { id: from.id, name: from.name },
      to: { id: to.id, name: to.name },
      copied: toCopy.length,
      // already set in the new year, so left as they are
      skipped: source.length - toCopy.length,
      studentsWithFees,
    };
  }, { maxWait: 10_000, timeout: 180_000 });

export const FeeStructureService = { createFeeStructure, getFeeStructures, syncFeeStructure, copyFromYear };