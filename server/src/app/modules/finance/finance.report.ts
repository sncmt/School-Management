import httpStatus from "http-status";
import { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { todayInBangladesh } from "../../shared/scheduleSchemas";
import { currentMonth } from "../studentFee/studentFee.service";
import type { CollectionReportQuery, DuesReportQuery } from "./finance.validation";

/*
 * Finance reports, read-only. Money is summed as Decimals and sent as "1234.50" strings,
 * like the rest of the finance module.
 */

const ZERO = new Prisma.Decimal(0);
const add = (map: Map<string, Prisma.Decimal>, key: string, amount: Prisma.Decimal) => map.set(key, (map.get(key) ?? ZERO).plus(amount));
const fixed = (map: Map<string, Prisma.Decimal>) => [...map].map(([key, amount]) => ({ key, amount: amount.toFixed(2) }));

/* "YYYY-MM-DD": the Bangladesh day of a moment. */
const bdDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(d);

// ---------------------------------------------------------------- collection

/*
 * Money in and out over some days (Bangladesh time): fees collected (by day, method, fee
 * type and fund), cancelled payments, and expenses by category. Left out = today.
 */
const getCollection = async (schoolId: string, query: CollectionReportQuery) => {
  const today = todayInBangladesh();
  const from = query.from ?? new Date(today.getTime() - 6 * 3_600_000); // today's start in Bangladesh
  const to = query.to ?? new Date(today.getTime() + 18 * 3_600_000 - 1); // today's end in Bangladesh
  if (to.getTime() - from.getTime() > 400 * 86_400_000) {
    throw new AppError("Choose at most about a year at a time", httpStatus.BAD_REQUEST);
  }

  const [payments, cancelled, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: { schoolId, status: "SUCCESS", paidAt: { gte: from, lte: to } },
      select: {
        amount: true,
        method: true,
        paidAt: true,
        allocations: {
          select: {
            amount: true,
            studentFee: {
              select: {
                feeType: { select: { id: true, nameEn: true, nameBn: true } },
                fund: { select: { id: true, nameEn: true, nameBn: true } },
              },
            },
          },
        },
      },
    }),
    prisma.payment.aggregate({
      where: { schoolId, status: "CANCELLED", paidAt: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    // a voided expense never counts
    prisma.fundTransaction.groupBy({
      by: ["category"],
      where: { schoolId, type: "EXPENSE", source: "EXPENSE", reversedBy: { is: null }, transactionDate: { gte: from, lte: to } },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
  ]);

  let total = ZERO;
  const byDay = new Map<string, Prisma.Decimal>();
  const byMethod = new Map<string, Prisma.Decimal>();
  const byFeeType = new Map<string, Prisma.Decimal>();
  const byFund = new Map<string, Prisma.Decimal>();
  const feeTypes = new Map<string, { id: string; nameEn: string | null; nameBn: string | null }>();
  const funds = new Map<string, { id: string; nameEn: string | null; nameBn: string | null }>();
  for (const p of payments) {
    total = total.plus(p.amount);
    add(byDay, bdDay(p.paidAt), p.amount);
    add(byMethod, p.method, p.amount);
    for (const a of p.allocations) {
      feeTypes.set(a.studentFee.feeType.id, a.studentFee.feeType);
      funds.set(a.studentFee.fund.id, a.studentFee.fund);
      add(byFeeType, a.studentFee.feeType.id, a.amount);
      add(byFund, a.studentFee.fund.id, a.amount);
    }
  }
  const expenseTotal = expenses.reduce((sum, g) => sum.plus(g._sum.amount ?? ZERO), ZERO);

  return {
    from,
    to,
    collected: { total: total.toFixed(2), count: payments.length },
    cancelled: { total: (cancelled._sum.amount ?? ZERO).toFixed(2), count: cancelled._count._all },
    expenses: {
      total: expenseTotal.toFixed(2),
      byCategory: expenses.map((g) => ({ category: g.category, count: g._count._all, amount: (g._sum.amount ?? ZERO).toFixed(2) })),
    },
    // collected less spent in these days
    net: total.minus(expenseTotal).toFixed(2),
    byDay: fixed(byDay).sort((a, b) => a.key.localeCompare(b.key)).map(({ key, amount }) => ({ day: key, amount })),
    byMethod: fixed(byMethod).map(({ key, amount }) => ({ method: key, amount })),
    byFeeType: fixed(byFeeType)
      .map(({ key, amount }) => ({ feeType: feeTypes.get(key)!, amount }))
      .sort((a, b) => Number(b.amount) - Number(a.amount)),
    byFund: fixed(byFund)
      .map(({ key, amount }) => ({ fund: funds.get(key)!, amount }))
      .sort((a, b) => Number(b.amount) - Number(a.amount)),
  };
};

// ---------------------------------------------------------------------- dues

/*
 * What is owed now: unpaid or part-paid fees whose month has started, and every unpaid
 * one-time fee. For a year (the current one by default): this year's dues and, for the
 * students of the year, what is still unpaid from earlier years - per class (the class
 * they are in this year), or per student of one class.
 */
const getDues = async (schoolId: string, query: DuesReportQuery) => {
  const year = query.academicYearId
    ? await prisma.academicYear.findFirst({ where: { id: query.academicYearId, schoolId }, select: { id: true, name: true, startDate: true } })
    : await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true }, select: { id: true, name: true, startDate: true } });
  if (!year) throw new AppError("No current academic year is set. Choose an academic year", httpStatus.BAD_REQUEST);

  // the students of the year (the class's, for one class), and the class each is in
  const enrollments = await prisma.enrollment.findMany({
    where: { academicYearId: year.id, student: { schoolId }, ...(query.classId ? { classId: query.classId } : {}) },
    select: {
      classId: true,
      rollNumber: true,
      section: { select: { name: true, isDefault: true } },
      student: { select: { id: true, nameEn: true, nameBn: true, admissionNo: true, phone: true, guardianPhone: true, status: true } },
    },
  });
  const classOf = new Map(enrollments.map((e) => [e.student.id, e.classId]));

  const now = currentMonth();
  const unpaid = { status: { in: ["UNPAID" as const, "PARTIAL" as const] } };
  const [thisYear, earlier] = await Promise.all([
    prisma.studentFee.findMany({
      where: {
        schoolId,
        academicYearId: year.id,
        ...unpaid,
        // this year: only months that have started
        OR: [{ month: null }, { year: { lt: now.year } }, { year: now.year, month: { lte: now.month } }],
        ...(query.classId ? { studentId: { in: [...classOf.keys()] } } : {}),
      },
      select: { studentId: true, classId: true, amount: true, discountAmount: true, paidAmount: true, month: true, year: true },
    }),
    // earlier years: everything still unpaid, for the students of this year
    prisma.studentFee.findMany({
      where: { schoolId, studentId: { in: [...classOf.keys()] }, academicYear: { startDate: { lt: year.startDate } }, ...unpaid },
      select: { studentId: true, amount: true, discountAmount: true, paidAmount: true },
    }),
  ]);
  const owed = (f: { amount: Prisma.Decimal; discountAmount: Prisma.Decimal; paidAmount: Prisma.Decimal }) =>
    f.amount.minus(f.discountAmount).minus(f.paidAmount);

  type Row = { fees: number; amount: Prisma.Decimal; previous: Prisma.Decimal; oldest: number | null };
  const byStudent = new Map<string, Row>();
  const rowOf = (studentId: string) => {
    const row = byStudent.get(studentId) ?? { fees: 0, amount: ZERO, previous: ZERO, oldest: null };
    byStudent.set(studentId, row);
    return row;
  };
  for (const f of thisYear) {
    const row = rowOf(f.studentId);
    row.fees++;
    row.amount = row.amount.plus(owed(f));
    if (f.month !== null && f.year !== null) {
      const key = f.year * 12 + f.month;
      row.oldest = row.oldest === null ? key : Math.min(row.oldest, key);
    }
  }
  for (const f of earlier) rowOf(f.studentId).previous = rowOf(f.studentId).previous.plus(owed(f));

  const total = thisYear.reduce((sum, f) => sum.plus(owed(f)), ZERO);
  const previousTotal = earlier.reduce((sum, f) => sum.plus(owed(f)), ZERO);

  if (!query.classId) {
    // this year's dues go by the fee's class; earlier years' by the class the student is in now
    const byClass = new Map<string, { students: Set<string>; amount: Prisma.Decimal; previous: Prisma.Decimal }>();
    const classRow = (classId: string) => {
      const row = byClass.get(classId) ?? { students: new Set<string>(), amount: ZERO, previous: ZERO };
      byClass.set(classId, row);
      return row;
    };
    for (const f of thisYear) {
      const row = classRow(f.classId ?? classOf.get(f.studentId) ?? "");
      row.students.add(f.studentId);
      row.amount = row.amount.plus(owed(f));
    }
    for (const f of earlier) {
      const row = classRow(classOf.get(f.studentId) ?? "");
      row.students.add(f.studentId);
      row.previous = row.previous.plus(owed(f));
    }
    const classes = await prisma.schoolClass.findMany({
      where: { schoolId },
      orderBy: { numericLevel: "asc" },
      select: { id: true, name: true, enrollments: { where: { academicYearId: year.id, status: "ACTIVE" }, select: { id: true } } },
    });
    return {
      academicYear: { id: year.id, name: year.name },
      total: total.toFixed(2),
      previousTotal: previousTotal.toFixed(2),
      studentsWithDues: byStudent.size,
      classes: classes.map((c) => {
        const row = byClass.get(c.id);
        return {
          class: { id: c.id, name: c.name },
          students: c.enrollments.length,
          studentsWithDues: row?.students.size ?? 0,
          amount: (row?.amount ?? ZERO).toFixed(2),
          previous: (row?.previous ?? ZERO).toFixed(2),
        };
      }),
    };
  }

  // one class: each student who owes (this year or from before), by section and roll
  const schoolClass = await prisma.schoolClass.findFirst({ where: { id: query.classId, schoolId }, select: { id: true, name: true } });
  if (!schoolClass) throw new AppError("Class not found for this school", httpStatus.NOT_FOUND);
  const owing = enrollments
    .filter((e) => byStudent.has(e.student.id))
    .sort(
      (a, b) => a.section.name.localeCompare(b.section.name) || (a.rollNumber ?? "").localeCompare(b.rollNumber ?? "", undefined, { numeric: true }),
    );
  return {
    academicYear: { id: year.id, name: year.name },
    class: schoolClass,
    total: total.toFixed(2),
    previousTotal: previousTotal.toFixed(2),
    students: owing.map((e) => {
      const row = byStudent.get(e.student.id)!;
      return {
        student: e.student,
        rollNumber: e.rollNumber,
        section: e.section,
        fees: row.fees,
        amount: row.amount.toFixed(2),
        // still unpaid from earlier years
        previous: row.previous.toFixed(2),
        // the earliest unpaid month of this year, { year, month }
        oldestMonth: row.oldest === null ? null : { year: Math.floor((row.oldest - 1) / 12), month: ((row.oldest - 1) % 12) + 1 },
      };
    }),
  };
};

export const FinanceReport = { getCollection, getDues };
