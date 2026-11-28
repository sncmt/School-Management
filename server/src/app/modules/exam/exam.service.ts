import httpStatus from "http-status";
import { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import type { AcademicTrack } from "../../../../generated/prisma/enums";
import { assertClassesInTrack, currentYears, requireYear } from "../../shared/academicYears";
import { assertSchoolLanguageName, displayName } from "../../shared/names";
import { dayKey, todayInBangladesh } from "../../shared/scheduleSchemas";
import { dayStatus, loadCalendar } from "../calendar/calendar.resolver";
import type {
  AddClassesPayload,
  CreateExamPayload,
  ListExamsQuery,
  SetRoutinePayload,
  SetStatusPayload,
  UpdateExamClassPayload,
  UpdateExamPayload,
} from "./exam.validation";
import { classExamName, examClassNameSelect } from "./examName";

type Tx = Prisma.TransactionClient;

const TX_OPTIONS = { maxWait: 10_000, timeout: 20_000 };

const classBrief = { id: true, name: true, numericLevel: true } satisfies Prisma.SchoolClassSelect;

const examInclude = {
  academicYear: { select: { id: true, name: true, track: true } },
  classes: {
    orderBy: { class: { numericLevel: "asc" } },
    select: {
      id: true,
      status: true,
      date: true,
      publishedAt: true,
      // the class's own name for the exam (null: the exam's) and its final-exam mark
      nameEn: true,
      nameBn: true,
      isFinal: true,
      class: { select: classBrief },
      _count: { select: { subjects: true } },
    },
  },
} satisfies Prisma.ExamInclude;

const routineSubjectInclude = {
  parts: { orderBy: { sortOrder: "asc" }, select: { name: true, fullMarks: true, passMarks: true } },
  classSubject: {
    select: {
      id: true,
      type: true,
      sortOrder: true,
      group: { select: { id: true, nameEn: true, nameBn: true } },
      subject: { select: { id: true, nameEn: true, nameBn: true, code: true, religion: true, parentId: true } },
    },
  },
} satisfies Prisma.ExamSubjectInclude;

// ------------------------------------------------------------------- helpers

/* The given year, or the current one of the track (or of the classes' track, or the main track). */
const resolveYear = (schoolId: string, academicYearId?: string, opts: { track?: AcademicTrack; classIds?: string[] } = {}) =>
  requireYear(prisma, schoolId, { academicYearId, ...opts });

const findExam = async (schoolId: string, examId: string) => {
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId }, include: examInclude });
  if (!exam) throw new AppError("Exam not found", httpStatus.NOT_FOUND);
  return exam;
};

const findExamClass = async (schoolId: string, examId: string, classId: string) => {
  const examClass = await prisma.examClass.findFirst({
    where: { examId, classId, exam: { schoolId } },
    include: {
      exam: { select: { id: true, type: true, nameEn: true, nameBn: true, academicYearId: true } },
      class: { select: classBrief },
    },
  });
  if (!examClass) throw new AppError("This class is not part of the exam", httpStatus.NOT_FOUND);
  return examClass;
};

const inYear = (year: { startDate: Date; endDate: Date }, day: Date) =>
  dayKey(day) >= dayKey(year.startDate) && dayKey(day) <= dayKey(year.endDate);

const assertAttendancePeriod = (year: { startDate: Date; endDate: Date }, from?: Date | null, to?: Date | null) => {
  if (from && to && (!inYear(year, from) || !inYear(year, to))) {
    throw new AppError("The attendance period must be inside the academic year", httpStatus.BAD_REQUEST);
  }
};

const assertClassesInSchool = async (schoolId: string, classIds: string[]) => {
  const found = await prisma.schoolClass.count({ where: { id: { in: classIds }, schoolId } });
  if (found !== classIds.length) {
    throw new AppError("One or more classes were not found for this school", httpStatus.NOT_FOUND);
  }
};

/*
 * Makes the exam the final exam of these classes (on) or not (off). A class has one final
 * exam a year, so the mark moves from the class's other exam of the year: those are returned
 * (movedFrom), so the screen can say so. The classes are locked so two changes can't both win.
 */
const setFinal = async (tx: Tx, examId: string, academicYearId: string, classIds: string[], on: boolean) => {
  if (classIds.length === 0) return [];
  await tx.$queryRaw`SELECT "id" FROM "SchoolClass" WHERE "id" IN (${Prisma.join(classIds)}) FOR UPDATE`;
  let movedFrom: { classId: string; className: string; exam: { id: string; nameEn: string | null; nameBn: string | null } }[] = [];
  if (on) {
    const others = await tx.examClass.findMany({
      where: { classId: { in: classIds }, isFinal: true, examId: { not: examId }, exam: { academicYearId } },
      select: { id: true, classId: true, class: { select: { name: true } }, ...examClassNameSelect },
    });
    if (others.length > 0) {
      await tx.examClass.updateMany({ where: { id: { in: others.map((o) => o.id) } }, data: { isFinal: false } });
    }
    movedFrom = others.map((o) => ({ classId: o.classId, className: o.class.name, exam: { id: o.exam.id, ...classExamName(o) } }));
  }
  await tx.examClass.updateMany({ where: { examId, classId: { in: classIds } }, data: { isFinal: on } });
  return movedFrom;
};

// ---------------------------------------------------------------------- exams

const createExam = async (schoolId: string, userId: string, data: CreateExamPayload) => {
  await assertSchoolLanguageName(schoolId, data);
  // the classes must be taught in the year (its track: school or college)
  const year = await resolveYear(schoolId, data.academicYearId, { track: data.track, classIds: data.classIds });
  assertAttendancePeriod(year, data.attendanceFrom, data.attendanceTo);

  let classIds = data.classIds;
  if (data.allClasses) {
    // every class of the year's track
    classIds = (await prisma.schoolClass.findMany({ where: { schoolId, track: year.track }, select: { id: true } })).map((c) => c.id);
    if (classIds.length === 0) throw new AppError("The school has no classes yet", httpStatus.BAD_REQUEST);
  } else {
    await assertClassesInSchool(schoolId, classIds);
  }

  return prisma.$transaction(async (tx) => {
    const exam = await tx.exam.create({
      data: {
        schoolId,
        academicYearId: year.id,
        nameEn: data.nameEn ?? null,
        nameBn: data.nameBn ?? null,
        type: data.type,
        attendanceFrom: data.attendanceFrom ?? null,
        attendanceTo: data.attendanceTo ?? null,
        createdBy: userId,
        classes: { create: classIds.map((classId) => ({ classId })) },
      },
      select: { id: true },
    });
    const movedFrom = data.isFinal ? await setFinal(tx, exam.id, year.id, classIds, true) : [];
    return { ...(await tx.exam.findUniqueOrThrow({ where: { id: exam.id }, include: examInclude })), movedFrom };
  }, TX_OPTIONS);
};

const getExams = async (schoolId: string, query: ListExamsQuery) => {
  const year = await resolveYear(schoolId, query.academicYearId, { track: query.track });
  // no year and no track: the exams of every track's current year (school and college), so
  // the marks, results and admit card pages see both; academicYear is the main track's
  const yearIds =
    query.academicYearId || query.track ? [year.id] : (await currentYears(prisma, schoolId)).map((y) => y.id);
  const exams = await prisma.exam.findMany({
    where: { schoolId, academicYearId: { in: yearIds } },
    orderBy: { createdAt: "asc" },
    include: examInclude,
  });
  return { academicYear: { id: year.id, name: year.name, track: year.track }, items: exams };
};

/* The exam with its classes and, for each, the first and last exam day. */
const getExamById = async (schoolId: string, examId: string) => {
  const exam = await findExam(schoolId, examId);

  const ranges = await prisma.examSubject.groupBy({
    by: ["examClassId"],
    where: { examClass: { examId } },
    _min: { date: true },
    _max: { date: true },
  });
  const rangeOf = new Map(ranges.map((r) => [r.examClassId, r]));

  return {
    ...exam,
    classes: exam.classes.map((c) => {
      const range = rangeOf.get(c.id);
      return {
        ...c,
        firstDay: range?._min.date ? dayKey(range._min.date) : null,
        lastDay: range?._max.date ? dayKey(range._max.date) : null,
      };
    }),
  };
};

const updateExam = async (schoolId: string, examId: string, data: UpdateExamPayload) => {
  const exam = await findExam(schoolId, examId);
  // the names as they will be saved
  await assertSchoolLanguageName(schoolId, {
    nameEn: data.nameEn !== undefined ? data.nameEn : exam.nameEn,
    nameBn: data.nameBn !== undefined ? data.nameBn : exam.nameBn,
  });
  if (data.attendanceFrom !== undefined) {
    const year = await resolveYear(schoolId, exam.academicYear.id);
    assertAttendancePeriod(year, data.attendanceFrom, data.attendanceTo);
  }

  return prisma.$transaction(async (tx) => {
    await tx.exam.update({
      where: { id: examId },
      data: {
        ...(data.nameEn !== undefined ? { nameEn: data.nameEn } : {}),
        ...(data.nameBn !== undefined ? { nameBn: data.nameBn } : {}),
        ...(data.attendanceFrom !== undefined ? { attendanceFrom: data.attendanceFrom, attendanceTo: data.attendanceTo } : {}),
      },
    });
    // the final exam (or not) of all its classes
    const movedFrom =
      data.isFinal !== undefined
        ? await setFinal(tx, examId, exam.academicYear.id, exam.classes.map((c) => c.class.id), data.isFinal)
        : [];
    return { ...(await tx.exam.findUniqueOrThrow({ where: { id: examId }, include: examInclude })), movedFrom };
  }, TX_OPTIONS);
};

/* One class of the exam: its own name for the exam, and whether it is the class's final exam. */
const updateExamClass = async (schoolId: string, examId: string, classId: string, data: UpdateExamClassPayload) => {
  const examClass = await findExamClass(schoolId, examId, classId);
  // a class's own name needs the school's language too; none at all = the exam's name
  if (data.nameEn || data.nameBn) await assertSchoolLanguageName(schoolId, { nameEn: data.nameEn, nameBn: data.nameBn });

  return prisma.$transaction(async (tx) => {
    if (data.nameEn !== undefined) {
      await tx.examClass.update({ where: { id: examClass.id }, data: { nameEn: data.nameEn ?? null, nameBn: data.nameBn ?? null } });
    }
    const movedFrom =
      data.isFinal !== undefined ? await setFinal(tx, examId, examClass.exam.academicYearId, [classId], data.isFinal) : [];
    const saved = await tx.examClass.findUniqueOrThrow({
      where: { id: examClass.id },
      select: { id: true, class: { select: classBrief }, ...examClassNameSelect },
    });
    return {
      id: saved.id,
      class: saved.class,
      nameEn: saved.nameEn,
      nameBn: saved.nameBn,
      isFinal: saved.isFinal,
      // the name shown for the class (its own, else the exam's)
      name: classExamName(saved),
      movedFrom,
    };
  }, TX_OPTIONS);
};

const addClasses = async (schoolId: string, examId: string, data: AddClassesPayload) => {
  const exam = await findExam(schoolId, examId);
  await assertClassesInSchool(schoolId, data.classIds);
  await assertClassesInTrack(prisma, schoolId, data.classIds, exam.academicYear);

  const already = new Set(exam.classes.map((c) => c.class.id));
  if (data.classIds.some((id) => already.has(id))) {
    throw new AppError("One or more classes are already part of the exam", httpStatus.CONFLICT);
  }

  await prisma.examClass.createMany({ data: data.classIds.map((classId) => ({ examId, classId })) });
  return findExam(schoolId, examId);
};

// -------------------------------------------------------------------- routine

/*
 * A class's routine for the exam, and the class subjects not in it yet (with their default
 * marks), so the routine screen can offer them.
 */
const getRoutine = async (schoolId: string, examId: string, classId: string) => {
  const examClass = await findExamClass(schoolId, examId, classId);

  const [subjects, classSubjects] = await Promise.all([
    prisma.examSubject.findMany({
      where: { examClassId: examClass.id },
      orderBy: [{ date: "asc" }, { startTime: "asc" }, { classSubject: { sortOrder: "asc" } }],
      include: routineSubjectInclude,
    }),
    prisma.classSubject.findMany({
      where: { schoolId, classId, academicYearId: examClass.exam.academicYearId },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        type: true,
        fullMarks: true,
        passMarks: true,
        parts: { orderBy: { sortOrder: "asc" }, select: { name: true, fullMarks: true, passMarks: true } },
        group: { select: { id: true, nameEn: true, nameBn: true } },
        subject: { select: { id: true, nameEn: true, nameBn: true, code: true, religion: true } },
      },
    }),
  ]);

  const inRoutine = new Set(subjects.map((s) => s.classSubjectId));
  return {
    exam: examClass.exam,
    class: examClass.class,
    status: examClass.status,
    date: examClass.date ? dayKey(examClass.date) : null,
    subjects: subjects.map((s) => ({ ...s, date: dayKey(s.date) })),
    notInRoutine: classSubjects.filter((cs) => !inRoutine.has(cs.id)),
  };
};

/*
 * Saves a class's routine: the subjects listed are the routine. Works at the routine stage
 * and during marks entry, and never loses a mark:
 *  - a new subject is added, with the marks given here or else the class subject's setup
 *  - a subject already in the routine keeps its marks setup unless new marks are given
 *  - a subject that has marks keeps its marks setup, can move only to a day up to today
 *    (its marks were entered from its exam day), and cannot be left out
 * New or moved exam days must be inside the academic year and be school days for the class.
 */
const setRoutine = async (schoolId: string, examId: string, classId: string, data: SetRoutinePayload) => {
  const examClass = await findExamClass(schoolId, examId, classId);
  if (examClass.status === "PUBLISHED") {
    throw new AppError("The result is published. Unlock it first to change the routine", httpStatus.CONFLICT);
  }

  const single = examClass.exam.type === "SINGLE";
  if (single && !data.date) throw new AppError("A one-day exam needs its date", httpStatus.BAD_REQUEST);
  if (single && data.subjects.some((s) => s.date)) {
    throw new AppError("In a one-day exam every subject is on the exam date: leave out subject dates", httpStatus.BAD_REQUEST);
  }
  if (!single && data.date) {
    throw new AppError("A multi-day exam has a date per subject, not one exam date", httpStatus.BAD_REQUEST);
  }
  if (!single && data.subjects.some((s) => !s.date)) {
    throw new AppError("Give every subject its exam date", httpStatus.BAD_REQUEST);
  }

  const year = await resolveYear(schoolId, examClass.exam.academicYearId);
  const [classSubjects, current] = await Promise.all([
    prisma.classSubject.findMany({
      where: { id: { in: data.subjects.map((s) => s.classSubjectId) }, schoolId, classId, academicYearId: year.id },
      include: {
        subject: { select: { nameEn: true, nameBn: true } },
        parts: { orderBy: { sortOrder: "asc" }, select: { name: true, fullMarks: true, passMarks: true } },
      },
    }),
    prisma.examSubject.findMany({
      where: { examClassId: examClass.id },
      include: {
        parts: { orderBy: { sortOrder: "asc" }, select: { name: true, fullMarks: true, passMarks: true } },
        classSubject: { select: { subject: { select: { nameEn: true, nameBn: true } } } },
        _count: { select: { marks: true } },
      },
    }),
  ]);
  if (classSubjects.length !== data.subjects.length) {
    throw new AppError("One or more subjects are not taught in this class this year", httpStatus.BAD_REQUEST);
  }
  const classSubjectOf = new Map(classSubjects.map((cs) => [cs.id, cs]));
  const currentOf = new Map(current.map((es) => [es.classSubjectId, es]));

  // a subject with marks cannot leave the routine
  const listed = new Set(data.subjects.map((s) => s.classSubjectId));
  const dropped = current.filter((es) => !listed.has(es.classSubjectId));
  const droppedWithMarks = dropped.find((es) => es._count.marks > 0);
  if (droppedWithMarks) {
    throw new AppError(
      `${displayName(droppedWithMarks.classSubject.subject)} already has marks and cannot be removed from the routine`,
      httpStatus.CONFLICT,
    );
  }

  type PartRow = { name: string; fullMarks: Prisma.Decimal | number; passMarks: Prisma.Decimal | number };
  const sameParts = (a: PartRow[], b: PartRow[]) =>
    a.length === b.length &&
    a.every(
      (p, i) =>
        p.name === b[i].name && Number(p.fullMarks) === Number(b[i].fullMarks) && Number(p.passMarks) === Number(b[i].passMarks),
    );

  const today = todayInBangladesh().getTime();
  const rows = data.subjects.map((s) => {
    const cs = classSubjectOf.get(s.classSubjectId)!;
    const existing = currentOf.get(s.classSubjectId);
    const date = (s.date ?? data.date)!;
    const hasMarks = (existing?._count.marks ?? 0) > 0;

    // the marks: as given; else what the routine already has; else the class subject's setup
    const fullMarks = s.fullMarks ?? existing?.fullMarks ?? cs.fullMarks;
    const passMarks = s.passMarks ?? existing?.passMarks ?? cs.passMarks;
    const parts: PartRow[] = s.fullMarks !== undefined ? (s.parts ?? []) : (existing?.parts ?? cs.parts);
    if (fullMarks === null || passMarks === null) {
      throw new AppError(
        `Set the marks for ${displayName(cs.subject)}: here, or in the class subject's marks setup`,
        httpStatus.BAD_REQUEST,
      );
    }

    const marksChanged =
      !existing ||
      Number(fullMarks) !== Number(existing.fullMarks) ||
      Number(passMarks) !== Number(existing.passMarks) ||
      !sameParts(parts, existing.parts);
    const dateChanged = !existing || dayKey(date) !== dayKey(existing.date);

    if (existing && hasMarks) {
      if (marksChanged) {
        throw new AppError(
          `${displayName(cs.subject)} already has marks, so its full marks, pass marks and parts cannot change`,
          httpStatus.CONFLICT,
        );
      }
      if (dateChanged && date.getTime() > today) {
        throw new AppError(
          `${displayName(cs.subject)} already has marks, so its exam day cannot move later than today`,
          httpStatus.CONFLICT,
        );
      }
    }

    return {
      existingId: existing?.id ?? null,
      dateChanged,
      marksChanged,
      classSubjectId: s.classSubjectId,
      values: { date, startTime: s.startTime ?? null, endTime: s.endTime ?? null, fullMarks, passMarks },
      parts: parts.map((p, i) => ({ name: p.name, fullMarks: p.fullMarks, passMarks: p.passMarks, sortOrder: i })),
    };
  });

  // every new or moved exam day: inside the year, and a school day for this class
  const days = [...new Set(rows.filter((r) => r.dateChanged).map((r) => dayKey(r.values.date)))].map(
    (d) => new Date(`${d}T00:00:00Z`),
  );
  if (days.length > 0) {
    const from = new Date(Math.min(...days.map((d) => d.getTime())));
    const to = new Date(Math.max(...days.map((d) => d.getTime())));
    const calendar = await loadCalendar(prisma, schoolId, from, to);
    for (const day of days) {
      if (!inYear(year, day)) {
        throw new AppError(`${dayKey(day)} is outside the academic year`, httpStatus.BAD_REQUEST);
      }
      const status = dayStatus(calendar, day, { classId });
      if (!status.isSchoolDay) {
        throw new AppError(
          `${dayKey(day)} is not a school day for this class (${(status.source && displayName(status.source)) || status.reason.replace("_", " ").toLowerCase()})`,
          httpStatus.BAD_REQUEST,
        );
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    // only subjects without marks can be dropped (checked above)
    if (dropped.length > 0) await tx.examSubject.deleteMany({ where: { id: { in: dropped.map((es) => es.id) } } });

    for (const row of rows) {
      if (row.existingId) {
        await tx.examSubject.update({ where: { id: row.existingId }, data: row.values });
        if (row.marksChanged) {
          await tx.examSubjectPart.deleteMany({ where: { examSubjectId: row.existingId } });
          await tx.examSubjectPart.createMany({ data: row.parts.map((p) => ({ ...p, examSubjectId: row.existingId! })) });
        }
      } else {
        await tx.examSubject.create({
          data: { examClassId: examClass.id, classSubjectId: row.classSubjectId, ...row.values, parts: { create: row.parts } },
        });
      }
    }

    await tx.examClass.update({ where: { id: examClass.id }, data: { date: single ? data.date! : null } });
  }, TX_OPTIONS);

  return getRoutine(schoolId, examId, classId);
};

/*
 * ROUTINE -> MARKS_ENTRY opens marks entry (the routine must have subjects).
 * MARKS_ENTRY -> ROUTINE reopens the routine. Publishing the result is a separate step.
 */
const setStatus = async (schoolId: string, examId: string, classId: string, data: SetStatusPayload) => {
  const examClass = await findExamClass(schoolId, examId, classId);

  if (examClass.status === "PUBLISHED") {
    throw new AppError("The result is published. Unlock it first to make changes", httpStatus.CONFLICT);
  }
  if (examClass.status === data.status) return getRoutine(schoolId, examId, classId);

  if (data.status === "MARKS_ENTRY") {
    const subjects = await prisma.examSubject.count({ where: { examClassId: examClass.id } });
    if (subjects === 0) throw new AppError("Set up the routine before opening marks entry", httpStatus.BAD_REQUEST);
  } else {
    // once marks exist the class stays in marks entry (its routine can still be edited there)
    const marks = await prisma.examMark.count({ where: { examSubject: { examClassId: examClass.id } } });
    if (marks > 0) {
      throw new AppError(
        `${marks} mark(s) are already entered for this class, so it stays in marks entry. The routine can still be edited there`,
        httpStatus.CONFLICT,
      );
    }
  }

  await prisma.examClass.update({ where: { id: examClass.id }, data: { status: data.status } });
  return getRoutine(schoolId, examId, classId);
};

export const ExamService = {
  createExam,
  getExams,
  getExamById,
  updateExam,
  updateExamClass,
  addClasses,
  getRoutine,
  setRoutine,
  setStatus,
};
