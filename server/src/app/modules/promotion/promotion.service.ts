import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { endOfBangladeshDay } from "../../shared/scheduleSchemas";
import { NotificationService, notifyInBackground, type PromotionMove } from "../notification/notification.service";
import { currentMonth, generateStudentFees, removeUntouchedMonthlyFees } from "../studentFee/studentFee.service";
import type { PromotePayload, PromotionPreviewQuery } from "./promotion.validation";

/*
 * End of year: each student of a class moves up to the next class, repeats the class,
 * graduates (the last class) or leaves. The new year's enrollment starts as an OLD
 * admission (they pay the re-admission fee), with no roll number yet. This year's
 * enrollment is closed with what happened and the year's last day, so this year's
 * attendance, exams and fees stay as they were.
 */

type Db = Prisma.TransactionClient;
const TX_OPTIONS = { maxWait: 10_000, timeout: 120_000 };

const sectionSelect = { id: true, name: true, isDefault: true } as const;

/* The year being finished (the current one by default) and the year after it, if made yet. */
const resolveYears = async (db: Db, schoolId: string, academicYearId?: string) => {
  const from = academicYearId
    ? await db.academicYear.findFirst({ where: { id: academicYearId, schoolId } })
    : await db.academicYear.findFirst({ where: { schoolId, isCurrent: true } });
  if (!from) {
    throw academicYearId
      ? new AppError("Academic year not found for this school", httpStatus.NOT_FOUND)
      : new AppError("No current academic year is set. Choose an academic year", httpStatus.BAD_REQUEST);
  }
  const to = await db.academicYear.findFirst({
    where: { schoolId, startDate: { gt: from.startDate } },
    orderBy: { startDate: "asc" },
  });
  return { from, to };
};

/* The class, and the next one up (none for the last class: its students graduate). */
const resolveClasses = async (db: Db, schoolId: string, classId: string) => {
  const schoolClass = await db.schoolClass.findFirst({
    where: { id: classId, schoolId },
    select: { id: true, name: true, numericLevel: true, sections: { select: sectionSelect, orderBy: { name: "asc" } } },
  });
  if (!schoolClass) throw new AppError("Class not found for this school", httpStatus.NOT_FOUND);
  const nextClass = await db.schoolClass.findFirst({
    where: { schoolId, numericLevel: { gt: schoolClass.numericLevel } },
    orderBy: { numericLevel: "asc" },
    select: { id: true, name: true, numericLevel: true, sections: { select: sectionSelect, orderBy: { name: "asc" } } },
  });
  return { schoolClass, nextClass };
};

// ------------------------------------------------------------------- preview

/*
 * The class's students this year with their final result (pass/fail, position) when
 * one is published, and for those already done, where they went.
 */
const getPreview = async (schoolId: string, query: PromotionPreviewQuery) => {
  const { from, to } = await resolveYears(prisma, schoolId, query.academicYearId);
  const { schoolClass, nextClass } = await resolveClasses(prisma, schoolId, query.classId);

  const formulas = await prisma.finalResultFormula.findMany({
    where: { schoolId, academicYearId: from.id, classId: schoolClass.id, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    select: { id: true, nameEn: true, nameBn: true, publishedAt: true },
  });
  const formulaId = query.formulaId && formulas.some((f) => f.id === query.formulaId) ? query.formulaId : formulas[0]?.id;

  const enrollments = await prisma.enrollment.findMany({
    where: { academicYearId: from.id, classId: schoolClass.id, student: { schoolId } },
    select: {
      id: true,
      status: true,
      rollNumber: true,
      section: { select: sectionSelect },
      student: { select: { id: true, nameEn: true, nameBn: true, admissionNo: true, status: true } },
    },
  });
  const studentIds = enrollments.map((e) => e.student.id);
  const [results, nextYear] = await Promise.all([
    formulaId
      ? prisma.finalResult.findMany({
          where: { formulaId },
          select: { enrollmentId: true, passed: true, gpa: true, grade: true, classPosition: true, sectionPosition: true },
        })
      : [],
    to
      ? prisma.enrollment.findMany({
          where: { academicYearId: to.id, studentId: { in: studentIds } },
          select: { studentId: true, class: { select: { name: true } }, section: { select: sectionSelect } },
        })
      : [],
  ]);
  const resultOf = new Map(results.map((r) => [r.enrollmentId, r]));
  const nextOf = new Map(nextYear.map((e) => [e.studentId, e]));

  enrollments.sort(
    (a, b) => a.section.name.localeCompare(b.section.name) || (a.rollNumber ?? "").localeCompare(b.rollNumber ?? "", undefined, { numeric: true }),
  );

  return {
    fromYear: { id: from.id, name: from.name, endDate: from.endDate },
    // null: the next academic year hasn't been made yet
    toYear: to && { id: to.id, name: to.name },
    class: { id: schoolClass.id, name: schoolClass.name, sections: schoolClass.sections },
    // null: the last class (its students graduate)
    nextClass: nextClass && { id: nextClass.id, name: nextClass.name, sections: nextClass.sections },
    formulas,
    formulaId: formulaId ?? null,
    students: enrollments.map((e) => {
      const r = resultOf.get(e.id);
      const next = nextOf.get(e.student.id);
      return {
        enrollmentId: e.id,
        // ACTIVE: still to decide; PROMOTED / REPEATED / GRADUATED / WITHDRAWN: done
        status: e.status,
        student: e.student,
        rollNumber: e.rollNumber,
        section: e.section,
        result: r ? { passed: r.passed, gpa: r.gpa, grade: r.grade, classPosition: r.classPosition, sectionPosition: r.sectionPosition } : null,
        // where they are next year, once done
        next: next ? { className: next.class.name, section: next.section } : null,
      };
    }),
  };
};

// ------------------------------------------------------------------- promote

const promote = async (schoolId: string, data: PromotePayload) => {
  const { result, moves, toYearId, fromClassName } = await prisma.$transaction(async (tx) => {
    const { from, to } = await resolveYears(tx, schoolId, data.academicYearId);
    if (!to) throw new AppError("Make the next academic year first: students move into it", httpStatus.BAD_REQUEST);
    const { schoolClass, nextClass } = await resolveClasses(tx, schoolId, data.classId);

    const enrollments = await tx.enrollment.findMany({
      where: { id: { in: data.students.map((s) => s.enrollmentId) }, academicYearId: from.id, classId: schoolClass.id, student: { schoolId } },
      select: { id: true, status: true, studentId: true, sectionId: true, groupId: true },
    });
    if (enrollments.length !== data.students.length) {
      throw new AppError("One or more students are not in this class this year", httpStatus.BAD_REQUEST);
    }
    if (enrollments.some((e) => e.status !== "ACTIVE")) {
      throw new AppError("One or more students have already been moved on. Reload the list", httpStatus.CONFLICT);
    }
    const already = await tx.enrollment.count({
      where: { academicYearId: to.id, studentId: { in: enrollments.map((e) => e.studentId) } },
    });
    if (already > 0) throw new AppError(`One or more students are already enrolled in ${to.name}`, httpStatus.CONFLICT);

    // a class without sections has only its automatic one
    const onlySection = (sections: { id: string; isDefault: boolean }[]) => (sections.length === 1 ? sections[0].id : undefined);
    const byId = new Map(enrollments.map((e) => [e.id, e]));
    const leftAt = endOfBangladeshDay(from.endDate);
    const now = currentMonth();
    const moved = { PROMOTE: [] as string[], REPEAT: [] as string[] };
    const counts = { promoted: 0, repeated: 0, graduated: 0, left: 0 };
    // who gets a message: the promoted and the graduates
    const moves: PromotionMove[] = [];

    for (const choice of data.students) {
      const e = byId.get(choice.enrollmentId)!;

      if (choice.action === "PROMOTE" || choice.action === "REPEAT") {
        const target = choice.action === "PROMOTE" ? nextClass : schoolClass;
        if (!target) throw new AppError(`${schoolClass.name} is the last class: its students graduate`, httpStatus.BAD_REQUEST);
        const sectionId =
          choice.sectionId ??
          (choice.action === "PROMOTE" ? (data.sectionId ?? onlySection(target.sections)) : e.sectionId);
        if (!sectionId) throw new AppError(`Choose the section of ${target.name} for students moving up`, httpStatus.BAD_REQUEST);
        if (!target.sections.some((s) => s.id === sectionId)) {
          throw new AppError(`That section is not in ${target.name}`, httpStatus.BAD_REQUEST);
        }
        await tx.enrollment.create({
          data: {
            studentId: e.studentId,
            academicYearId: to.id,
            classId: target.id,
            sectionId,
            groupId: e.groupId,
            // set by the office later
            rollNumber: null,
            // already a student of the school: the re-admission fee, not the admission fee
            admissionType: "OLD",
            enrolledAt: to.startDate,
          },
        });
        await tx.enrollment.update({ where: { id: e.id }, data: { status: choice.action === "PROMOTE" ? "PROMOTED" : "REPEATED", leftAt } });
        moved[choice.action].push(e.studentId);
        counts[choice.action === "PROMOTE" ? "promoted" : "repeated"]++;
        if (choice.action === "PROMOTE") moves.push({ enrollmentId: e.id, studentId: e.studentId, outcome: "PROMOTED" });
      } else {
        const graduate = choice.action === "GRADUATE";
        await tx.enrollment.update({ where: { id: e.id }, data: { status: graduate ? "GRADUATED" : "WITHDRAWN", leftAt } });
        await tx.student.update({ where: { id: e.studentId }, data: { status: graduate ? "GRADUATED" : "INACTIVE" } });
        // like leaving: unpaid monthly fees after this month go
        await removeUntouchedMonthlyFees(tx, { schoolId, studentId: e.studentId, after: now });
        counts[graduate ? "graduated" : "left"]++;
        if (graduate) moves.push({ enrollmentId: e.id, studentId: e.studentId, outcome: "GRADUATED" });
      }
    }

    // next year's fees for those who stay (none until the year's class fees are set)
    if (moved.PROMOTE.length > 0 && nextClass) {
      await generateStudentFees(tx, { schoolId, studentIds: moved.PROMOTE, academicYearId: to.id, classId: nextClass.id });
    }
    if (moved.REPEAT.length > 0) {
      await generateStudentFees(tx, { schoolId, studentIds: moved.REPEAT, academicYearId: to.id, classId: schoolClass.id });
    }

    return {
      result: { fromYear: { id: from.id, name: from.name }, toYear: { id: to.id, name: to.name }, ...counts },
      moves,
      toYearId: to.id,
      fromClassName: schoolClass.name,
    };
  }, TX_OPTIONS);

  notifyInBackground("promotion", () => NotificationService.notifyPromotion(schoolId, moves, { toYearId, fromClassName }));
  return result;
};

// ---------------------------------------------------------------------- undo

/*
 * Takes back one student's move: next year's enrollment (and its unpaid fees) goes and
 * this year's is active again; a student who graduated or left is active again. Refused
 * once next year has money paid or other records (attendance, marks) for the student.
 */
const undo = async (schoolId: string, enrollmentId: string) => {
  const result = await prisma.$transaction(async (tx) => {
    const old = await tx.enrollment.findFirst({
      where: { id: enrollmentId, student: { schoolId } },
      select: { id: true, status: true, studentId: true, classId: true, academicYearId: true, academicYear: { select: { startDate: true } } },
    });
    if (!old) throw new AppError("Enrollment not found", httpStatus.NOT_FOUND);
    if (old.status === "ACTIVE") throw new AppError("This student hasn't been moved yet", httpStatus.CONFLICT);

    const to = await tx.academicYear.findFirst({
      where: { schoolId, startDate: { gt: old.academicYear.startDate } },
      orderBy: { startDate: "asc" },
      select: { id: true },
    });
    if (to) {
      const paid = await tx.studentFee.count({
        where: { studentId: old.studentId, academicYearId: to.id, OR: [{ paidAmount: { gt: 0 } }, { allocations: { some: {} } }] },
      });
      if (paid > 0) throw new AppError("Money has already been paid for next year, so this can't be undone", httpStatus.CONFLICT);
      // a class teacher's remark would be deleted with the enrollment (attendance and marks block it themselves)
      const remarks = await tx.examRemark.count({ where: { enrollment: { studentId: old.studentId, academicYearId: to.id } } });
      if (remarks > 0) throw new AppError("Next year already has records for this student (remarks), so this can't be undone", httpStatus.CONFLICT);
      await tx.studentFee.deleteMany({ where: { studentId: old.studentId, academicYearId: to.id } });
      try {
        await tx.enrollment.deleteMany({ where: { studentId: old.studentId, academicYearId: to.id } });
      } catch {
        throw new AppError("Next year already has records for this student (attendance, marks…), so this can't be undone", httpStatus.CONFLICT);
      }
    }

    await tx.enrollment.update({ where: { id: old.id }, data: { status: "ACTIVE", leftAt: null } });
    if (old.status === "GRADUATED" || old.status === "WITHDRAWN") {
      await tx.student.update({ where: { id: old.studentId }, data: { status: "ACTIVE" } });
      // the months removed when they left come back from this month on
      await generateStudentFees(tx, {
        schoolId,
        studentIds: [old.studentId],
        academicYearId: old.academicYearId,
        classId: old.classId,
        fromMonth: currentMonth(),
      });
    }
    return { enrollmentId: old.id, status: "ACTIVE" as const };
  }, TX_OPTIONS);

  // the "promoted" or "graduated" message goes with the move
  notifyInBackground("promotion undone", () => NotificationService.withdrawPromotion(schoolId, result.enrollmentId));
  return result;
};

export const PromotionService = { getPreview, promote, undo };
