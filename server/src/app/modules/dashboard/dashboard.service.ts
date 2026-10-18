import { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { checkPermission } from "../../middlewares/authorize";
import { dayKey, todayInBangladesh } from "../../shared/scheduleSchemas";
import { CalendarService } from "../calendar/calendar.service";
import { currentMonth } from "../studentFee/studentFee.service";

/*
 * The school dashboard: a summary of what the person may see. Each part is there only
 * with its permission (left out otherwise), so a teacher gets a smaller dashboard than
 * the super admin. Money is "1234.50" strings, like the rest of finance.
 */

type Auth = NonNullable<Express.Request["auth"]>;
const ZERO = new Prisma.Decimal(0);
const MONTHS_IN_CHART = 6;

const may = async (auth: Auth, code: string) => (await checkPermission(auth, code)) === "OK";

/* Students on roll this year, boys and girls, and how many joined this year. */
const people = async (schoolId: string, yearId: string) => {
  const onRoll = { schoolId, status: "ACTIVE" as const, enrollments: { some: { academicYearId: yearId, status: "ACTIVE" as const } } };
  const [byGender, newThisYear] = await Promise.all([
    prisma.student.groupBy({ by: ["gender"], where: onRoll, _count: { _all: true } }),
    prisma.enrollment.count({ where: { academicYearId: yearId, status: "ACTIVE", admissionType: "NEW", student: { schoolId, status: "ACTIVE" } } }),
  ]);
  const count = (g: string) => byGender.find((x) => x.gender === g)?._count._all ?? 0;
  return { total: byGender.reduce((s, x) => s + x._count._all, 0), boys: count("MALE"), girls: count("FEMALE"), newThisYear };
};

const teachers = async (schoolId: string) => {
  const byStatus = await prisma.teacherProfile.groupBy({
    by: ["status"],
    where: { schoolId, status: { in: ["ACTIVE", "ON_LEAVE"] } },
    _count: { _all: true },
  });
  const count = (s: string) => byStatus.find((x) => x.status === s)?._count._all ?? 0;
  return { working: count("ACTIVE") + count("ON_LEAVE"), onLeave: count("ON_LEAVE") };
};

/* Today's roll calls: how many sections took it, and the students by status. */
const attendanceToday = async (schoolId: string, yearId: string) => {
  const today = todayInBangladesh();
  const [byStatus, taken, sections] = await Promise.all([
    prisma.studentAttendance.groupBy({
      by: ["status"],
      where: { session: { schoolId, academicYearId: yearId, date: today } },
      _count: { _all: true },
    }),
    prisma.attendanceSession.count({ where: { schoolId, academicYearId: yearId, date: today } }),
    // sections with students this year
    prisma.section.count({ where: { schoolId, enrollments: { some: { academicYearId: yearId, status: "ACTIVE" } } } }),
  ]);
  const count = (s: string) => byStatus.find((x) => x.status === s)?._count._all ?? 0;
  const marked = byStatus.reduce((s, x) => s + x._count._all, 0);
  const present = count("PRESENT") + count("LATE");
  return {
    date: dayKey(today),
    sectionsTaken: taken,
    sections,
    marked,
    present: count("PRESENT"),
    late: count("LATE"),
    absent: count("ABSENT"),
    leave: count("LEAVE"),
    // late counts as present
    presentPercent: marked > 0 ? Math.round((present / marked) * 1000) / 10 : null,
  };
};

/* Fees collected and money spent, this month and the last few, and what is owed now. */
const money = async (schoolId: string, yearId: string) => {
  const now = currentMonth();
  const first = new Date(Date.UTC(now.year, now.month - MONTHS_IN_CHART, 1));
  // the months of the chart, oldest first: "2026-05"...
  const months = Array.from({ length: MONTHS_IN_CHART }, (_, i) => {
    const d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + i, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
  // from the first day of the first month, in Bangladesh
  const since = new Date(first.getTime() - 6 * 3_600_000);
  const today = todayInBangladesh();

  const [collected, spent, todayIn, due] = await Promise.all([
    prisma.$queryRaw<{ month: string; total: Prisma.Decimal }[]>`
      SELECT to_char(("paidAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM') AS month, SUM("amount") AS total
      FROM "Payment"
      WHERE "schoolId" = ${schoolId} AND "status" = 'SUCCESS' AND "paidAt" >= ${since}
      GROUP BY month`,
    // expenses, less the voided ones
    prisma.$queryRaw<{ month: string; total: Prisma.Decimal }[]>`
      SELECT to_char((t."transactionDate" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Dhaka', 'YYYY-MM') AS month, SUM(t."amount") AS total
      FROM "FundTransaction" t
      WHERE t."schoolId" = ${schoolId} AND t."type" = 'EXPENSE' AND t."source" = 'EXPENSE' AND t."transactionDate" >= ${since}
        AND NOT EXISTS (SELECT 1 FROM "FundTransaction" r WHERE r."reversesId" = t."id")
      GROUP BY month`,
    prisma.payment.aggregate({
      where: { schoolId, status: "SUCCESS", paidAt: { gte: new Date(today.getTime() - 6 * 3_600_000) } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    // what is owed now this year: started months and one-time fees, unpaid or part paid
    prisma.studentFee.aggregate({
      where: {
        schoolId,
        academicYearId: yearId,
        status: { in: ["UNPAID", "PARTIAL"] },
        OR: [{ month: null }, { year: { lt: now.year } }, { year: now.year, month: { lte: now.month } }],
      },
      _sum: { amount: true, discountAmount: true, paidAmount: true },
    }),
  ]);
  const of = (rows: { month: string; total: Prisma.Decimal }[], m: string) => rows.find((r) => r.month === m)?.total ?? ZERO;
  const thisMonth = months[months.length - 1];
  const owed = (due._sum.amount ?? ZERO).minus(due._sum.discountAmount ?? ZERO).minus(due._sum.paidAmount ?? ZERO);
  return {
    today: { collected: (todayIn._sum.amount ?? ZERO).toFixed(2), payments: todayIn._count._all },
    thisMonth: { collected: new Prisma.Decimal(of(collected, thisMonth)).toFixed(2), spent: new Prisma.Decimal(of(spent, thisMonth)).toFixed(2) },
    dueNow: owed.toFixed(2),
    months: months.map((m) => ({ month: m, collected: new Prisma.Decimal(of(collected, m)).toFixed(2), spent: new Prisma.Decimal(of(spent, m)).toFixed(2) })),
  };
};

const recentPayments = (schoolId: string) =>
  prisma.payment.findMany({
    where: { schoolId },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    take: 6,
    select: {
      id: true,
      receiptNo: true,
      amount: true,
      method: true,
      status: true,
      paidAt: true,
      student: { select: { id: true, nameEn: true, nameBn: true } },
    },
  });

/* Holidays from today, the next 45 days: each once, with its first and last day. */
export const upcomingHolidays = async (schoolId: string) => {
  const from = todayInBangladesh();
  const to = new Date(from.getTime() + 45 * 86_400_000);
  const { days } = await CalendarService.getCalendar(schoolId, { from, to });
  const seen = new Map<string, { id: string; nameEn: string | null; nameBn: string | null; kind: string; type: string | null; from: string; to: string }>();
  for (const day of days) {
    for (const e of day.events) {
      const key = `${e.source}:${e.id}`;
      const found = seen.get(key);
      if (found) found.to = day.date;
      else seen.set(key, { id: key, nameEn: e.nameEn, nameBn: e.nameBn, kind: e.kind, type: e.type, from: day.date, to: day.date });
    }
  }
  return [...seen.values()].slice(0, 6);
};

const getSummary = async (auth: Auth) => {
  const schoolId = auth.schoolId!;
  const year = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true }, select: { id: true, name: true } });
  const [canStudents, canTeachers, canAttendance, canMoney, canPayments, canCalendar] = await Promise.all(
    ["student:view", "teacher:view", "attendance:view", "finance_report:view", "payment:view", "holiday:view"].map((c) => may(auth, c)),
  );

  const [studentsPart, teachersPart, attendancePart, moneyPart, paymentsPart, upcomingPart] = await Promise.all([
    canStudents && year ? people(schoolId, year.id) : null,
    canTeachers ? teachers(schoolId) : null,
    canAttendance && year ? attendanceToday(schoolId, year.id) : null,
    canMoney && year ? money(schoolId, year.id) : null,
    canPayments ? recentPayments(schoolId) : null,
    canCalendar ? upcomingHolidays(schoolId) : null,
  ]);

  // null: no permission (or no current year)
  return {
    academicYear: year,
    students: studentsPart,
    teachers: teachersPart,
    attendance: attendancePart,
    money: moneyPart,
    recentPayments: paymentsPart,
    upcoming: upcomingPart,
  };
};

export const DashboardService = { getSummary };
