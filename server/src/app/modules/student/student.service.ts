import httpStatus from "http-status";
import { Prisma } from "../../../../generated/prisma/client";
import type { StudentStatus } from "../../../../generated/prisma/enums";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import {
  currentMonth,
  generateStudentFees,
  getMidYearRule,
  realignAdmissionFees,
  removeUntouchedMonthlyFees,
} from "../studentFee/studentFee.service";
import type {
  ChangePlacementPayload,
  CreateStudentPayload,
  ListStudentsQuery,
  UpdateStudentPayload,
} from "./student.type";
import { isUniqueViolation } from "../../utils/prismaError";
import { DEFAULT_SECTION_NAME } from "../class/class.service";
import { NotificationService, notifyInBackground } from "../notification/notification.service";
import { processImage } from "../../shared/imageUpload";
import { deleteFile, fileKey, putFile, withFileUrls } from "../../shared/storage";
import { dayKey, todayInBangladesh } from "../../shared/scheduleSchemas";
import {
  type AccountResult,
  findOrCreateAccount,
  grantSchoolRole,
  GUARDIAN_ROLE,
  revokeSchoolRole,
} from "../../shared/schoolAccounts";

type Db = Prisma.TransactionClient;

const TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 };


const CONFLICT_MESSAGE =
  "A conflicting record already exists (admission number, same name with the same father's name, or roll number). Check the details and try again";

const enrollmentSelect = {
  id: true,
  academicYearId: true,
  rollNumber: true,
  status: true,
  enrolledAt: true,
  academicYear: { select: { id: true, name: true } },
  class: { select: { id: true, name: true } },
  section: { select: { id: true, name: true, isDefault: true } },
  group: { select: { id: true, nameEn: true, nameBn: true } },
  admissionType: true,
} satisfies Prisma.EnrollmentSelect;

const withEnrollments = {
  enrollments: {
    orderBy: { academicYear: { startDate: "desc" } },
    select: enrollmentSelect,
  },
} satisfies Prisma.StudentInclude;

// ------------------------------------------------------------------ accounts

/* Finds the account for this phone or creates one, then gives it the GUARDIAN role here. */
const provisionAccount = async (
  tx: Db,
  input: { schoolId: string; phone: string; fullname: string },
): Promise<AccountResult> => {
  const account = await findOrCreateAccount(tx, { phone: input.phone, fullname: input.fullname, password: "PHONE" });
  await grantSchoolRole(tx, input.schoolId, account.userId, GUARDIAN_ROLE);
  return account;
};

/*
 * Call after a student has been moved off an account. If that account has no other
 * student in this school it loses the GUARDIAN role here, and if that leaves it with
 * no role at all, its membership goes inactive.
 */
const deprovisionIfOrphaned = async (tx: Db, schoolId: string, userId: string) => {
  const remaining = await tx.student.count({ where: { schoolId, userId } });
  if (remaining > 0) return;

  await revokeSchoolRole(tx, schoolId, userId, GUARDIAN_ROLE.name);
};

const accountPayload = (
  account: AccountResult | null,
  loginPhone: string | null,
  siblingsInSchool: number,
) =>
  account
    ? {
        status: account.created ? ("CREATED" as const) : ("LINKED" as const),
        loginPhone,
        // a new account's password is its phone number (shown once); an existing one keeps its own
        password: account.password,
        siblingsInSchool,
      }
    : { status: "NONE" as const, loginPhone: null, password: null, siblingsInSchool: 0 };

// ------------------------------------------------------------------- helpers

const resolveAcademicYear = async (db: Db, schoolId: string, academicYearId?: string) => {
  const year = academicYearId
    ? await db.academicYear.findFirst({ where: { id: academicYearId, schoolId } })
    : await db.academicYear.findFirst({ where: { schoolId, isCurrent: true } });

  if (!year) {
    throw academicYearId
      ? new AppError("Academic year not found for this school", httpStatus.NOT_FOUND)
      : new AppError("No current academic year is set. Choose an academic year", httpStatus.BAD_REQUEST);
  }
  return year;
};

/*
 * An admission date is not in the future, and not after the end of the first academic year
 * the student is enrolled in here. It may be long before that year (an old student when the
 * school started using the system).
 */
const assertAdmissionDate = (firstYear: { name: string; endDate: Date }, day: Date) => {
  if (day.getTime() > todayInBangladesh().getTime()) {
    throw new AppError("The admission date cannot be in the future", httpStatus.BAD_REQUEST);
  }
  if (dayKey(day) > dayKey(firstYear.endDate)) {
    throw new AppError(`The admission date cannot be after ${firstYear.name} ends (${dayKey(firstYear.endDate)})`, httpStatus.BAD_REQUEST);
  }
};

/*
 * The section to use when none was chosen: a class without sections of its own has its
 * automatic "whole class" one (made again if it went missing). A class with sections needs
 * one of them chosen.
 */
const wholeClassSection = async (db: Db, schoolId: string, classId: string) => {
  const schoolClass = await db.schoolClass.findFirst({
    where: { id: classId, schoolId },
    select: { name: true, sections: { select: { id: true, isDefault: true } } },
  });
  if (!schoolClass) throw new AppError("Class not found for this school", httpStatus.NOT_FOUND);

  if (schoolClass.sections.some((s) => !s.isDefault)) {
    throw new AppError(`${schoolClass.name} has sections: choose one`, httpStatus.BAD_REQUEST);
  }
  const existing = schoolClass.sections[0];
  if (existing) return existing.id;
  // two admissions at once may both get here: skipDuplicates lets the second one wait for the
  // first and then use its section, instead of failing on the unique name
  await db.section.createMany({
    data: [{ schoolId, classId, name: DEFAULT_SECTION_NAME, isDefault: true }],
    skipDuplicates: true,
  });
  const section = await db.section.findFirstOrThrow({
    where: { schoolId, classId, name: DEFAULT_SECTION_NAME },
    select: { id: true },
  });
  return section.id;
};

/* When the first enrollment starts: the admission day, or the year's first day for an older student. */
const firstEnrollmentStart = (year: { startDate: Date }, admissionDate: Date) =>
  admissionDate.getTime() < year.startDate.getTime() ? year.startDate : admissionDate;

const assertPlacement = async (
  db: Db,
  schoolId: string,
  enr: { classId: string; sectionId: string; groupId?: string },
) => {
  const section = await db.section.findFirst({
    where: { id: enr.sectionId, classId: enr.classId, schoolId },
    select: { id: true },
  });
  if (!section) {
    throw new AppError(
      "Class or section not found, or the section does not belong to that class",
      httpStatus.BAD_REQUEST,
    );
  }
  if (enr.groupId) {
    const group = await db.group.findFirst({ where: { id: enr.groupId, schoolId }, select: { id: true } });
    if (!group) throw new AppError("Group not found for this school", httpStatus.NOT_FOUND);
  }
};

const assertNoClash = async (
  db: Db,
  schoolId: string,
  v: { admissionNo: string; nameEn: string; nameBn: string; fatherName: string },
  excludeStudentId?: string,
) => {
  const clash = await db.student.findFirst({
    where: {
      schoolId,
      ...(excludeStudentId ? { id: { not: excludeStudentId } } : {}),
      OR: [
        { admissionNo: v.admissionNo },
        { nameEn: v.nameEn, nameBn: v.nameBn, fatherName: v.fatherName },
      ],
    },
    select: { admissionNo: true },
  });
  if (clash) {
    throw new AppError(
      clash.admissionNo === v.admissionNo
        ? `Admission number ${v.admissionNo} is already in use`
        : "A student with the same name and father's name already exists",
      httpStatus.CONFLICT,
    );
  }
};

/*
 * Next number from the school's own counter, e.g. 20270001. The counter row is locked
 * until the transaction ends, so two admissions can't get the same number. A number
 * someone already typed in by hand is skipped.
 */
const nextAdmissionNo = async (tx: Db, schoolId: string, academicYearStart: Date) => {
  const year = academicYearStart.getFullYear();
  const key = `admission:${year}`;

  for (let i = 0; i < 20; i++) {
    const seq = await tx.schoolSequence.upsert({
      where: { schoolId_key: { schoolId, key } },
      update: { value: { increment: 1 } },
      create: { schoolId, key, value: 1 },
    });
    const admissionNo = `${year}${String(seq.value).padStart(4, "0")}`;

    const taken = await tx.student.findUnique({
      where: { schoolId_admissionNo: { schoolId, admissionNo } },
      select: { id: true },
    });
    if (!taken) return admissionNo;
  }
  throw new AppError(
    "Could not generate an admission number. Please enter one manually",
    httpStatus.INTERNAL_SERVER_ERROR,
  );
};

// -------------------------------------------------------------------- create

/*
 * Admits a student: profile, enrollment for the academic year, the login account (if a
 * phone was given) and every fee configured for that class and year, all in one
 * transaction. If anything fails, nothing is saved.
 */
const createStudent = async (schoolId: string, data: CreateStudentPayload) => {
  const { enrollment: enr, phone, admissionNo: givenAdmissionNo, ...profile } = data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const academicYear = await resolveAcademicYear(tx, schoolId, enr.academicYearId);
      // no section chosen: the class's whole-class section (only for a class without sections)
      const sectionId = enr.sectionId ?? (await wholeClassSection(tx, schoolId, enr.classId));
      await assertPlacement(tx, schoolId, { ...enr, sectionId });
      const admissionDate = data.admissionDate ?? todayInBangladesh();
      if (data.admissionDate) assertAdmissionDate(academicYear, data.admissionDate);

      if (enr.rollNumber) {
        const taken = await tx.enrollment.findFirst({
          where: {
            academicYearId: academicYear.id,
            sectionId,
            rollNumber: enr.rollNumber,
            status: "ACTIVE",
          },
          select: { id: true },
        });
        if (taken) {
          throw new AppError(
            `Roll number ${enr.rollNumber} is already used in this section`,
            httpStatus.CONFLICT,
          );
        }
      }

      // the account first: it is the slow part (password hashing) and needs no counter lock
      const account = phone
        ? await provisionAccount(tx, {
            schoolId,
            phone,
            fullname: profile.guardianName ?? profile.fatherName,
          })
        : null;

      const admissionNo = givenAdmissionNo ?? (await nextAdmissionNo(tx, schoolId, academicYear.startDate));
      await assertNoClash(tx, schoolId, {
        admissionNo,
        nameEn: profile.nameEn,
        nameBn: profile.nameBn,
        fatherName: profile.fatherName,
      });

      const student = await tx.student.create({
        data: {
          schoolId,
          admissionNo,
          ...profile,
          admissionDate,
          phone: phone ?? null,
          userId: account?.userId ?? null,
        },
      });

      await tx.enrollment.create({
        data: {
          studentId: student.id,
          academicYearId: academicYear.id,
          classId: enr.classId,
          sectionId,
          groupId: enr.groupId,
          rollNumber: enr.rollNumber,
          admissionType: enr.admissionType,
          // admitted today: now; an earlier admission date: that day. Never before the year's first
          // day (admitted in December for next year: from 1 January)
          enrolledAt: data.admissionDate ? firstEnrollmentStart(academicYear, data.admissionDate) : firstEnrollmentStart(academicYear, new Date()),
        },
      });

      // assign every configured fee for this class and year; nothing configured = nothing assigned
      await generateStudentFees(tx, {
        schoolId,
        studentIds: [student.id],
        academicYearId: academicYear.id,
        classId: enr.classId,
      });
      const feesAssigned = await tx.studentFee.count({
        where: { studentId: student.id, academicYearId: academicYear.id },
      });

      const siblingsInSchool = account
        ? await tx.student.count({
            where: { schoolId, userId: account.userId, id: { not: student.id } },
          })
        : 0;

      const saved = await tx.student.findUniqueOrThrow({
        where: { id: student.id },
        include: withEnrollments,
      });

      // a section's capacity is only a warning: the student is admitted either way
      const warnings: string[] = [];
      const sectionConfig = await tx.sectionYearConfig.findUnique({
        where: { sectionId_academicYearId: { sectionId, academicYearId: academicYear.id } },
        select: { capacity: true },
      });
      if (sectionConfig?.capacity != null) {
        const activeInSection = await tx.enrollment.count({
          where: { academicYearId: academicYear.id, sectionId, status: "ACTIVE" },
        });
        if (activeInSection > sectionConfig.capacity) {
          warnings.push(
            `This section now has ${activeInSection} students, more than its capacity of ${sectionConfig.capacity}`,
          );
        }
      }

      return {
        student: saved,
        account: accountPayload(account, phone ?? null, siblingsInSchool),
        feesAssigned, // 0 means no fee structure is set up yet for this class and year
        warnings,
      };
    }, TX_OPTIONS);

    // the family's welcome message, once the admission is saved
    notifyInBackground("admission", () => NotificationService.notifyAdmitted(schoolId, result.student.id));
    return result;
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError(CONFLICT_MESSAGE, httpStatus.CONFLICT);
    throw e;
  }
};

// -------------------------------------------------------------------- update

const hasLeft = (status: StudentStatus) => status === "INACTIVE" || status === "GRADUATED";

/*
 * After an update, the student's fees for the current year:
 * - left (inactive, graduated): unpaid monthly fees after this month are removed
 * - came back: monthly fees from this month on are assigned again
 * - admission date moved (when the school charges monthly fees from admission):
 *   unpaid months before the new admission month go, missing ones after it come
 */
const alignFees = async (
  tx: Db,
  schoolId: string,
  before: { id: string; status: StudentStatus; admissionDate: Date },
  change: { status?: StudentStatus; admissionDate?: Date },
) => {
  const status = change.status ?? before.status;
  const now = currentMonth();

  if (hasLeft(status) && !hasLeft(before.status)) {
    // the month they left is still charged, the months after are not
    await removeUntouchedMonthlyFees(tx, { schoolId, studentId: before.id, after: now });
    return;
  }

  const enrollment = await tx.enrollment.findFirst({
    where: { studentId: before.id, status: "ACTIVE", academicYear: { schoolId, isCurrent: true } },
    select: { academicYearId: true, classId: true },
  });
  if (!enrollment || hasLeft(status)) return;
  const target = { schoolId, studentIds: [before.id], ...enrollment };

  if (hasLeft(before.status)) {
    await generateStudentFees(tx, { ...target, fromMonth: now });
    return;
  }

  const moved = change.admissionDate && change.admissionDate.getTime() !== before.admissionDate.getTime();
  if (moved && (await getMidYearRule(tx, schoolId)) === "FROM_ADMISSION") {
    await removeUntouchedMonthlyFees(tx, {
      schoolId,
      studentId: before.id,
      academicYearId: enrollment.academicYearId,
      before: { year: change.admissionDate!.getUTCFullYear(), month: change.admissionDate!.getUTCMonth() + 1 },
    });
    await generateStudentFees(tx, target);
  }
};

const updateStudent = async (schoolId: string, studentId: string, data: UpdateStudentPayload) => {
  const { phone, admissionDate, ...rest } = data;

  try {
    return await prisma.$transaction(async (tx) => {
      const student = await tx.student.findFirst({ where: { id: studentId, schoolId } });
      if (!student) throw new AppError("Student not found", httpStatus.NOT_FOUND);

      // the first year here starts from the admission date (or that year's first day)
      if (admissionDate) {
        const first = await tx.enrollment.findFirst({
          where: { studentId },
          orderBy: { academicYear: { startDate: "asc" } },
          select: { id: true, academicYear: { select: { name: true, startDate: true, endDate: true } } },
        });
        if (first) {
          assertAdmissionDate(first.academicYear, admissionDate);
          await tx.enrollment.update({ where: { id: first.id }, data: { enrolledAt: firstEnrollmentStart(first.academicYear, admissionDate) } });
        } else if (admissionDate.getTime() > todayInBangladesh().getTime()) {
          throw new AppError("The admission date cannot be in the future", httpStatus.BAD_REQUEST);
        }
      }

      if (
        rest.admissionNo !== undefined ||
        rest.nameEn !== undefined ||
        rest.nameBn !== undefined ||
        rest.fatherName !== undefined
      ) {
        await assertNoClash(
          tx,
          schoolId,
          {
            admissionNo: rest.admissionNo ?? student.admissionNo,
            nameEn: rest.nameEn ?? student.nameEn,
            nameBn: rest.nameBn ?? student.nameBn,
            fatherName: rest.fatherName ?? student.fatherName,
          },
          studentId,
        );
      }

      // a new number, a removed number, or the same number but no account yet
      let account: AccountResult | null = null;
      let newUserId: string | null | undefined; // undefined = account link unchanged

      if (phone !== undefined && (phone !== student.phone || (phone !== null && !student.userId))) {
        if (phone === null) {
          newUserId = null;
        } else {
          account = await provisionAccount(tx, {
            schoolId,
            phone,
            fullname:
              rest.guardianName ?? student.guardianName ?? rest.fatherName ?? student.fatherName,
          });
          newUserId = account.userId;
        }
      }

      await tx.student.update({
        where: { id: studentId },
        data: {
          ...rest,
          ...(admissionDate ? { admissionDate } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(newUserId !== undefined ? { userId: newUserId } : {}),
        },
      });

      // the account this student left may now have nobody to look after in this school
      if (student.userId && newUserId !== undefined && newUserId !== student.userId) {
        await deprovisionIfOrphaned(tx, schoolId, student.userId);
      }

      // the fees follow the student: leaving, coming back, a moved admission date
      await alignFees(tx, schoolId, student, { status: rest.status, admissionDate });

      const saved = await tx.student.findUniqueOrThrow({
        where: { id: studentId },
        include: withEnrollments,
      });

      const siblingsInSchool = account
        ? await tx.student.count({
            where: { schoolId, userId: account.userId, id: { not: studentId } },
          })
        : 0;

      return {
        student: await withFileUrls(saved, ["photo"]),
        // only present when this update created or linked an account
        account: account ? accountPayload(account, phone ?? null, siblingsInSchool) : null,
      };
    }, TX_OPTIONS);
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError(CONFLICT_MESSAGE, httpStatus.CONFLICT);
    throw e;
  }
};

// ----------------------------------------------------------------- placement

/*
 * Moves a student to another section, group or roll number in the current academic
 * year, inside the same class. Changing class is a promotion, done elsewhere.
 */
const changePlacement = async (schoolId: string, studentId: string, data: ChangePlacementPayload) => {
  const admissionFees = await prisma.$transaction(async (tx) => {
    const year = await resolveAcademicYear(tx, schoolId);
    const enrollment = await tx.enrollment.findFirst({
      where: { studentId, academicYearId: year.id, student: { schoolId } },
    });
    if (!enrollment) {
      throw new AppError(`This student isn't enrolled in ${year.name}`, httpStatus.NOT_FOUND);
    }

    const sectionId = data.sectionId ?? enrollment.sectionId;
    const groupId = data.groupId === undefined ? enrollment.groupId : data.groupId;
    const rollNumber = data.rollNumber === undefined ? enrollment.rollNumber : data.rollNumber;
    await assertPlacement(tx, schoolId, { classId: enrollment.classId, sectionId, groupId: groupId ?? undefined });

    if (rollNumber && (rollNumber !== enrollment.rollNumber || sectionId !== enrollment.sectionId)) {
      const taken = await tx.enrollment.findFirst({
        where: { academicYearId: year.id, sectionId, rollNumber, status: "ACTIVE", id: { not: enrollment.id } },
        select: { id: true },
      });
      if (taken) {
        throw new AppError(`Roll number ${rollNumber} is already used in this section`, httpStatus.CONFLICT);
      }
    }

    const admissionType = data.admissionType ?? enrollment.admissionType;
    await tx.enrollment.update({ where: { id: enrollment.id }, data: { sectionId, groupId, rollNumber, admissionType } });

    // new <-> old: the admission fee and the re-admission fee swap (unpaid ones only)
    if (admissionType === enrollment.admissionType) return null;
    return realignAdmissionFees(tx, {
      schoolId,
      studentId,
      academicYearId: year.id,
      classId: enrollment.classId,
      admissionType,
    });
  }, TX_OPTIONS);

  // only when the admission type changed: fees removed, and fees kept because they have payments
  return { ...(await getStudentById(schoolId, studentId)), admissionFees };
};

// ------------------------------------------------------------------- reading

const getStudentById = async (schoolId: string, studentId: string) => {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    include: {
      ...withEnrollments,
      user: { select: { id: true, phone: true, isActive: true } },
    },
  });
  if (!student) throw new AppError("Student not found", httpStatus.NOT_FOUND);

  const { user, ...rest } = student;
  const siblingsInSchool = student.userId
    ? await prisma.student.count({
        where: { schoolId, userId: student.userId, id: { not: studentId } },
      })
    : 0;

  return {
    ...(await withFileUrls(rest, ["photo"])),
    account: {
      hasAccount: user !== null,
      userId: user?.id ?? null,
      loginPhone: user?.phone ?? null,
      isActive: user?.isActive ?? null,
      siblingsInSchool,
    },
  };
};

const getStudents = async (schoolId: string, query: ListStudentsQuery) => {
  const {
    search,
    status,
    gender,
    religion,
    academicYearId,
    classId,
    sectionId,
    groupId,
    admissionType,
    hasAccount,
    withStatusCounts,
    sortBy,
    sortOrder,
    page,
    limit,
  } = query;

  const yearId =
    academicYearId ??
    (await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true }, select: { id: true } }))?.id;

  const placementFilter = Boolean(classId || sectionId || groupId || admissionType);
  if (placementFilter && !yearId) {
    throw new AppError(
      "No current academic year is set. Choose an academic year to filter by class, section or group",
      httpStatus.BAD_REQUEST,
    );
  }

  // every filter but the status: the status counts are taken over these
  const filtered: Prisma.StudentWhereInput = {
    schoolId,
    ...(gender ? { gender } : {}),
    ...(religion ? { religion } : {}),
    ...(hasAccount ? { userId: hasAccount === "true" ? { not: null } : null } : {}),
    ...(search
      ? {
          OR: [
            { nameEn: { contains: search, mode: "insensitive" } },
            { nameBn: { contains: search, mode: "insensitive" } },
            { admissionNo: { contains: search, mode: "insensitive" } },
            { fatherName: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
            { guardianPhone: { contains: search } },
          ],
        }
      : {}),
    ...(placementFilter || academicYearId
      ? {
          enrollments: {
            some: {
              academicYearId: yearId,
              ...(classId ? { classId } : {}),
              ...(sectionId ? { sectionId } : {}),
              ...(groupId ? { groupId } : {}),
              ...(admissionType ? { admissionType } : {}),
            },
          },
        }
      : {}),
  };
  const where: Prisma.StudentWhereInput = { ...filtered, ...(status ? { status } : {}) };

  const [rows, total, byStatus] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy: [{ [sortBy]: sortOrder } as Prisma.StudentOrderByWithRelationInput, { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        // the enrollment for the chosen (or current) year, else the latest one
        enrollments: {
          where: yearId ? { academicYearId: yearId } : undefined,
          orderBy: { academicYear: { startDate: "desc" } },
          take: 1,
          select: enrollmentSelect,
        },
      },
    }),
    prisma.student.count({ where }),
    // asked for by the students page: how many each status has under the other filters
    withStatusCounts === "true" ? prisma.student.groupBy({ by: ["status"], where: filtered, _count: { _all: true } }) : null,
  ]);

  const items = await Promise.all(
    rows.map(async ({ enrollments, ...student }) => ({
      ...(await withFileUrls(student, ["photo"])),
      hasAccount: student.userId !== null,
      enrollment: enrollments[0] ?? null,
    })),
  );

  const statusCounts = byStatus
    ? Object.fromEntries(
        (["ACTIVE", "INACTIVE", "SUSPENDED", "GRADUATED"] as const satisfies readonly StudentStatus[]).map((s) => [
          s,
          byStatus.find((g) => g.status === s)?._count._all ?? 0,
        ]),
      )
    : undefined;

  return { items, ...(statusCounts ? { statusCounts } : {}), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

// ------------------------------------------------------------------- photo

const findStudent = async (schoolId: string, studentId: string) => {
  const student = await prisma.student.findFirst({ where: { id: studentId, schoolId }, select: { id: true, photo: true } });
  if (!student) throw new AppError("Student not found", httpStatus.NOT_FOUND);
  return student;
};

/* Stores a new photo (resized to 400 px) and drops the old one. */
const setPhoto = async (schoolId: string, studentId: string, upload: Buffer) => {
  const student = await findStudent(schoolId, studentId);
  const image = await processImage(upload, "photo");
  const key = fileKey(`schools/${schoolId}/students/${studentId}`, "photo", image.extension);

  await putFile(key, image.body, image.contentType);
  const updated = await prisma.student.update({ where: { id: studentId }, data: { photo: key }, include: withEnrollments });
  await deleteFile(student.photo);
  return withFileUrls(updated, ["photo"]);
};

const removePhoto = async (schoolId: string, studentId: string) => {
  const student = await findStudent(schoolId, studentId);
  const updated = await prisma.student.update({ where: { id: studentId }, data: { photo: null }, include: withEnrollments });
  await deleteFile(student.photo);
  return updated;
};

export const StudentService = {
  changePlacement,
  setPhoto,
  removePhoto,
  createStudent,
  updateStudent,
  getStudentById,
  getStudents,
};