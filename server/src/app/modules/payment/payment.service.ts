import httpStatus from "http-status";
import { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { displayName, type Names } from "../../shared/names";
import { fileUrl } from "../../shared/storage";
import { getFundBalance, lockFund } from "../fund/fund.ledger";
import { NotificationService, notifyInBackground } from "../notification/notification.service";
import { computeFeeStatus, currentMonth, lockStudentFees, round2 } from "../studentFee/studentFee.service";
import type {
  CancelPaymentPayload,
  ListPaymentsQuery,
  RecordPaymentPayload,
} from "./payment.type";

type Db = Prisma.TransactionClient;

const ZERO = new Prisma.Decimal(0);
const TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const feeLabel = (fee: {
  month: number | null;
  year: number | null;
  description?: string | null;
  feeType: Names;
}) => {
  const base =
    fee.month && fee.year
      ? `${displayName(fee.feeType)} (${MONTHS[fee.month - 1]} ${fee.year})`
      : displayName(fee.feeType);
  return fee.description ? `${base} - ${fee.description}` : base;
};

const amountsOf = (fee: {
  amount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
}) => {
  const payable = fee.amount.minus(fee.discountAmount);
  return { payable, remaining: payable.minus(fee.paidAmount) };
};

const paymentInclude = {
  student: { select: { id: true, nameEn: true, nameBn: true, admissionNo: true } },
  allocations: {
    orderBy: { createdAt: "asc" },
    include: {
      studentFee: {
        select: {
          id: true,
          month: true,
          year: true,
          // a custom fee's note ("Late fine"), shown on the receipt
          description: true,
          // a one-time fee from another year shows its year
          academicYear: { select: { id: true, name: true } },
          feeType: { select: { id: true, nameEn: true, nameBn: true } },
          fund: { select: { id: true, nameEn: true, nameBn: true } },
        },
      },
    },
  },
} satisfies Prisma.PaymentInclude;

const getPaymentDetail = async (db: Db, schoolId: string, paymentId: string) => {
  const payment = await db.payment.findFirst({
    where: { id: paymentId, schoolId },
    include: paymentInclude,
  });
  if (!payment) throw new AppError("Payment not found", httpStatus.NOT_FOUND);
  return payment;
};

// ------------------------------------------------------------ collect screen

/*
 * Everything a student still owes, oldest first, so the cashier can tick what
 * is being paid today. One-time fees (admission, fines...) come first. With
 * paidYearId, that year's paid and waived fees are listed too (nothing left to pay on them).
 */
const getPayableFees = async (
  schoolId: string,
  studentId: string,
  opts: { academicYearId?: string; paidYearId?: string },
) => {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    select: { id: true, nameEn: true, nameBn: true, admissionNo: true },
  });
  if (!student) throw new AppError("Student not found", httpStatus.NOT_FOUND);

  const fees = await prisma.studentFee.findMany({
    where: {
      schoolId,
      studentId,
      OR: [
        { status: { in: ["UNPAID", "PARTIAL"] }, ...(opts.academicYearId ? { academicYearId: opts.academicYearId } : {}) },
        ...(opts.paidYearId ? [{ status: { in: ["PAID" as const, "WAIVED" as const] }, academicYearId: opts.paidYearId }] : []),
      ],
    },
    orderBy: [
      { year: { sort: "asc", nulls: "first" } },
      { month: "asc" },
      { createdAt: "asc" },
      { id: "asc" },
    ],
    include: {
      feeType: { select: { id: true, nameEn: true, nameBn: true, frequency: true } },
      academicYear: { select: { id: true, name: true } },
      fund: { select: { id: true, nameEn: true, nameBn: true } },
    },
  });

  // due = the fee's month has started in Bangladesh
  const now = currentMonth();
  let totalRemaining = ZERO;
  let totalDue = ZERO;

  const items = fees.map((fee) => {
    const { payable, remaining } = amountsOf(fee);
    const isDue =
      fee.month === null ||
      fee.year === null ||
      fee.year < now.year ||
      (fee.year === now.year && fee.month <= now.month);

    totalRemaining = totalRemaining.plus(remaining);
    if (isDue) totalDue = totalDue.plus(remaining);

    return {
      ...fee,
      label: feeLabel(fee),
      payable: round2(Number(payable)),
      remaining: round2(Number(remaining)),
      isDue,
    };
  });

  return {
    student,
    items,
    summary: {
      totalRemaining: totalRemaining.toFixed(2), // everything still unpaid, including future months
      totalDue: totalDue.toFixed(2), // only fees whose month has started
    },
  };
};

// ------------------------------------------------------------ record payment

/*
 * The next money receipt number of the school for the payment's year (in Bangladesh):
 * "2026-000123". The counter row is locked by the update, so two cashiers at the same
 * moment get different numbers; a cancelled payment keeps its number.
 */
const nextReceiptNo = async (tx: Db, schoolId: string, paidAt: Date) => {
  const year = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric" }).format(paidAt);
  const seq = await tx.schoolSequence.upsert({
    where: { schoolId_key: { schoolId, key: `receipt:${year}` } },
    update: { value: { increment: 1 } },
    create: { schoolId, key: `receipt:${year}`, value: 1 },
  });
  return `${year}-${String(seq.value).padStart(6, "0")}`;
};

const recordPayment = async (schoolId: string, userId: string, data: RecordPaymentPayload) => {
  const { studentId, method, allocations } = data;
  const transactionRef = method === "MOBILE_BANKING" ? data.transactionRef : undefined;
  const paidAt = data.paidAt ?? new Date();
  const feeIds = allocations.map((a) => a.studentFeeId);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const student = await tx.student.findFirst({
        where: { id: studentId, schoolId },
        select: { id: true, admissionNo: true },
      });
      if (!student) throw new AppError("Student not found", httpStatus.NOT_FOUND);

      // Lock the fee rows first (in id order, so two cashiers can't deadlock), then
      // read them. A second payment on the same fee waits here and then sees the
      // amounts this one wrote, so the remaining-due check below can't be fooled.
      await lockStudentFees(tx, feeIds);

      const fees = await tx.studentFee.findMany({
        where: { id: { in: feeIds }, schoolId, studentId },
        include: {
          feeType: { select: { nameEn: true, nameBn: true } },
          fund: { select: { nameEn: true, nameBn: true, isActive: true } },
        },
      });
      if (fees.length !== feeIds.length) {
        throw new AppError("One or more fees were not found for this student", httpStatus.NOT_FOUND);
      }
      const feeMap = new Map(fees.map((f) => [f.id, f]));

      const lines = allocations.map((a) => {
        const fee = feeMap.get(a.studentFeeId)!;
        const label = feeLabel(fee);
        const { remaining } = amountsOf(fee);

        if (!fee.fund.isActive) {
          throw new AppError(
            `${label}: fund "${displayName(fee.fund)}" is inactive. Reactivate it before taking this payment`,
            httpStatus.BAD_REQUEST,
          );
        }
        if (remaining.lte(0)) {
          throw new AppError(`${label} has nothing left to pay`, httpStatus.BAD_REQUEST);
        }

        const amount = a.amount === undefined ? remaining : new Prisma.Decimal(a.amount);
        if (amount.gt(remaining)) {
          throw new AppError(
            `${label}: amount is more than the remaining due (${remaining.toFixed(2)})`,
            httpStatus.BAD_REQUEST,
          );
        }
        return { fee, amount, newPaid: fee.paidAmount.plus(amount) };
      });

      const total = lines.reduce((sum, l) => sum.plus(l.amount), ZERO);

      const payment = await tx.payment.create({
        data: {
          schoolId,
          receiptNo: await nextReceiptNo(tx, schoolId, paidAt),
          studentId,
          amount: total,
          method,
          transactionRef,
          receivedBy: userId, // always the logged-in user, never taken from the request
          paidAt,
        },
      });

      const allocationRows = await tx.paymentAllocation.createManyAndReturn({
        data: lines.map((l) => ({ paymentId: payment.id, studentFeeId: l.fee.id, amount: l.amount })),
        select: { id: true, studentFeeId: true },
      });
      const allocationIdByFee = new Map(allocationRows.map((r) => [r.studentFeeId, r.id]));

      // one ledger entry per line, in that fee's own fund
      await tx.fundTransaction.createMany({
        data: lines.map((l) => ({
          schoolId,
          fundId: l.fee.fundId,
          type: "INCOME" as const,
          source: "PAYMENT" as const,
          amount: l.amount,
          transactionDate: paidAt,
          description: `Fee payment (${student.admissionNo}): ${feeLabel(l.fee)}`,
          paymentAllocationId: allocationIdByFee.get(l.fee.id)!,
          createdBy: userId,
        })),
      });

      for (const l of lines) {
        await tx.studentFee.update({
          where: { id: l.fee.id },
          data: {
            paidAmount: l.newPaid,
            status: computeFeeStatus(
              Number(l.fee.amount),
              Number(l.fee.discountAmount),
              Number(l.newPaid),
            ),
          },
        });
      }

      return getPaymentDetail(tx, schoolId, payment.id);
    }, TX_OPTIONS);

    notifyInBackground("payment", () => NotificationService.notifyPayment(schoolId, result.id, "PAYMENT_RECEIVED"));
    return result;
  } catch (e) {
    // the partial unique index on (schoolId, transactionRef) for successful payments
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new AppError(
        "This transaction reference has already been used for another payment",
        httpStatus.CONFLICT,
      );
    }
    throw e;
  }
};

// ----------------------------------------------------------- cancel payment

/*
 * Cancels a whole payment by reversal: the payment is kept and marked CANCELLED,
 * every fee goes back to what it was, and each fund gets an opposite ledger entry.
 * It is refused if a fund no longer holds the money (already spent or transferred),
 * because the balance would go negative.
 */
const cancelPayment = async (
  schoolId: string,
  userId: string,
  paymentId: string,
  data: CancelPaymentPayload,
) => {
  const result = await prisma.$transaction(async (tx) => {
    // lock the payment so two simultaneous cancels can't both go through
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Payment"
      WHERE "id" = ${paymentId} AND "schoolId" = ${schoolId}
      FOR UPDATE`;
    if (locked.length === 0) throw new AppError("Payment not found", httpStatus.NOT_FOUND);

    const payment = await tx.payment.findUniqueOrThrow({
      where: { id: paymentId },
      include: { allocations: true },
    });
    if (payment.status === "CANCELLED") {
      throw new AppError("This payment is already cancelled", httpStatus.CONFLICT);
    }

    const allocationIds = payment.allocations.map((a) => a.id);
    const feeIds = payment.allocations.map((a) => a.studentFeeId);

    await lockStudentFees(tx, feeIds);
    const fees = await tx.studentFee.findMany({ where: { id: { in: feeIds } } });
    const feeMap = new Map(fees.map((f) => [f.id, f]));

    // reverse exactly what was written when the payment was taken
    const originals = await tx.fundTransaction.findMany({
      where: { schoolId, source: "PAYMENT", paymentAllocationId: { in: allocationIds } },
    });
    if (originals.length !== allocationIds.length) {
      throw new AppError(
        "Ledger entries for this payment are missing, so it cannot be reversed",
        httpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const reversalByFund = new Map<string, Prisma.Decimal>();
    for (const o of originals) {
      reversalByFund.set(o.fundId, (reversalByFund.get(o.fundId) ?? ZERO).plus(o.amount));
    }

    // lock funds in id order, then make sure each can give the money back
    const fundIds = [...reversalByFund.keys()].sort();
    for (const fundId of fundIds) await lockFund(tx, schoolId, fundId);

    const funds = await tx.fund.findMany({
      where: { id: { in: fundIds } },
      select: { id: true, nameEn: true, nameBn: true },
    });
    const fundName = new Map(funds.map((f) => [f.id, displayName(f)]));

    for (const fundId of fundIds) {
      const balance = await getFundBalance(tx, schoolId, fundId);
      const needed = reversalByFund.get(fundId)!;
      if (balance.lt(needed)) {
        throw new AppError(
          `Cannot cancel: fund "${fundName.get(fundId)}" holds ${balance.toFixed(2)} but ${needed.toFixed(2)} must be returned. Deposit the difference first`,
          httpStatus.BAD_REQUEST,
        );
      }
    }

    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancelReason: data.reason,
      },
    });

    // a cancelled online receipt: its money is with the school's SSLCommerz account, to give
    // back. A refund already given stays given: only this receipt's amount is to refund, and
    // the earlier refund is kept in the note.
    if (payment.method === "ONLINE") {
      const online = await tx.onlinePayment.findFirst({ where: { paymentId, schoolId } });
      if (online) {
        const day = (d: Date) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium" }).format(d);
        await tx.onlinePayment.update({
          where: { id: online.id },
          data: online.refundedAt
            ? {
                refundAmount: payment.amount,
                refundedAt: null,
                refundNote: `${online.refundAmount.toFixed(2)} already refunded on ${day(online.refundedAt)}${online.refundNote ? `: ${online.refundNote}` : ""}`.slice(0, 300),
              }
            : { refundAmount: online.refundAmount.plus(payment.amount) },
        });
      }
    }

    for (const a of payment.allocations) {
      const fee = feeMap.get(a.studentFeeId)!;
      const newPaid = fee.paidAmount.minus(a.amount);
      if (newPaid.lt(0)) {
        throw new AppError("Fee amounts are inconsistent", httpStatus.INTERNAL_SERVER_ERROR);
      }
      await tx.studentFee.update({
        where: { id: fee.id },
        data: {
          paidAmount: newPaid,
          status: computeFeeStatus(Number(fee.amount), Number(fee.discountAmount), Number(newPaid)),
        },
      });
    }

    await tx.fundTransaction.createMany({
      data: originals.map((o) => ({
        schoolId,
        fundId: o.fundId,
        type: "EXPENSE" as const,
        source: "PAYMENT_REVERSAL" as const,
        amount: o.amount,
        description: `Cancelled payment: ${data.reason}`,
        paymentAllocationId: o.paymentAllocationId,
        createdBy: userId,
      })),
    });

    return getPaymentDetail(tx, schoolId, paymentId);
  }, TX_OPTIONS);

  notifyInBackground("payment cancelled", () => NotificationService.notifyPayment(schoolId, paymentId, "PAYMENT_CANCELLED"));
  return result;
};

// ------------------------------------------------------------------- reading

const getPaymentById = async (schoolId: string, paymentId: string) =>
  getPaymentDetail(prisma, schoolId, paymentId);

/*
 * Everything a printed money receipt shows: the school's header, the student with their
 * class and roll in the year of the fees, each fee line, who received the money, and
 * whether the payment was cancelled.
 */
const getReceipt = async (schoolId: string, paymentId: string) => {
  const payment = await getPaymentDetail(prisma, schoolId, paymentId);

  const feeYearIds = await prisma.studentFee.findMany({
    where: { id: { in: payment.allocations.map((a) => a.studentFee.id) } },
    select: { academicYearId: true },
    distinct: ["academicYearId"],
  });
  const [school, enrollment, receivedBy, student] = await Promise.all([
    prisma.school.findUnique({
      where: { id: schoolId },
      select: { nameEn: true, nameBn: true, logo: true, address: true, phone: true, email: true, language: true },
    }),
    // the class the fees belong to (the latest year when they span years)
    prisma.enrollment.findFirst({
      where: { studentId: payment.studentId, academicYearId: { in: feeYearIds.map((y) => y.academicYearId) } },
      orderBy: { academicYear: { startDate: "desc" } },
      select: {
        rollNumber: true,
        academicYear: { select: { id: true, name: true } },
        class: { select: { name: true } },
        section: { select: { name: true, isDefault: true } },
      },
    }),
    payment.receivedBy ? prisma.user.findUnique({ where: { id: payment.receivedBy }, select: { fullname: true } }) : null,
    prisma.student.findUnique({ where: { id: payment.studentId }, select: { fatherName: true, guardianName: true } }),
  ]);

  return {
    ...payment,
    school: school && { ...school, logo: await fileUrl(school.logo) },
    student: { ...payment.student, fatherName: student?.fatherName ?? null, guardianName: student?.guardianName ?? null },
    enrollment,
    receivedByName: receivedBy?.fullname ?? null,
  };
};

const listPayments = async (schoolId: string, query: ListPaymentsQuery) => {
  const { studentId, status, method, from, to, page, limit } = query;

  const where: Prisma.PaymentWhereInput = {
    schoolId,
    ...(studentId ? { studentId } : {}),
    ...(status ? { status } : {}),
    ...(method ? { method } : {}),
    ...(from || to ? { paidAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };

  const [items, total, groups] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        student: { select: { id: true, nameEn: true, nameBn: true, admissionNo: true } },
        _count: { select: { allocations: true } },
      },
    }),
    prisma.payment.count({ where }),
    prisma.payment.groupBy({
      by: ["status"],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  // totals cover the whole filtered set, not just this page
  const byStatus: Record<string, { count: number; amount: string }> = {};
  for (const g of groups) {
    byStatus[g.status] = { count: g._count._all, amount: (g._sum.amount ?? ZERO).toFixed(2) };
  }

  return {
    items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    summary: { collected: byStatus.SUCCESS?.amount ?? "0.00", byStatus },
  };
};

// for payments recorded elsewhere (online, through SSLCommerz): the same receipts and labels
export const PaymentParts = { feeLabel, amountsOf, nextReceiptNo, getPaymentDetail };

export const PaymentService = {
  getPayableFees,
  recordPayment,
  cancelPayment,
  getPaymentById,
  getReceipt,
  listPayments,
};