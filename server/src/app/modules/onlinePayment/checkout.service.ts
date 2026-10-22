import { randomBytes } from "crypto";
import httpStatus from "http-status";
import { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import config from "../../config";
import { AppError } from "../../errorHandler/AppError";
import { GUARDIAN_ROLE } from "../../shared/schoolAccounts";
import { NotificationService, notifyInBackground } from "../notification/notification.service";
import { PaymentParts, PaymentService } from "../payment/payment.service";
import { computeFeeStatus, lockStudentFees } from "../studentFee/studentFee.service";
import { storeOf } from "./onlinePayment.service";
import { createSession, findByTranId, isPaid, validate, type Validation } from "./sslcommerz";

/*
 * Guardians paying fees online:
 *  1. options:  the child's fees owed now, and the school's convenience charge
 *  2. start:    an OnlinePayment (PENDING) and an SSLCommerz session; the guardian goes to its page
 *  3. callback: SSLCommerz sends the guardian back (success / fail / cancel) and tells our server
 *               (IPN). Nothing is believed until SSLCommerz's validation API confirms the payment
 *               and its amount, currency and transaction match ours.
 *  4. finish:   the payment is recorded like one taken at the office (receipt, fees, funds), once.
 */

type Auth = NonNullable<Express.Request["auth"]>;
type Db = Prisma.TransactionClient;

const ZERO = new Prisma.Decimal(0);
const TX = { maxWait: 10_000, timeout: 30_000 };

export const schoolUrl = (subdomain: string) => config.publicSchoolUrl.replace("{subdomain}", subdomain).replace(/\/$/, "");

/* The guardian's own child (this login's student in this school), or 404. */
const ownChild = async (auth: Auth, studentId: string) => {
  const guardian = auth.membershipId
    ? await prisma.userRole.findFirst({
        where: { userId: auth.userId, membershipId: auth.membershipId, role: { scope: "SCHOOL", name: GUARDIAN_ROLE.name, isSystem: true } },
        select: { id: true },
      })
    : null;
  const student = guardian
    ? await prisma.student.findFirst({
        where: { id: studentId, schoolId: auth.schoolId!, userId: auth.userId },
        select: { id: true, nameEn: true, admissionNo: true, phone: true, guardianPhone: true, email: true, presentAddress: true, fatherName: true },
      })
    : null;
  if (!student) throw new AppError("Student not found!", httpStatus.NOT_FOUND);
  return student;
};

const round2 = (d: Prisma.Decimal) => d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
const chargeOn = (amount: Prisma.Decimal, percent: string) => round2(amount.times(percent).dividedBy(100));

/* What a guardian may pay now: the fees owed now (their month has started), and the charge. */
const getOptions = async (auth: Auth, studentId: string) => {
  const schoolId = auth.schoolId!;
  await ownChild(auth, studentId);
  const store = await storeOf(schoolId);
  const payable = await PaymentService.getPayableFees(schoolId, studentId, {});
  const fees = payable.items
    .filter((f) => f.isDue && f.remaining > 0)
    .map((f) => ({
      id: f.id,
      feeType: { nameEn: f.feeType.nameEn, nameBn: f.feeType.nameBn },
      month: f.month,
      year: f.year,
      description: f.description,
      academicYear: f.academicYear,
      remaining: f.remaining.toFixed(2),
    }));
  return { enabled: !!store?.enabled, chargePercent: store?.chargePercent ?? "0.00", fees };
};

/* Starts a payment of the chosen fees: the SSLCommerz page to send the guardian to. */
const start = async (auth: Auth, studentId: string, feeIds: string[]) => {
  const schoolId = auth.schoolId!;
  const student = await ownChild(auth, studentId);
  const store = await storeOf(schoolId);
  if (!store?.enabled) throw new AppError("The school does not take payments online", httpStatus.BAD_REQUEST);

  const payable = await PaymentService.getPayableFees(schoolId, studentId, {});
  const owed = new Map(payable.items.filter((f) => f.isDue && f.remaining > 0).map((f) => [f.id, f]));
  const chosen = [...new Set(feeIds)];
  if (chosen.length === 0) throw new AppError("Choose the fees to pay", httpStatus.BAD_REQUEST);
  if (chosen.some((id) => !owed.has(id))) throw new AppError("Some of these fees are not owed now. Open the list again", httpStatus.CONFLICT);

  const feeAmount = chosen.reduce((sum, id) => sum.plus(owed.get(id)!.remaining), ZERO);
  const charge = chargeOn(feeAmount, store.chargePercent);
  const total = feeAmount.plus(charge);
  if (total.lt(10)) throw new AppError("SSLCommerz takes payments of ৳10 or more", httpStatus.BAD_REQUEST);

  const school = await prisma.school.findUniqueOrThrow({ where: { id: schoolId }, select: { subdomain: true, nameEn: true } });
  const tranId = `SM${Date.now().toString(36).toUpperCase()}${randomBytes(4).toString("hex").toUpperCase()}`;
  const online = await prisma.onlinePayment.create({
    data: { schoolId, studentId, userId: auth.userId, tranId, feeIds: chosen, feeAmount, charge, total, sandbox: store.sandbox },
  });

  const base = schoolUrl(school.subdomain);
  const back = (kind: string) => `${base}/api/v1/pay/sslcommerz/${kind}`;
  const phone = (student.phone ?? student.guardianPhone ?? "").replace(/^\+88/, "") || "01700000000";
  const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { fullname: true, email: true } });

  let session;
  try {
    session = await createSession(store, {
      tranId,
      amount: total.toFixed(2),
      successUrl: back("success"),
      failUrl: back("fail"),
      cancelUrl: back("cancel"),
      ipnUrl: back("ipn"),
      productName: `School fees: ${student.nameEn} (${student.admissionNo})`,
      customer: { name: user?.fullname ?? student.fatherName, phone, email: user?.email ?? student.email, address: student.presentAddress },
      valueA: schoolId,
      valueB: studentId,
    });
  } catch (error) {
    session = { ok: false as const, reason: `Could not reach SSLCommerz: ${(error as Error).message}` };
  }
  if (!session.ok) {
    await prisma.onlinePayment.update({ where: { id: online.id }, data: { status: "FAILED", failReason: session.reason.slice(0, 300) } });
    throw new AppError("The payment could not be started. Please try again later", httpStatus.BAD_GATEWAY);
  }
  await prisma.onlinePayment.update({ where: { id: online.id }, data: { sessionKey: session.sessionKey || null } });
  return { tranId, gatewayUrl: session.gatewayUrl, total: total.toFixed(2) };
};

// ------------------------------------------------------------------ finish

/*
 * Records a confirmed payment, once: the OnlinePayment row is locked, so SSLCommerz's two
 * messages (the payer's return and its own IPN) can't both record it. Each chosen fee is paid
 * as far as the money goes, oldest first; what is no longer owed is marked to refund.
 */
const record = async (onlineId: string, v: Validation) => {
  const result = await prisma.$transaction(async (tx: Db) => {
    await tx.$queryRaw`SELECT "id" FROM "OnlinePayment" WHERE "id" = ${onlineId} FOR UPDATE`;
    const online = await tx.onlinePayment.findUniqueOrThrow({ where: { id: onlineId } });
    if (online.status === "PAID") return { recorded: false, paymentId: online.paymentId };

    const feeIds = online.feeIds as string[];
    await lockStudentFees(tx, feeIds);
    const fees = await tx.studentFee.findMany({
      where: { id: { in: feeIds }, schoolId: online.schoolId, studentId: online.studentId },
      include: { feeType: { select: { nameEn: true, nameBn: true } } },
      orderBy: [{ year: { sort: "asc", nulls: "first" } }, { month: "asc" }, { createdAt: "asc" }],
    });

    let money = online.feeAmount;
    const lines: { fee: (typeof fees)[number]; amount: Prisma.Decimal }[] = [];
    for (const fee of fees) {
      const { remaining } = PaymentParts.amountsOf(fee);
      const amount = Prisma.Decimal.min(remaining, money);
      if (amount.lte(0)) continue;
      lines.push({ fee, amount });
      money = money.minus(amount);
    }
    const paidAt = new Date();
    const common = {
      valId: v.raw.val_id ? String(v.raw.val_id) : online.valId,
      bankTranId: v.bankTranId,
      cardType: v.cardType,
      storeAmount: v.storeAmount ? new Prisma.Decimal(v.storeAmount) : null,
      paidAt,
      status: "PAID" as const,
      refundAmount: money,
    };

    // everything was paid at the office meanwhile: nothing to record, all of it to refund
    if (lines.length === 0) {
      await tx.onlinePayment.update({ where: { id: online.id }, data: common });
      return { recorded: true, paymentId: null };
    }

    const student = await tx.student.findUniqueOrThrow({ where: { id: online.studentId }, select: { admissionNo: true } });
    const total = lines.reduce((sum, l) => sum.plus(l.amount), ZERO);
    const payment = await tx.payment.create({
      data: {
        schoolId: online.schoolId,
        receiptNo: await PaymentParts.nextReceiptNo(tx, online.schoolId, paidAt),
        studentId: online.studentId,
        amount: total,
        method: "ONLINE",
        transactionRef: online.tranId,
        receivedBy: null,
        paidAt,
      },
    });
    const allocations = await tx.paymentAllocation.createManyAndReturn({
      data: lines.map((l) => ({ paymentId: payment.id, studentFeeId: l.fee.id, amount: l.amount })),
      select: { id: true, studentFeeId: true },
    });
    const allocationOf = new Map(allocations.map((a) => [a.studentFeeId, a.id]));
    await tx.fundTransaction.createMany({
      data: lines.map((l) => ({
        schoolId: online.schoolId,
        fundId: l.fee.fundId,
        type: "INCOME" as const,
        source: "PAYMENT" as const,
        amount: l.amount,
        transactionDate: paidAt,
        description: `Online fee payment (${student.admissionNo}): ${PaymentParts.feeLabel(l.fee)}`,
        paymentAllocationId: allocationOf.get(l.fee.id)!,
        createdBy: online.userId,
      })),
    });
    for (const l of lines) {
      const newPaid = l.fee.paidAmount.plus(l.amount);
      await tx.studentFee.update({
        where: { id: l.fee.id },
        data: { paidAmount: newPaid, status: computeFeeStatus(Number(l.fee.amount), Number(l.fee.discountAmount), Number(newPaid)) },
      });
    }
    await tx.onlinePayment.update({ where: { id: online.id }, data: { ...common, paymentId: payment.id } });
    return { recorded: true, paymentId: payment.id, schoolId: online.schoolId };
  }, TX);

  if (result.recorded && result.paymentId && "schoolId" in result && result.schoolId) {
    const { schoolId, paymentId } = result;
    notifyInBackground("payment", () => NotificationService.notifyPayment(schoolId, paymentId, "PAYMENT_RECEIVED"));
  }
  return result;
};

/* SSLCommerz's word on a payment is checked: paid, our transaction, the full amount, in BDT. */
const confirms = (online: { tranId: string; total: Prisma.Decimal }, v: Validation) =>
  isPaid(v) && v.tranId === online.tranId && v.currency.toUpperCase() === "BDT" && new Prisma.Decimal(v.amount || "0").gte(online.total);

/*
 * SSLCommerz's success / IPN message: confirmed with its validation API by the val_id, then
 * recorded. Returns the tranId (to show the payer the result), or null for an unknown one.
 */
const confirmByValId = async (tranId: string, valId: string) => {
  const online = await prisma.onlinePayment.findUnique({ where: { tranId } });
  if (!online) return null;
  if (online.status === "PAID") return online.tranId;
  const store = await storeOf(online.schoolId);
  if (!store) return online.tranId;

  const v = await validate(store, valId);
  if (confirms(online, v)) {
    await record(online.id, v);
  } else if (online.status === "PENDING" && v.status && !isPaid(v)) {
    await prisma.onlinePayment.update({ where: { id: online.id }, data: { status: "FAILED", failReason: `SSLCommerz: ${v.status}`.slice(0, 300) } });
  }
  return online.tranId;
};

/* The payer came back without paying (failed / cancelled): noted only while still waiting. */
const markUnpaid = async (tranId: string, status: "FAILED" | "CANCELLED", reason: string | null) => {
  const online = await prisma.onlinePayment.findUnique({ where: { tranId }, select: { id: true, status: true } });
  if (!online) return null;
  if (online.status === "PENDING") {
    await prisma.onlinePayment.update({ where: { id: online.id }, data: { status, failReason: reason?.slice(0, 300) ?? null } });
  }
  return tranId;
};

/*
 * Asks SSLCommerz what became of a payment still waiting (the payer closed the page, the IPN
 * never came): records it when paid, else leaves it waiting (or marks it failed when told).
 */
export const settle = async (onlineId: string) => {
  const online = await prisma.onlinePayment.findUnique({ where: { id: onlineId } });
  if (!online || online.status !== "PENDING") return online?.status ?? null;
  const store = await storeOf(online.schoolId);
  if (!store) return online.status;
  const { attempts } = await findByTranId(store, online.tranId);
  const paid = attempts.find((a) => confirms(online, a));
  if (paid) {
    await record(online.id, paid);
    return "PAID";
  }
  const failed = attempts.find((a) => a.status === "FAILED" || a.status === "CANCELLED" || a.status === "UNATTEMPTED" || a.status === "EXPIRED");
  if (failed && attempts.every((a) => !isPaid(a))) {
    await prisma.onlinePayment.update({ where: { id: online.id }, data: { status: failed.status === "CANCELLED" ? "CANCELLED" : "FAILED", failReason: `SSLCommerz: ${failed.status}` } });
    return failed.status === "CANCELLED" ? "CANCELLED" : "FAILED";
  }
  return "PENDING";
};

/* The guardian's view of one of their payments (after coming back from SSLCommerz). */
const getResult = async (auth: Auth, tranId: string) => {
  const found = await prisma.onlinePayment.findFirst({ where: { tranId, schoolId: auth.schoolId!, userId: auth.userId }, select: { id: true, status: true } });
  if (!found) throw new AppError("Payment not found!", httpStatus.NOT_FOUND);
  // still waiting: ask SSLCommerz (the IPN may not reach us, e.g. in testing)
  if (found.status === "PENDING") await settle(found.id).catch(() => undefined);
  const online = await prisma.onlinePayment.findUniqueOrThrow({
    where: { id: found.id },
    select: {
      tranId: true,
      status: true,
      feeAmount: true,
      charge: true,
      total: true,
      refundAmount: true,
      failReason: true,
      paidAt: true,
      createdAt: true,
      student: { select: { id: true, nameEn: true, nameBn: true } },
      payment: { select: { id: true, receiptNo: true, amount: true } },
    },
  });
  return {
    ...online,
    feeAmount: online.feeAmount.toFixed(2),
    charge: online.charge.toFixed(2),
    total: online.total.toFixed(2),
    refundAmount: online.refundAmount.toFixed(2),
    payment: online.payment && { ...online.payment, amount: online.payment.amount.toFixed(2) },
  };
};

// record: for a payment SSLCommerz has confirmed (also used by the office's reconciling, and tests)
export const CheckoutService = { getOptions, start, confirmByValId, markUnpaid, settle, getResult, record };
