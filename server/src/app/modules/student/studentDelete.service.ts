import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { writeAuditLog } from "../../shared/auditLog";
import { assertDeletable, blocker, deleteCheck } from "../../shared/deleteCheck";
import type { OptionalReasonQuery } from "../../shared/deleteSchemas";
import { countEnrollmentRecords, deleteEnrollments, studentMoney } from "../../shared/moneyGuard";
import { displayName } from "../../shared/names";
import { GUARDIAN_ROLE, revokeSchoolRole } from "../../shared/schoolAccounts";
import { deleteFile } from "../../shared/storage";
import { isForeignKeyViolation } from "../../utils/prismaError";
import { queueDeviceRemoval } from "../attendanceDevice/people.service";

/*
 * Deleting a student, with everything of theirs: attendance, marks, results, enrollments,
 * fees not paid, homework ticks, notifications, the device entry. Refused while the student
 * has money data (any payment, online payment, fee paid or discounted): that student stays,
 * and leaves the school by a status change instead.
 */

type Db = Prisma.TransactionClient | typeof prisma;
type Auth = NonNullable<Express.Request["auth"]>;

const TX_OPTIONS = { maxWait: 10_000, timeout: 60_000 };
const HINT = "A student with money records stays: change their status (inactive or withdrawn) instead";

const check = async (db: Db, studentId: string) => {
  const [money, records, fees] = await Promise.all([
    studentMoney(db, [studentId]),
    countEnrollmentRecords(db, { studentId }),
    db.studentFee.count({ where: { studentId } }),
  ]);
  return deleteCheck(
    [
      blocker("payments", money.payments, `${money.payments} payment(s)`),
      blocker("onlinePayments", money.onlinePayments, `${money.onlinePayments} online payment(s)`),
      blocker("paidFees", money.fees, `${money.fees} fee(s) paid or discounted`),
    ],
    { ...records, unpaidFees: fees },
  );
};

const findStudent = async (db: Db, schoolId: string, studentId: string) => {
  const student = await db.student.findFirst({
    where: { id: studentId, schoolId },
    include: { enrollments: true, devicePerson: { select: { pin: true } } },
  });
  if (!student) throw new AppError("Student not found", httpStatus.NOT_FOUND);
  return student;
};

const deleteCheckFor = async (schoolId: string, studentId: string) => {
  await findStudent(prisma, schoolId, studentId);
  return check(prisma, studentId);
};

const deleteStudent = async (auth: Auth, studentId: string, query: OptionalReasonQuery) => {
  const schoolId = auth.schoolId!;
  let photo: string | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      // lock the student so a payment can't slip in while it goes
      await tx.$queryRaw`SELECT "id" FROM "Student" WHERE "id" = ${studentId} AND "schoolId" = ${schoolId} FOR UPDATE`;
      const student = await findStudent(tx, schoolId, studentId);
      const result = await check(tx, studentId);
      assertDeletable(result, HINT);

      const fees = await tx.studentFee.findMany({ where: { studentId } });
      await deleteEnrollments(tx, { studentId });
      await tx.studentFee.deleteMany({ where: { studentId } });
      if (student.devicePerson) await queueDeviceRemoval(tx, schoolId, student.devicePerson.pin);
      await tx.student.delete({ where: { id: studentId } });

      // the family login loses this school if it was its only child here
      if (student.userId && (await tx.student.count({ where: { schoolId, userId: student.userId } })) === 0) {
        await revokeSchoolRole(tx, schoolId, student.userId, GUARDIAN_ROLE.name);
      }

      await writeAuditLog(tx, auth, {
        action: "student.delete",
        entityType: "Student",
        entityId: studentId,
        summary: `${displayName(student)} (${student.admissionNo})`,
        reason: query.reason,
        snapshot: { student, fees, removed: result.willRemove },
      });
      photo = student.photo;
    }, TX_OPTIONS);
  } catch (e) {
    if (isForeignKeyViolation(e)) throw new AppError(`This student has records that must be kept. ${HINT}`, httpStatus.CONFLICT);
    throw e;
  }

  await deleteFile(photo);
  return { id: studentId };
};

export const StudentDeleteService = { deleteCheck: deleteCheckFor, deleteStudent };
