import { randomUUID } from "crypto";
import httpStatus from "http-status";
import { Prisma } from "../../../../generated/prisma/client";
import type { Religion } from "../../../../generated/prisma/enums";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { checkPermission } from "../../middlewares/authorize";
import { prepareAttachment } from "../../shared/attachmentUpload";
import { dayKey, endOfBangladeshDay, todayInBangladesh } from "../../shared/scheduleSchemas";
import { GUARDIAN_ROLE } from "../../shared/schoolAccounts";
import { deleteFile, fileKey, fileUrl, putFile } from "../../shared/storage";
import { WORKING_STATUSES } from "../teacher/teacher.service";
import type { CreateHomeworkPayload, FamilyHomeworkQuery, HomeworkListQuery, SaveChecksPayload, UpdateHomeworkPayload } from "./homework.validation";

/*
 * Homework for one subject of a class, given to some of its sections. Who may do what:
 *  - a subject teacher gives, edits and ticks homework for their own subjects and sections
 *  - homework:manage does that for every section; homework:view sees all of it
 *  - a class teacher sees the homework of their sections
 *  - a family login sees its children's homework and how each was ticked
 * A student gets a subject's homework by the same rules as its exams: a group subject only
 * for that group, a religion subject only for that religion, an optional (4th) subject only
 * for the students who chose it.
 */

type Auth = NonNullable<Express.Request["auth"]>;

const MAX_ATTACHMENTS = 5;

const may = async (auth: Auth, code: string) => (await checkPermission(auth, code)) === "OK";

// ------------------------------------------------------------------ access

type Pair = { classSubjectId: string; sectionId: string };

/* The person's reach: everything, or the subjects/sections they teach and the sections they are class teacher of. */
const reachOf = async (auth: Auth) => {
  const [manageAll, viewAll] = await Promise.all([may(auth, "homework:manage"), may(auth, "homework:view")]);
  if (manageAll) return { manageAll: true, viewAll: true, pairs: [] as Pair[], classTeacherOf: [] as string[] };
  if (!auth.membershipId) return { manageAll: false, viewAll, pairs: [], classTeacherOf: [] };

  const [pairs, classTeacher] = await Promise.all([
    prisma.subjectTeacher.findMany({
      where: { schoolId: auth.schoolId!, teacher: { membershipId: auth.membershipId, status: { in: WORKING_STATUSES } } },
      select: { classSubjectId: true, sectionId: true },
    }),
    prisma.sectionYearConfig.findMany({
      where: { classTeacherMembershipId: auth.membershipId, section: { schoolId: auth.schoolId! } },
      select: { sectionId: true },
    }),
  ]);
  return { manageAll: false, viewAll, pairs, classTeacherOf: classTeacher.map((c) => c.sectionId) };
};

type Reach = Awaited<ReturnType<typeof reachOf>>;

const teaches = (reach: Reach, classSubjectId: string, sectionId: string) =>
  reach.manageAll || reach.pairs.some((p) => p.classSubjectId === classSubjectId && p.sectionId === sectionId);

/* May give or tick this homework: every one of its sections must be the person's. */
const mayManage = (reach: Reach, classSubjectId: string, sectionIds: string[]) =>
  reach.manageAll || (sectionIds.length > 0 && sectionIds.every((s) => teaches(reach, classSubjectId, s)));

const assertMayManage = (reach: Reach, classSubjectId: string, sectionIds: string[]) => {
  if (!mayManage(reach, classSubjectId, sectionIds)) {
    throw new AppError("You can give homework only for the subjects and sections you teach", httpStatus.FORBIDDEN);
  }
};

/* The homework the person may see; null when they may see none. */
const visibleWhere = (reach: Reach): Prisma.HomeworkWhereInput | null => {
  if (reach.viewAll) return {};
  const or: Prisma.HomeworkWhereInput[] = reach.pairs.map((p) => ({ classSubjectId: p.classSubjectId, sections: { some: { sectionId: p.sectionId } } }));
  if (reach.classTeacherOf.length > 0) or.push({ sections: { some: { sectionId: { in: reach.classTeacherOf } } } });
  return or.length > 0 ? { OR: or } : null;
};

// ------------------------------------------------------------------ shapes

const attachmentSelect = { id: true, key: true, name: true, contentType: true, size: true } as const;

const withUrls = async (attachments: { id: string; key: string; name: string; contentType: string; size: number }[]) =>
  Promise.all(attachments.map(async ({ key, ...a }) => ({ ...a, url: await fileUrl(key) })));

const subjectSelect = {
  id: true,
  type: true,
  groupId: true,
  sortOrder: true,
  group: { select: { id: true, nameEn: true, nameBn: true } },
  subject: { select: { id: true, nameEn: true, nameBn: true, code: true, religion: true } },
} as const;

const sectionSelect = { section: { select: { id: true, name: true, isDefault: true } } } as const;

const listSelect = {
  id: true,
  title: true,
  assignedOn: true,
  dueDate: true,
  fullMarks: true,
  createdBy: true,
  classSubjectId: true,
  class: { select: { id: true, name: true, numericLevel: true } },
  classSubject: { select: subjectSelect },
  sections: { select: sectionSelect, orderBy: { section: { name: "asc" } } },
  _count: { select: { attachments: true } },
} satisfies Prisma.HomeworkSelect;

const names = async (ids: (string | null)[]) => {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  if (unique.length === 0) return new Map<string, string>();
  const users = await prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, fullname: true } });
  return new Map(users.map((u) => [u.id, u.fullname]));
};

const marks = (d: Prisma.Decimal | null) => (d === null ? null : d.toNumber());

// ------------------------------------------------------------- the sheet

type SheetHomework = {
  id: string;
  academicYearId: string;
  classId: string;
  assignedOn: Date;
  dueDate: Date;
  classSubject: { id: string; type: string; groupId: string | null; subject: { religion: string | null } };
  sections: { section: { id: string } }[];
};

/* The students who get this homework: on roll in its sections between the day it was given and the due day, and taking the subject. */
const sheetStudents = async (hw: SheetHomework) => {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      academicYearId: hw.academicYearId,
      classId: hw.classId,
      sectionId: { in: hw.sections.map((s) => s.section.id) },
      enrolledAt: { lt: endOfBangladeshDay(hw.dueDate) },
      OR: [{ status: "ACTIVE" }, { leftAt: { gte: hw.assignedOn } }],
    },
    select: {
      id: true,
      rollNumber: true,
      groupId: true,
      section: { select: { id: true, name: true, isDefault: true } },
      student: { select: { id: true, nameEn: true, nameBn: true, photo: true, religion: true } },
      optionalSubject: { select: { classSubjectId: true } },
    },
  });
  const cs = hw.classSubject;
  const takes = (e: (typeof enrollments)[number]) =>
    (!cs.groupId || e.groupId === cs.groupId) &&
    (!cs.subject.religion || e.student.religion === cs.subject.religion) &&
    (cs.type !== "OPTIONAL" || e.optionalSubject?.classSubjectId === cs.id);

  const roll = (r: string | null) => (r && /^\d+$/.test(r) ? Number(r) : Number.MAX_SAFE_INTEGER);
  return enrollments
    .filter(takes)
    .sort((a, b) => a.section.name.localeCompare(b.section.name) || roll(a.rollNumber) - roll(b.rollNumber) || a.student.nameEn.localeCompare(b.student.nameEn));
};

/* The homework a student gets in one enrollment: their class and section, and their subjects only. */
export const homeworkForEnrollment = (e: {
  academicYearId: string;
  classId: string;
  sectionId: string;
  groupId: string | null;
  religion: Religion | null;
  optionalClassSubjectId: string | null;
}): Prisma.HomeworkWhereInput => ({
  academicYearId: e.academicYearId,
  classId: e.classId,
  sections: { some: { sectionId: e.sectionId } },
  classSubject: {
    AND: [
      { OR: [{ groupId: null }, ...(e.groupId ? [{ groupId: e.groupId }] : [])] },
      { subject: { OR: [{ religion: null }, ...(e.religion ? [{ religion: e.religion }] : [])] } },
      { OR: [{ type: "COMPULSORY" }, ...(e.optionalClassSubjectId ? [{ id: e.optionalClassSubjectId }] : [])] },
    ],
  },
});

// ------------------------------------------------------------------- staff

/* What the person may give homework for this year: each class subject with its sections. */
const getOptions = async (auth: Auth) => {
  const schoolId = auth.schoolId!;
  const year = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true }, select: { id: true, name: true } });
  if (!year) return { academicYear: null, subjects: [] };
  const reach = await reachOf(auth);

  const classSubjects = await prisma.classSubject.findMany({
    where: {
      schoolId,
      academicYearId: year.id,
      ...(reach.manageAll ? {} : { id: { in: [...new Set(reach.pairs.map((p) => p.classSubjectId))] } }),
    },
    orderBy: [{ class: { numericLevel: "asc" } }, { sortOrder: "asc" }],
    select: {
      ...subjectSelect,
      class: { select: { id: true, name: true, numericLevel: true, sections: { orderBy: { name: "asc" }, select: { id: true, name: true, isDefault: true } } } },
    },
  });

  const subjects = classSubjects
    .map(({ class: cls, ...cs }) => ({
      classSubjectId: cs.id,
      class: { id: cls.id, name: cls.name },
      subject: cs.subject,
      group: cs.group,
      sections: cls.sections.filter((s) => teaches(reach, cs.id, s.id)),
    }))
    .filter((s) => s.sections.length > 0);
  return { academicYear: year, subjects };
};

/* The homework the person may see, newest due first. */
const listHomework = async (auth: Auth, query: HomeworkListQuery) => {
  const schoolId = auth.schoolId!;
  const reach = await reachOf(auth);
  const visible = visibleWhere(reach);
  const empty = { items: [], meta: { page: query.page, limit: query.limit, total: 0, totalPages: 0 } };
  if (!visible) return empty;

  const mine: Prisma.HomeworkWhereInput | undefined = query.mine
    ? reach.pairs.length > 0
      ? { OR: reach.pairs.map((p) => ({ classSubjectId: p.classSubjectId, sections: { some: { sectionId: p.sectionId } } })) }
      : { createdBy: auth.userId }
    : undefined;

  const where: Prisma.HomeworkWhereInput = {
    schoolId,
    AND: [visible, ...(mine ? [mine] : [])],
    ...(query.classId ? { classId: query.classId } : {}),
    ...(query.classSubjectId ? { classSubjectId: query.classSubjectId } : {}),
    ...(query.sectionId ? { sections: { some: { sectionId: query.sectionId } } } : {}),
    ...(query.from || query.to ? { dueDate: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.homework.findMany({
      where,
      orderBy: [{ dueDate: query.order }, { createdAt: query.order }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: listSelect,
    }),
    prisma.homework.count({ where }),
  ]);

  // how many were ticked, by status
  const counts = await prisma.homeworkCheck.groupBy({
    by: ["homeworkId", "status"],
    where: { homeworkId: { in: rows.map((r) => r.id) } },
    _count: { _all: true },
  });
  const authors = await names(rows.map((r) => r.createdBy));

  const items = rows.map(({ _count, createdBy, sections, fullMarks, ...hw }) => {
    const of = (s: string) => counts.find((c) => c.homeworkId === hw.id && c.status === s)?._count._all ?? 0;
    const sectionIds = sections.map((s) => s.section.id);
    return {
      ...hw,
      assignedOn: dayKey(hw.assignedOn),
      dueDate: dayKey(hw.dueDate),
      fullMarks: marks(fullMarks),
      sections: sections.map((s) => s.section),
      author: authors.get(createdBy) ?? null,
      attachmentCount: _count.attachments,
      checked: { done: of("DONE"), late: of("LATE"), notDone: of("NOT_DONE"), excused: of("EXCUSED") },
      canManage: mayManage(reach, hw.classSubjectId, sectionIds),
    };
  });
  return { items, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
};

const loadHomework = async (schoolId: string, homeworkId: string) => {
  const hw = await prisma.homework.findFirst({
    where: { id: homeworkId, schoolId },
    select: {
      ...listSelect,
      academicYearId: true,
      classId: true,
      instructions: true,
      createdAt: true,
      updatedAt: true,
      academicYear: { select: { id: true, name: true, isCurrent: true } },
      attachments: { orderBy: { sortOrder: "asc" }, select: attachmentSelect },
    },
  });
  if (!hw) throw new AppError("Homework not found!", httpStatus.NOT_FOUND);
  return hw;
};

const assertMaySee = (reach: Reach, hw: { classSubjectId: string; sections: { section: { id: string } }[] }) => {
  const sectionIds = hw.sections.map((s) => s.section.id);
  const sees =
    reach.viewAll ||
    sectionIds.some((s) => teaches(reach, hw.classSubjectId, s) || reach.classTeacherOf.includes(s));
  if (!sees) throw new AppError("Homework not found!", httpStatus.NOT_FOUND);
};

/* One homework in full, with its students and how each was ticked. */
const getHomework = async (auth: Auth, homeworkId: string) => {
  const reach = await reachOf(auth);
  const hw = await loadHomework(auth.schoolId!, homeworkId);
  assertMaySee(reach, hw);

  const [students, checks, authors] = await Promise.all([
    sheetStudents(hw),
    prisma.homeworkCheck.findMany({ where: { homeworkId }, select: { enrollmentId: true, status: true, marks: true, comment: true, checkedAt: true } }),
    names([hw.createdBy]),
  ]);
  const checkOf = new Map(checks.map((c) => [c.enrollmentId, c]));
  const { _count, createdBy, sections, fullMarks, attachments, ...rest } = hw;

  return {
    ...rest,
    assignedOn: dayKey(hw.assignedOn),
    dueDate: dayKey(hw.dueDate),
    fullMarks: marks(fullMarks),
    sections: sections.map((s) => s.section),
    author: authors.get(createdBy) ?? null,
    attachmentCount: _count.attachments,
    attachments: await withUrls(attachments),
    canManage: mayManage(reach, hw.classSubjectId, sections.map((s) => s.section.id)),
    students: await Promise.all(
      students.map(async (s) => {
        const c = checkOf.get(s.id);
        return {
          enrollmentId: s.id,
          rollNumber: s.rollNumber,
          section: s.section,
          student: { id: s.student.id, nameEn: s.student.nameEn, nameBn: s.student.nameBn, photo: await fileUrl(s.student.photo) },
          check: c ? { status: c.status, marks: marks(c.marks), comment: c.comment, checkedAt: c.checkedAt } : null,
        };
      }),
    ),
  };
};

/* The class subject (with its year) and the sections, checked to be this school's and the class's. */
const loadSubjectAndSections = async (schoolId: string, classSubjectId: string, sectionIds: string[]) => {
  const cs = await prisma.classSubject.findFirst({
    where: { id: classSubjectId, schoolId },
    select: { id: true, classId: true, academicYearId: true },
  });
  if (!cs) throw new AppError("Subject not found!", httpStatus.NOT_FOUND);
  const unique = [...new Set(sectionIds)];
  const count = await prisma.section.count({ where: { id: { in: unique }, classId: cs.classId, schoolId } });
  if (count !== unique.length) throw new AppError("Choose sections of this subject's class", httpStatus.BAD_REQUEST);
  return { cs, sectionIds: unique };
};

const createHomework = async (auth: Auth, payload: CreateHomeworkPayload) => {
  const schoolId = auth.schoolId!;
  const reach = await reachOf(auth);
  const { cs, sectionIds } = await loadSubjectAndSections(schoolId, payload.classSubjectId, payload.sectionIds);
  assertMayManage(reach, cs.id, sectionIds);

  const assignedOn = payload.assignedOn ?? todayInBangladesh();
  if (payload.dueDate < assignedOn) throw new AppError("The due date can't be before the day it is given", httpStatus.BAD_REQUEST);

  const hw = await prisma.homework.create({
    data: {
      schoolId,
      academicYearId: cs.academicYearId,
      classId: cs.classId,
      classSubjectId: cs.id,
      title: payload.title,
      instructions: payload.instructions,
      assignedOn,
      dueDate: payload.dueDate,
      fullMarks: payload.fullMarks,
      createdBy: auth.userId,
      sections: { create: sectionIds.map((sectionId) => ({ sectionId })) },
    },
    select: { id: true },
  });
  return getHomework(auth, hw.id);
};

const updateHomework = async (auth: Auth, homeworkId: string, payload: UpdateHomeworkPayload) => {
  const schoolId = auth.schoolId!;
  const reach = await reachOf(auth);
  const hw = await loadHomework(schoolId, homeworkId);
  const oldSections = hw.sections.map((s) => s.section.id);
  assertMayManage(reach, hw.classSubjectId, oldSections);

  let sectionIds = oldSections;
  if (payload.sectionIds) {
    sectionIds = (await loadSubjectAndSections(schoolId, hw.classSubjectId, payload.sectionIds)).sectionIds;
    assertMayManage(reach, hw.classSubjectId, sectionIds);
  }

  const assignedOn = payload.assignedOn ?? hw.assignedOn;
  const dueDate = payload.dueDate ?? hw.dueDate;
  if (dueDate < assignedOn) throw new AppError("The due date can't be before the day it is given", httpStatus.BAD_REQUEST);

  // lower full marks must still fit the marks already given
  if (payload.fullMarks !== undefined && payload.fullMarks !== null) {
    const top = await prisma.homeworkCheck.aggregate({ where: { homeworkId }, _max: { marks: true } });
    if (top._max.marks && top._max.marks.gt(payload.fullMarks)) {
      throw new AppError(`A student already has ${top._max.marks.toNumber()} marks. Full marks can't be lower than that`, httpStatus.BAD_REQUEST);
    }
  }
  const removed = oldSections.filter((s) => !sectionIds.includes(s));
  const added = sectionIds.filter((s) => !oldSections.includes(s));

  await prisma.$transaction(async (tx) => {
    if (removed.length > 0) {
      await tx.homeworkSection.deleteMany({ where: { homeworkId, sectionId: { in: removed } } });
      // the ticks of students in a section that no longer has it
      await tx.homeworkCheck.deleteMany({ where: { homeworkId, enrollment: { sectionId: { in: removed } } } });
    }
    if (added.length > 0) await tx.homeworkSection.createMany({ data: added.map((sectionId) => ({ homeworkId, sectionId })) });
    // no marks any more: the marks given go too
    if (payload.fullMarks === null) await tx.homeworkCheck.updateMany({ where: { homeworkId }, data: { marks: null } });
    await tx.homework.update({
      where: { id: homeworkId },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.instructions !== undefined ? { instructions: payload.instructions } : {}),
        ...(payload.fullMarks !== undefined ? { fullMarks: payload.fullMarks } : {}),
        assignedOn,
        dueDate,
      },
    });
  });
  return getHomework(auth, homeworkId);
};

const deleteHomework = async (auth: Auth, homeworkId: string) => {
  const reach = await reachOf(auth);
  const hw = await loadHomework(auth.schoolId!, homeworkId);
  assertMayManage(reach, hw.classSubjectId, hw.sections.map((s) => s.section.id));

  await prisma.homework.delete({ where: { id: homeworkId } });
  await Promise.all(hw.attachments.map((a) => deleteFile(a.key)));
  return { id: homeworkId };
};

/* Saves the ticks of some students in one go (a null status clears a tick). */
const saveChecks = async (auth: Auth, homeworkId: string, payload: SaveChecksPayload) => {
  const reach = await reachOf(auth);
  const hw = await loadHomework(auth.schoolId!, homeworkId);
  assertMayManage(reach, hw.classSubjectId, hw.sections.map((s) => s.section.id));

  const students = await sheetStudents(hw);
  const studentOf = new Map(students.map((s) => [s.id, s.student.id]));
  const full = hw.fullMarks;

  const seen = new Set<string>();
  for (const c of payload.checks) {
    if (!studentOf.has(c.enrollmentId)) throw new AppError("A student in the list doesn't get this homework", httpStatus.BAD_REQUEST);
    if (seen.has(c.enrollmentId)) throw new AppError("A student is in the list twice", httpStatus.BAD_REQUEST);
    seen.add(c.enrollmentId);
    if (c.marks !== undefined && c.marks !== null) {
      if (!full) throw new AppError("This homework has no marks", httpStatus.BAD_REQUEST);
      if (full.lt(c.marks)) throw new AppError(`Marks can't be more than ${full.toNumber()}`, httpStatus.BAD_REQUEST);
      if (c.status === "NOT_DONE" || c.status === "EXCUSED") throw new AppError("Only done homework can have marks", httpStatus.BAD_REQUEST);
    }
  }

  const clear = payload.checks.filter((c) => c.status === null).map((c) => c.enrollmentId);
  const set = payload.checks.filter((c) => c.status !== null);

  // one statement each, not one per student: the database is far away
  await prisma.$transaction(async (tx) => {
    if (clear.length > 0) await tx.homeworkCheck.deleteMany({ where: { homeworkId, enrollmentId: { in: clear } } });
    if (set.length > 0) {
      await tx.$executeRaw`
        INSERT INTO "HomeworkCheck" ("id", "homeworkId", "studentId", "enrollmentId", "status", "marks", "comment", "checkedBy", "checkedAt", "updatedAt")
        SELECT x.id, ${homeworkId}, x.student_id, x.enrollment_id, x.status::"HomeworkCheckStatus", x.marks, x.comment, ${auth.userId}, now(), now()
        FROM unnest(
          ${set.map(() => randomUUID())}::text[],
          ${set.map((c) => studentOf.get(c.enrollmentId)!)}::text[],
          ${set.map((c) => c.enrollmentId)}::text[],
          ${set.map((c) => c.status)}::text[],
          ${set.map((c) => c.marks ?? null)}::numeric[],
          ${set.map((c) => c.comment || null)}::text[]
        ) AS x(id, student_id, enrollment_id, status, marks, comment)
        ON CONFLICT ("homeworkId", "enrollmentId") DO UPDATE
        SET "status" = EXCLUDED."status", "marks" = EXCLUDED."marks", "comment" = EXCLUDED."comment",
            "checkedBy" = EXCLUDED."checkedBy", "updatedAt" = now()`;
    }
  });
  return getHomework(auth, homeworkId);
};

// ------------------------------------------------------------- attachments

const addAttachment = async (auth: Auth, homeworkId: string, file: Express.Multer.File) => {
  const schoolId = auth.schoolId!;
  const reach = await reachOf(auth);
  const hw = await loadHomework(schoolId, homeworkId);
  assertMayManage(reach, hw.classSubjectId, hw.sections.map((s) => s.section.id));
  if (hw.attachments.length >= MAX_ATTACHMENTS) throw new AppError(`Homework can have at most ${MAX_ATTACHMENTS} files`, httpStatus.BAD_REQUEST);

  const prepared = await prepareAttachment(file.buffer, file.originalname);
  const key = fileKey(`schools/${schoolId}/homework/${homeworkId}`, "file", prepared.extension);
  await putFile(key, prepared.body, prepared.contentType);
  try {
    await prisma.homeworkAttachment.create({
      data: { homeworkId, key, name: prepared.name, contentType: prepared.contentType, size: prepared.body.length, sortOrder: hw.attachments.length },
    });
  } catch (error) {
    await deleteFile(key);
    throw error;
  }
  return getHomework(auth, homeworkId);
};

const removeAttachment = async (auth: Auth, homeworkId: string, attachmentId: string) => {
  const reach = await reachOf(auth);
  const hw = await loadHomework(auth.schoolId!, homeworkId);
  assertMayManage(reach, hw.classSubjectId, hw.sections.map((s) => s.section.id));
  const attachment = hw.attachments.find((a) => a.id === attachmentId);
  if (!attachment) throw new AppError("File not found!", httpStatus.NOT_FOUND);

  await prisma.homeworkAttachment.delete({ where: { id: attachment.id } });
  await deleteFile(attachment.key);
  return getHomework(auth, homeworkId);
};

// ------------------------------------------------------------------ family

/* A child of this family login, with the enrollments that decide their homework. */
const familyChild = async (auth: Auth, studentId: string) => {
  const guardian = auth.membershipId
    ? await prisma.userRole.findFirst({
        where: { userId: auth.userId, membershipId: auth.membershipId, role: { scope: "SCHOOL", name: GUARDIAN_ROLE.name, isSystem: true } },
        select: { id: true },
      })
    : null;
  const student = guardian
    ? await prisma.student.findFirst({
        where: { id: studentId, schoolId: auth.schoolId!, userId: auth.userId },
        select: {
          id: true,
          religion: true,
          enrollments: {
            orderBy: { academicYear: { startDate: "desc" } },
            take: 3,
            select: { id: true, academicYearId: true, classId: true, sectionId: true, groupId: true, optionalSubject: { select: { classSubjectId: true } } },
          },
        },
      })
    : null;
  if (!student) throw new AppError("Student not found!", httpStatus.NOT_FOUND);
  return student;
};

export const childHomeworkWhere = (student: Awaited<ReturnType<typeof familyChild>>): Prisma.HomeworkWhereInput =>
  student.enrollments.length === 0
    ? { id: "-" }
    : {
        OR: student.enrollments.map((e) =>
          homeworkForEnrollment({
            academicYearId: e.academicYearId,
            classId: e.classId,
            sectionId: e.sectionId,
            groupId: e.groupId,
            religion: student.religion,
            optionalClassSubjectId: e.optionalSubject?.classSubjectId ?? null,
          }),
        ),
      };

const familySelect = (studentId: string) =>
  ({
    id: true,
    title: true,
    instructions: true,
    assignedOn: true,
    dueDate: true,
    fullMarks: true,
    classSubject: { select: { subject: { select: { id: true, nameEn: true, nameBn: true, code: true } } } },
    attachments: { orderBy: { sortOrder: "asc" }, select: attachmentSelect },
    checks: { where: { studentId }, select: { status: true, marks: true, comment: true } },
  }) satisfies Prisma.HomeworkSelect;

type FamilyRow = Prisma.HomeworkGetPayload<{ select: ReturnType<typeof familySelect> }>;

const familyItem = async ({ checks, attachments, classSubject, fullMarks, ...hw }: FamilyRow) => ({
  ...hw,
  assignedOn: dayKey(hw.assignedOn),
  dueDate: dayKey(hw.dueDate),
  fullMarks: marks(fullMarks),
  subject: classSubject.subject,
  attachments: await withUrls(attachments),
  check: checks[0] ? { status: checks[0].status, marks: marks(checks[0].marks), comment: checks[0].comment } : null,
});

/* A child's homework, the latest due first. */
const familyHomework = async (auth: Auth, query: FamilyHomeworkQuery) => {
  const student = await familyChild(auth, query.studentId);
  const where: Prisma.HomeworkWhereInput = { schoolId: auth.schoolId!, ...childHomeworkWhere(student) };
  const [rows, total] = await Promise.all([
    prisma.homework.findMany({
      where,
      orderBy: [{ dueDate: "desc" }, { createdAt: "desc" }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: familySelect(student.id),
    }),
    prisma.homework.count({ where }),
  ]);
  return {
    items: await Promise.all(rows.map(familyItem)),
    meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
};

/* For the family home: a child's homework due from today, soonest first. */
export const homeworkDueSoon = async (schoolId: string, student: Awaited<ReturnType<typeof familyChild>>, take = 5) => {
  const where: Prisma.HomeworkWhereInput = { schoolId, dueDate: { gte: todayInBangladesh() }, ...childHomeworkWhere(student) };
  const [rows, total] = await Promise.all([
    prisma.homework.findMany({ where, orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }], take, select: familySelect(student.id) }),
    prisma.homework.count({ where }),
  ]);
  return { total, items: await Promise.all(rows.map(familyItem)) };
};

export type FamilyChildForHomework = Awaited<ReturnType<typeof familyChild>>;

export const HomeworkService = {
  getOptions,
  listHomework,
  getHomework,
  createHomework,
  updateHomework,
  deleteHomework,
  saveChecks,
  addAttachment,
  removeAttachment,
  familyHomework,
};
