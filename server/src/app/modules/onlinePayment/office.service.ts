import httpStatus from "http-status";
import { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { settle } from "./checkout.service";
import type { ListOnlineQuery, MarkRefundPayload } from "./onlinePayment.validation";

/*
 * The office's view of online payments: every one started, whatever became of it, with what
 * SSLCommerz reported. Money paid but no longer owed (the fees taken at the office meanwhile,
 * or the receipt cancelled) is refunded by the school through SSLCommerz's merchant panel and
 * marked here; nothing is refunded from this app.
 */

const ZERO = new Prisma.Decimal(0);

const select = {
  id: true,
  tranId: true,
  status: true,
  sandbox: true,
  userId: true,
  feeAmount: true,
  charge: true,
  total: true,
  storeAmount: true,
  valId: true,
  bankTranId: true,
  cardType: true,
  failReason: true,
  refundAmount: true,
  refundedAt: true,
  refundNote: true,
  paidAt: true,
  createdAt: true,
  student: { select: { id: true, nameEn: true, nameBn: true, admissionNo: true } },
  payment: { select: { id: true, receiptNo: true, status: true, amount: true } },
} satisfies Prisma.OnlinePaymentSelect;

type Row = Prisma.OnlinePaymentGetPayload<{ select: typeof select }>;

const shape = (rows: Row[]) => async () => {
  const userIds = [...new Set(rows.map((r) => r.userId))];
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullname: true, phone: true } }) : [];
  const userOf = new Map(users.map((u) => [u.id, u]));
  return rows.map(({ userId, ...r }) => ({
    ...r,
    payer: userOf.get(userId) ?? null,
    feeAmount: r.feeAmount.toFixed(2),
    charge: r.charge.toFixed(2),
    total: r.total.toFixed(2),
    storeAmount: r.storeAmount?.toFixed(2) ?? null,
    refundAmount: r.refundAmount.toFixed(2),
    payment: r.payment && { ...r.payment, amount: r.payment.amount.toFixed(2) },
  }));
};

const list = async (schoolId: string, query: ListOnlineQuery) => {
  const { status, refund, from, to, search, page, limit } = query;
  const text = { contains: search, mode: "insensitive" as const };
  const where: Prisma.OnlinePaymentWhereInput = {
    schoolId,
    ...(status ? { status } : {}),
    ...(refund === "OWED" ? { refundAmount: { gt: 0 }, refundedAt: null } : refund === "DONE" ? { refundedAt: { not: null } } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(search
      ? {
          OR: [
            { tranId: text },
            { bankTranId: text },
            { payment: { receiptNo: text } },
            { student: { OR: [{ nameEn: text }, { nameBn: text }, { admissionNo: text }] } },
          ],
        }
      : {}),
  };

  const [rows, total, groups, pending, owed] = await Promise.all([
    prisma.onlinePayment.findMany({ where, select, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * limit, take: limit }),
    prisma.onlinePayment.count({ where }),
    prisma.onlinePayment.groupBy({ by: ["status"], where, _sum: { total: true, charge: true }, _count: { _all: true } }),
    // what needs the office, whatever the filters
    prisma.onlinePayment.count({ where: { schoolId, status: "PENDING" } }),
    prisma.onlinePayment.aggregate({ where: { schoolId, refundAmount: { gt: 0 }, refundedAt: null }, _sum: { refundAmount: true }, _count: { _all: true } }),
  ]);

  const paid = groups.find((g) => g.status === "PAID");
  return {
    items: await shape(rows)(),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    summary: {
      paid: { count: paid?._count._all ?? 0, total: (paid?._sum.total ?? ZERO).toFixed(2), charge: (paid?._sum.charge ?? ZERO).toFixed(2) },
      byStatus: Object.fromEntries(groups.map((g) => [g.status, g._count._all])),
      pending,
      refundsOwed: { count: owed._count._all, amount: (owed._sum.refundAmount ?? ZERO).toFixed(2) },
    },
  };
};

const oneOf = async (schoolId: string, id: string) => {
  const row = await prisma.onlinePayment.findFirst({ where: { id, schoolId }, select });
  if (!row) throw new AppError("Online payment not found!", httpStatus.NOT_FOUND);
  return row;
};

/* A payment still waiting: asks SSLCommerz now (instead of waiting for the background check). */
const check = async (schoolId: string, id: string) => {
  const row = await oneOf(schoolId, id);
  if (row.status === "PENDING") {
    try {
      await settle(row.id);
    } catch (error) {
      throw new AppError(`Could not reach SSLCommerz: ${(error as Error).message}`, httpStatus.BAD_GATEWAY);
    }
  }
  return (await shape([await oneOf(schoolId, id)])())[0];
};

/* Marks money to refund as given back (refunded in SSLCommerz's panel), or undoes that (the note stays). */
const markRefund = async (schoolId: string, id: string, data: MarkRefundPayload) => {
  const row = await oneOf(schoolId, id);
  if (row.refundAmount.lte(0)) throw new AppError("Nothing of this payment is to be refunded", httpStatus.BAD_REQUEST);
  await prisma.onlinePayment.update({
    where: { id: row.id },
    // a note already there (an earlier refund) is kept, the new one added after it
    data: data.refunded
      ? { refundedAt: new Date(), refundNote: [row.refundNote, data.note].filter(Boolean).join(" · ").slice(0, 600) || null }
      : { refundedAt: null },
  });
  return (await shape([await oneOf(schoolId, id)])())[0];
};

export const OnlineOfficeService = { list, check, markRefund };
