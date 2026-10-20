import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import type { SubscriptionPlan } from "../../../../generated/prisma/enums";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { todayInBangladesh } from "../../shared/scheduleSchemas";
import type { PaymentInput, SubscriptionListQuery } from "./subscription.validation";

type Db = Prisma.TransactionClient | typeof prisma;

/*
 * Schools pay the platform monthly or yearly, outside the app. The platform admin records each
 * paid period here (the first one when the school is activated); the school's super admin
 * sees them on their dashboard.
 */

/** "2026-10" for a monthly payment, "2026" for a yearly one. */
const periodKey = (year: number, month: number | null | undefined) => (month ? `${year}-${String(month).padStart(2, "0")}` : String(year));

/* This month and year in Bangladesh, as period keys. */
const currentPeriods = () => {
  const today = todayInBangladesh();
  const year = today.getUTCFullYear();
  return { month: periodKey(year, today.getUTCMonth() + 1), year: String(year) };
};

const paymentSelect = {
  id: true,
  plan: true,
  year: true,
  month: true,
  period: true,
  amount: true,
  paidOn: true,
  note: true,
  createdAt: true,
} satisfies Prisma.SubscriptionPaymentSelect;

type PaymentRow = { plan: SubscriptionPlan; year: number; month: number | null; period: string };

/*
 * Where a school stands: the last period paid (newest first), and whether this month (monthly)
 * or this year (yearly) is paid. A yearly payment covers every month of its year.
 */
const standing = (plan: SubscriptionPlan | null, payments: PaymentRow[]) => {
  const now = currentPeriods();
  const last = payments[0] ?? null;
  const periods = new Set(payments.map((p) => p.period));
  const currentPaid = plan === null ? null : plan === "YEARLY" ? periods.has(now.year) : periods.has(now.month) || periods.has(now.year);
  return { paidThrough: last ? { plan: last.plan, year: last.year, month: last.month } : null, currentPaid };
};

const newestFirst = [{ year: "desc" }, { month: { sort: "desc", nulls: "first" } }] satisfies Prisma.SubscriptionPaymentOrderByWithRelationInput[];

// ------------------------------------------------------------------ recording

/*
 * Records one paid period (inside the caller's transaction when given). Monthly needs a month;
 * yearly has none. A month already covered by that year's yearly payment, or a year that
 * already has monthly payments, is refused, as is a period recorded twice.
 */
export const recordPayment = async (db: Db, schoolId: string, plan: SubscriptionPlan, data: PaymentInput, recordedBy: string) => {
  if (plan === "MONTHLY" && !data.month) throw new AppError("Choose the month this payment is for", httpStatus.BAD_REQUEST);
  const month = plan === "MONTHLY" ? data.month! : null;
  const period = periodKey(data.year, month);

  const clash = await db.subscriptionPayment.findFirst({
    where: { schoolId, OR: [{ period }, plan === "MONTHLY" ? { period: String(data.year) } : { year: data.year, month: { not: null } }] },
    select: { period: true, month: true },
  });
  if (clash) {
    const message =
      clash.period === period
        ? `${period} is already recorded`
        : plan === "MONTHLY"
          ? `${data.year} is already paid for the whole year`
          : `${data.year} already has monthly payments`;
    throw new AppError(message, httpStatus.CONFLICT);
  }

  return db.subscriptionPayment.create({
    data: {
      schoolId,
      plan,
      year: data.year,
      month,
      period,
      amount: data.amount,
      paidOn: data.paidOn ?? todayInBangladesh(),
      note: data.note,
      recordedBy,
    },
    select: paymentSelect,
  });
};

const findSchool = async (schoolId: string) => {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, nameEn: true, nameBn: true, subdomain: true, status: true, activationDate: true, monthlyFee: true, subscriptionPlan: true },
  });
  if (!school) throw new AppError("School not found", httpStatus.NOT_FOUND);
  return school;
};

/* Records a payment for a school; its plan is the school's own, or set by this one when it has none. */
const addPayment = async (schoolId: string, data: PaymentInput, recordedBy: string) => {
  const school = await findSchool(schoolId);
  const plan = school.subscriptionPlan ?? data.plan;
  if (!plan) throw new AppError("Choose the school's plan (monthly or yearly) first", httpStatus.BAD_REQUEST);

  return prisma.$transaction(async (tx) => {
    if (!school.subscriptionPlan) await tx.school.update({ where: { id: schoolId }, data: { subscriptionPlan: plan } });
    return recordPayment(tx, schoolId, plan, data, recordedBy);
  });
};

/* A wrongly recorded payment. */
const removePayment = async (paymentId: string) => {
  const payment = await prisma.subscriptionPayment.findUnique({ where: { id: paymentId }, select: { id: true } });
  if (!payment) throw new AppError("Payment not found", httpStatus.NOT_FOUND);
  await prisma.subscriptionPayment.delete({ where: { id: paymentId } });
  return { id: paymentId };
};

/* Monthly or yearly from now on; payments already recorded keep their own plan. */
const setPlan = async (schoolId: string, plan: SubscriptionPlan) => {
  await findSchool(schoolId);
  await prisma.school.update({ where: { id: schoolId }, data: { subscriptionPlan: plan } });
  return getSchoolSubscription(schoolId);
};

// ------------------------------------------------------------------ reading

/* Every school (activated ones first) with its plan and where it stands. */
const listSchools = async ({ search, page, limit }: SubscriptionListQuery) => {
  const where: Prisma.SchoolWhereInput = search
    ? {
        OR: [
          { nameEn: { contains: search, mode: "insensitive" } },
          { nameBn: { contains: search } },
          { subdomain: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const [schools, total] = await Promise.all([
    prisma.school.findMany({
      where,
      orderBy: [{ activationDate: { sort: "desc", nulls: "last" } }, { nameEn: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        nameEn: true,
        nameBn: true,
        subdomain: true,
        status: true,
        activationDate: true,
        subscriptionPlan: true,
        _count: { select: { subscriptionPayments: true } },
        // enough to know the last period and whether this month / year is paid
        subscriptionPayments: { orderBy: newestFirst, take: 13, select: { plan: true, year: true, month: true, period: true } },
      },
    }),
    prisma.school.count({ where }),
  ]);

  return {
    items: schools.map(({ subscriptionPayments, _count, ...school }) => ({
      ...school,
      payments: _count.subscriptionPayments,
      ...standing(school.subscriptionPlan, subscriptionPayments),
    })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/* One school's plan, standing and every recorded payment (newest first). */
const getSchoolSubscription = async (schoolId: string) => {
  const school = await findSchool(schoolId);
  const payments = await prisma.subscriptionPayment.findMany({ where: { schoolId }, orderBy: newestFirst, select: paymentSelect });
  return { school, plan: school.subscriptionPlan, ...standing(school.subscriptionPlan, payments), payments };
};

/* For the school's super admin: the same, without the platform's own details. */
const mySubscription = async (schoolId: string) => {
  const { plan, paidThrough, currentPaid, payments } = await getSchoolSubscription(schoolId);
  return { plan, paidThrough, currentPaid, payments: payments.map(({ id, plan, year, month, period, amount, paidOn }) => ({ id, plan, year, month, period, amount, paidOn })) };
};

export const SubscriptionService = { addPayment, removePayment, setPlan, listSchools, getSchoolSubscription, mySubscription };
