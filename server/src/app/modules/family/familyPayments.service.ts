import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { GUARDIAN_ROLE } from "../../shared/schoolAccounts";
import { PaymentService } from "../payment/payment.service";

/*
 * The family login's fee payments: every receipt of its children (taken at the office or paid
 * online), newest first, each with its money receipt; and the online payments that did not
 * become a receipt (still waiting, failed lately, or paid when nothing was owed any more).
 * Only the account's own children. Money is "1234.50".
 */

type Auth = NonNullable<Express.Request["auth"]>;

// failed and cancelled tries are shown this long
const RECENT_DAYS = 30;

/* This login's children in this school (a guardian only; else 403). */
const childrenOf = async (auth: Auth) => {
  const guardian = auth.membershipId
    ? await prisma.userRole.findFirst({
        where: { userId: auth.userId, membershipId: auth.membershipId, role: { scope: "SCHOOL", name: GUARDIAN_ROLE.name, isSystem: true } },
        select: { id: true },
      })
    : null;
  if (!guardian) throw new AppError("This page is for students and guardians", httpStatus.FORBIDDEN);
  return prisma.student.findMany({
    where: { schoolId: auth.schoolId!, userId: auth.userId },
    orderBy: [{ status: "asc" }, { nameEn: "asc" }],
    select: { id: true, nameEn: true, nameBn: true, admissionNo: true },
  });
};

const list = async (auth: Auth, query: { studentId?: string; page: number; limit: number }) => {
  const schoolId = auth.schoolId!;
  const children = await childrenOf(auth);
  const ids = children.map((c) => c.id);
  if (query.studentId && !ids.includes(query.studentId)) throw new AppError("Student not found!", httpStatus.NOT_FOUND);
  const studentIds = query.studentId ? [query.studentId] : ids;
  const { page, limit } = query;

  const where: Prisma.PaymentWhereInput = { schoolId, studentId: { in: studentIds } };
  const since = new Date(Date.now() - RECENT_DAYS * 86_400_000);
  const [rows, total, attempts] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        receiptNo: true,
        studentId: true,
        amount: true,
        method: true,
        transactionRef: true,
        status: true,
        paidAt: true,
        online: { select: { charge: true, refundAmount: true, refundedAt: true } },
      },
    }),
    prisma.payment.count({ where }),
    prisma.onlinePayment.findMany({
      where: {
        schoolId,
        studentId: { in: studentIds },
        paymentId: null,
        OR: [{ status: "PENDING" }, { status: "PAID" }, { status: { in: ["FAILED", "CANCELLED"] }, createdAt: { gte: since } }],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { tranId: true, studentId: true, status: true, total: true, refundAmount: true, refundedAt: true, createdAt: true, paidAt: true },
    }),
  ]);

  return {
    children,
    items: rows.map((p) => ({
      ...p,
      amount: p.amount.toFixed(2),
      online: p.online && { charge: p.online.charge.toFixed(2), refundAmount: p.online.refundAmount.toFixed(2), refundedAt: p.online.refundedAt },
    })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    attempts: attempts.map((a) => ({ ...a, total: a.total.toFixed(2), refundAmount: a.refundAmount.toFixed(2) })),
  };
};

/* A money receipt of one of this login's children. */
const getReceipt = async (auth: Auth, paymentId: string) => {
  const children = await childrenOf(auth);
  const found = await prisma.payment.findFirst({
    where: { id: paymentId, schoolId: auth.schoolId!, studentId: { in: children.map((c) => c.id) } },
    select: { id: true },
  });
  if (!found) throw new AppError("Payment not found!", httpStatus.NOT_FOUND);
  return PaymentService.getReceipt(auth.schoolId!, found.id);
};

export const FamilyPaymentsService = { list, getReceipt };
