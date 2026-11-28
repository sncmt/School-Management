import type { Prisma } from "../../../generated/prisma/client";
import { prisma } from "../../../lib/prisma";

/*
 * The one rule of deleting: money data is never deleted.
 * - A fee has money data once anything was paid on it or a discount was given.
 * - A student has money data with any payment (cancelled ones too), any online payment, or
 *   any fee with money data. Such a student can't be deleted.
 * Deletes that take other records with them remove only untouched fees; a fee with money
 * data stays, detached from the class or fee setup that goes (those relations are SetNull).
 */

type Db = Prisma.TransactionClient | typeof prisma;

export const feeWithMoney: Prisma.StudentFeeWhereInput = {
  OR: [{ paidAmount: { gt: 0 } }, { discountAmount: { gt: 0 } }, { allocations: { some: {} } }],
};

export const untouchedFee: Prisma.StudentFeeWhereInput = { paidAmount: 0, discountAmount: 0, allocations: { none: {} } };

/* How much money data the students have (all zero: they can be deleted). */
export const studentMoney = async (db: Db, studentIds: string[]) => {
  const [payments, onlinePayments, fees] = await Promise.all([
    db.payment.count({ where: { studentId: { in: studentIds } } }),
    db.onlinePayment.count({ where: { studentId: { in: studentIds } } }),
    db.studentFee.count({ where: { studentId: { in: studentIds }, ...feeWithMoney } }),
  ]);
  return { payments, onlinePayments, fees, any: payments + onlinePayments + fees > 0 };
};

/*
 * Removes enrollments and everything that hangs on them: attendance records, marks and exam
 * results (these hold on with Restrict, so they go first), then the enrollments;
 * homework ticks, remarks, seats and optional subjects follow by cascade. The untouched class
 * fees of the student in that year and class go too. Fees with money data, and custom fees,
 * stay.
 */
export const deleteEnrollments = async (tx: Prisma.TransactionClient, where: Prisma.EnrollmentWhereInput) => {
  const enrollments = await tx.enrollment.findMany({
    where,
    select: { id: true, studentId: true, academicYearId: true, classId: true },
  });
  if (enrollments.length === 0) return { enrollments: 0, attendance: 0, marks: 0, results: 0, fees: 0 };
  const ids = enrollments.map((e) => e.id);

  const attendance = await tx.studentAttendance.deleteMany({ where: { enrollmentId: { in: ids } } });
  const marks = await tx.examMark.deleteMany({ where: { enrollmentId: { in: ids } } });
  const results = await tx.examResult.deleteMany({ where: { enrollmentId: { in: ids } } });
  await tx.enrollment.deleteMany({ where: { id: { in: ids } } });
  const fees = await tx.studentFee.deleteMany({
    where: {
      ...untouchedFee,
      // class fees only: a custom fee (a fine, a trip) belongs to the student and stays
      feeStructureId: { not: null },
      OR: enrollments.map((e) => ({ studentId: e.studentId, academicYearId: e.academicYearId, classId: e.classId })),
    },
  });

  return {
    enrollments: ids.length,
    attendance: attendance.count,
    marks: marks.count,
    results: results.count,
    fees: fees.count,
  };
};

/* What deleteEnrollments would remove, for the confirm dialog. */
export const countEnrollmentRecords = async (db: Db, where: Prisma.EnrollmentWhereInput) => {
  const [enrollments, attendance, marks, results] = await Promise.all([
    db.enrollment.count({ where }),
    db.studentAttendance.count({ where: { enrollment: where } }),
    db.examMark.count({ where: { enrollment: where } }),
    db.examResult.count({ where: { enrollment: where } }),
  ]);
  return { enrollments, attendance, marks, results };
};
