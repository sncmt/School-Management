import httpStatus from "http-status";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import type { GeneratePayload, MovePayload } from "./seatPlan.validation";

/*
 * An exam's seat plan. Each student of the exam's classes (on roll in the exam's year) keeps
 * one seat for the whole exam. Classes are put in groups that share rooms; a group fills
 * the chosen rooms seat by seat, its classes taking turns (Six, Eight, Six, Eight…), so
 * neighbouring seat numbers write different papers. When a class of the group runs out,
 * the others carry on in roll order. The next group starts on the next free seat, so a
 * room can hold the end of one group and the start of another.
 */

type Auth = NonNullable<Express.Request["auth"]>;
type Groups = string[][];

const TX = { maxWait: 10_000, timeout: 30_000 };

const loadExam = async (schoolId: string, examId: string) => {
  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId },
    select: {
      id: true,
      nameEn: true,
      nameBn: true,
      academicYearId: true,
      academicYear: { select: { id: true, name: true } },
      classes: { select: { class: { select: { id: true, name: true, numericLevel: true } } } },
    },
  });
  if (!exam) throw new AppError("Exam not found!", httpStatus.NOT_FOUND);
  const classes = exam.classes.map((c) => c.class).sort((a, b) => a.numericLevel - b.numericLevel);
  return { ...exam, classes };
};

type ExamRow = Awaited<ReturnType<typeof loadExam>>;

const roll = (r: string | null) => (r && /^\d+$/.test(r) ? Number(r) : Number.MAX_SAFE_INTEGER);

/* The students on roll in the exam's classes, each class in section and roll order. */
const examStudents = async (exam: ExamRow) => {
  const rows = await prisma.enrollment.findMany({
    where: { academicYearId: exam.academicYearId, classId: { in: exam.classes.map((c) => c.id) }, status: "ACTIVE", student: { status: "ACTIVE" } },
    select: {
      id: true,
      rollNumber: true,
      classId: true,
      section: { select: { id: true, name: true, isDefault: true } },
      student: { select: { id: true, nameEn: true, nameBn: true, admissionNo: true } },
    },
  });
  return rows.sort(
    (a, b) => a.section.name.localeCompare(b.section.name) || roll(a.rollNumber) - roll(b.rollNumber) || a.student.nameEn.localeCompare(b.student.nameEn),
  );
};

/* A first guess at the groups: classes far apart in level side by side (6+9, 7+10, 8). */
const suggestGroups = (classes: { id: string }[]): Groups => {
  const half = Math.ceil(classes.length / 2);
  return Array.from({ length: half }, (_, i) => [classes[i].id, ...(classes[i + half] ? [classes[i + half].id] : [])]);
};

const loadPlan = (examId: string) =>
  prisma.seatPlan.findUnique({
    where: { examId },
    select: {
      id: true,
      groups: true,
      generatedAt: true,
      generatedBy: true,
      updatedAt: true,
      rooms: {
        orderBy: { sortOrder: "asc" },
        select: { roomId: true, seats: true, sortOrder: true, room: { select: { number: true, building: true, capacity: true, isActive: true } } },
      },
      seats: { select: { roomId: true, seatNo: true, enrollmentId: true } },
    },
  });

const requirePlan = async (examId: string) => {
  const plan = await loadPlan(examId);
  if (!plan) throw new AppError("Make the seat plan first", httpStatus.NOT_FOUND);
  return plan;
};

// ---------------------------------------------------------------------- read

/*
 * Everything the seat plan screen needs: the exam's classes with their students, the groups
 * suggested, and the plan (rooms and seats) when there is one. Students who have a seat but
 * are no longer on roll are listed too, marked, so they can be cleared.
 */
const getPlan = async (schoolId: string, examId: string) => {
  const exam = await loadExam(schoolId, examId);
  const [students, plan] = await Promise.all([examStudents(exam), loadPlan(examId)]);

  const onRoll = new Set(students.map((s) => s.id));
  const seatedGone = plan ? plan.seats.filter((s) => !onRoll.has(s.enrollmentId)).map((s) => s.enrollmentId) : [];
  const gone = seatedGone.length
    ? await prisma.enrollment.findMany({
        where: { id: { in: seatedGone } },
        select: {
          id: true,
          rollNumber: true,
          classId: true,
          section: { select: { id: true, name: true, isDefault: true } },
          student: { select: { id: true, nameEn: true, nameBn: true, admissionNo: true } },
        },
      })
    : [];

  const author = plan?.generatedBy ? await prisma.user.findUnique({ where: { id: plan.generatedBy }, select: { fullname: true } }) : null;
  const toStudent = (e: (typeof students)[number], isOnRoll: boolean) => ({
    enrollmentId: e.id,
    studentId: e.student.id,
    nameEn: e.student.nameEn,
    nameBn: e.student.nameBn,
    admissionNo: e.student.admissionNo,
    rollNumber: e.rollNumber,
    classId: e.classId,
    section: e.section,
    onRoll: isOnRoll,
  });

  return {
    exam: { id: exam.id, nameEn: exam.nameEn, nameBn: exam.nameBn, academicYear: exam.academicYear },
    classes: exam.classes.map((c) => ({ ...c, students: students.filter((s) => s.classId === c.id).length })),
    suggestedGroups: suggestGroups(exam.classes),
    students: [...students.map((s) => toStudent(s, true)), ...gone.map((s) => toStudent(s, false))],
    plan: plan
      ? {
          groups: plan.groups as Groups,
          generatedAt: plan.generatedAt,
          generatedBy: author?.fullname ?? null,
          updatedAt: plan.updatedAt,
          rooms: plan.rooms.map((r) => ({ roomId: r.roomId, seats: r.seats, sortOrder: r.sortOrder, ...r.room })),
          seats: plan.seats,
        }
      : null,
  };
};

// ------------------------------------------------------------------ generate

/* Builds (or rebuilds) the plan: every seat made anew from the groups and rooms. */
const generate = async (auth: Auth, examId: string, payload: GeneratePayload) => {
  const schoolId = auth.schoolId!;
  const exam = await loadExam(schoolId, examId);

  const roomIds = [...new Set(payload.roomIds)];
  const rooms = await prisma.room.findMany({ where: { id: { in: roomIds }, schoolId }, select: { id: true, number: true, capacity: true, isActive: true } });
  if (rooms.length !== roomIds.length) throw new AppError("Choose rooms of this school", httpStatus.BAD_REQUEST);
  const inactive = rooms.find((r) => !r.isActive);
  if (inactive) throw new AppError(`Room ${inactive.number} is not in use. Use it again or leave it out`, httpStatus.BAD_REQUEST);
  const ordered = roomIds.map((id) => rooms.find((r) => r.id === id)!);

  const examClassIds = new Set(exam.classes.map((c) => c.id));
  const seen = new Set<string>();
  for (const group of payload.groups) {
    for (const classId of group) {
      if (!examClassIds.has(classId)) throw new AppError("A class in the groups is not in this exam", httpStatus.BAD_REQUEST);
      if (seen.has(classId)) throw new AppError("A class can be in only one group", httpStatus.BAD_REQUEST);
      seen.add(classId);
    }
  }

  const students = await examStudents(exam);
  const queueOf = new Map<string, string[]>();
  for (const s of students) queueOf.set(s.classId, [...(queueOf.get(s.classId) ?? []), s.id]);

  // each group's classes taking turns, groups one after another
  const order: string[] = [];
  for (const group of payload.groups) {
    const queues = group.map((classId) => [...(queueOf.get(classId) ?? [])]);
    while (queues.some((q) => q.length > 0)) {
      for (const q of queues) if (q.length > 0) order.push(q.shift()!);
    }
  }

  const seatsAvailable = ordered.reduce((sum, r) => sum + r.capacity, 0);
  if (order.length === 0) throw new AppError("The chosen classes have no students on roll", httpStatus.BAD_REQUEST);
  if (order.length > seatsAvailable) {
    throw new AppError(`${order.length} students need seats but the chosen rooms have ${seatsAvailable}. Add rooms`, httpStatus.BAD_REQUEST);
  }

  const seats: { roomId: string; seatNo: number; enrollmentId: string }[] = [];
  let i = 0;
  for (const room of ordered) {
    for (let seatNo = 1; seatNo <= room.capacity && i < order.length; seatNo++) seats.push({ roomId: room.id, seatNo, enrollmentId: order[i++] });
  }

  await prisma.$transaction(async (tx) => {
    // the plan is kept (its invigilator duties with it); its rooms and seats are made anew
    const plan = await tx.seatPlan.upsert({
      where: { examId },
      create: { examId, groups: payload.groups, generatedBy: auth.userId },
      update: { groups: payload.groups, generatedBy: auth.userId, generatedAt: new Date() },
      select: { id: true },
    });
    await tx.seat.deleteMany({ where: { planId: plan.id } });
    await tx.seatPlanRoom.deleteMany({ where: { planId: plan.id } });
    // duties in rooms the plan no longer uses go
    await tx.invigilatorDuty.deleteMany({ where: { planId: plan.id, roomId: { notIn: ordered.map((r) => r.id) } } });
    await tx.seatPlanRoom.createMany({ data: ordered.map((r, sortOrder) => ({ planId: plan.id, roomId: r.id, sortOrder, seats: r.capacity })) });
    await tx.seat.createMany({ data: seats.map((s) => ({ ...s, planId: plan.id })) });
  }, TX);

  return getPlan(schoolId, examId);
};

// --------------------------------------------------------------------- edits

/* Moves a student to a seat: an empty seat takes them, a taken one swaps with them. */
const move = async (schoolId: string, examId: string, payload: MovePayload) => {
  const exam = await loadExam(schoolId, examId);
  const plan = await requirePlan(examId);
  const room = plan.rooms.find((r) => r.roomId === payload.roomId);
  if (!room) throw new AppError("This room is not in the seat plan", httpStatus.BAD_REQUEST);
  if (payload.seatNo > room.seats) throw new AppError(`Room ${room.room.number} has ${room.seats} seats`, httpStatus.BAD_REQUEST);

  const mine = plan.seats.find((s) => s.enrollmentId === payload.enrollmentId);
  if (!mine) {
    // a student not seated yet must be on roll in the exam's classes
    const onRoll = (await examStudents(exam)).some((s) => s.id === payload.enrollmentId);
    if (!onRoll) throw new AppError("This student is not in the exam's classes", httpStatus.BAD_REQUEST);
  }
  const theirs = plan.seats.find((s) => s.roomId === payload.roomId && s.seatNo === payload.seatNo);
  if (theirs?.enrollmentId === payload.enrollmentId) return getPlan(schoolId, examId);
  if (theirs && !mine) throw new AppError("This seat is taken. Choose an empty seat", httpStatus.CONFLICT);

  await prisma.$transaction(async (tx) => {
    // free both seats first: the unique (room, seat) index would block a direct swap
    await tx.seat.deleteMany({ where: { planId: plan.id, enrollmentId: { in: [payload.enrollmentId, ...(theirs ? [theirs.enrollmentId] : [])] } } });
    await tx.seat.createMany({
      data: [
        { planId: plan.id, roomId: payload.roomId, seatNo: payload.seatNo, enrollmentId: payload.enrollmentId },
        ...(theirs && mine ? [{ planId: plan.id, roomId: mine.roomId, seatNo: mine.seatNo, enrollmentId: theirs.enrollmentId }] : []),
      ],
    });
    await tx.seatPlan.update({ where: { id: plan.id }, data: { updatedAt: new Date() } });
  }, TX);
  return getPlan(schoolId, examId);
};

/* Takes a student out of their seat (they show as not seated). */
const clearSeat = async (schoolId: string, examId: string, enrollmentId: string) => {
  await loadExam(schoolId, examId);
  const plan = await requirePlan(examId);
  await prisma.seat.deleteMany({ where: { planId: plan.id, enrollmentId } });
  return getPlan(schoolId, examId);
};

/*
 * Seats the students not seated yet (late admissions) in the empty seats, room by room.
 * Only classes in the plan's groups; a seat with no classmate beside it is taken first.
 */
const fillEmpty = async (schoolId: string, examId: string) => {
  const exam = await loadExam(schoolId, examId);
  const plan = await requirePlan(examId);
  const grouped = new Set((plan.groups as Groups).flat());
  const students = (await examStudents(exam)).filter((s) => grouped.has(s.classId));
  const seated = new Set(plan.seats.map((s) => s.enrollmentId));
  const waiting = students.filter((s) => !seated.has(s.id));
  if (waiting.length === 0) return getPlan(schoolId, examId);

  const classOf = new Map(students.map((s) => [s.id, s.classId]));
  const taken = new Map(plan.seats.map((s) => [`${s.roomId}:${s.seatNo}`, classOf.get(s.enrollmentId) ?? null]));
  const empty = plan.rooms.flatMap((r) => Array.from({ length: r.seats }, (_, i) => ({ roomId: r.roomId, seatNo: i + 1 }))).filter((s) => !taken.has(`${s.roomId}:${s.seatNo}`));

  const placed: { roomId: string; seatNo: number; enrollmentId: string }[] = [];
  for (const s of waiting) {
    const beside = (seat: { roomId: string; seatNo: number }) =>
      [seat.seatNo - 1, seat.seatNo + 1].some((n) => taken.get(`${seat.roomId}:${n}`) === s.classId);
    const index = empty.findIndex((seat) => !beside(seat));
    const at = index >= 0 ? index : 0;
    const seat = empty[at];
    if (!seat) break;
    empty.splice(at, 1);
    taken.set(`${seat.roomId}:${seat.seatNo}`, s.classId);
    placed.push({ ...seat, enrollmentId: s.id });
  }
  if (placed.length > 0) {
    await prisma.$transaction(async (tx) => {
      await tx.seat.createMany({ data: placed.map((p) => ({ ...p, planId: plan.id })) });
      await tx.seatPlan.update({ where: { id: plan.id }, data: { updatedAt: new Date() } });
    }, TX);
  }
  const result = await getPlan(schoolId, examId);
  return { ...result, placed: placed.length, left: waiting.length - placed.length };
};

/* Adds a room at the end of the plan (more seats without rebuilding it). */
const addRoom = async (schoolId: string, examId: string, roomId: string) => {
  await loadExam(schoolId, examId);
  const plan = await requirePlan(examId);
  if (plan.rooms.some((r) => r.roomId === roomId)) throw new AppError("This room is already in the plan", httpStatus.CONFLICT);
  const room = await prisma.room.findFirst({ where: { id: roomId, schoolId }, select: { capacity: true, isActive: true, number: true } });
  if (!room) throw new AppError("Room not found!", httpStatus.NOT_FOUND);
  if (!room.isActive) throw new AppError(`Room ${room.number} is not in use`, httpStatus.BAD_REQUEST);
  // after the last room (not the count: a removed room leaves a gap, and the count would repeat a place)
  const sortOrder = Math.max(-1, ...plan.rooms.map((r) => r.sortOrder)) + 1;
  await prisma.seatPlanRoom.create({ data: { planId: plan.id, roomId, seats: room.capacity, sortOrder } });
  return getPlan(schoolId, examId);
};

/* Takes an empty room out of the plan. */
const removeRoom = async (schoolId: string, examId: string, roomId: string) => {
  await loadExam(schoolId, examId);
  const plan = await requirePlan(examId);
  if (!plan.rooms.some((r) => r.roomId === roomId)) throw new AppError("This room is not in the plan", httpStatus.NOT_FOUND);
  if (plan.seats.some((s) => s.roomId === roomId)) throw new AppError("Move the students out of this room first", httpStatus.CONFLICT);
  await prisma.$transaction([
    prisma.invigilatorDuty.deleteMany({ where: { planId: plan.id, roomId } }),
    prisma.seatPlanRoom.deleteMany({ where: { planId: plan.id, roomId } }),
  ]);
  return getPlan(schoolId, examId);
};

const deletePlan = async (schoolId: string, examId: string) => {
  await loadExam(schoolId, examId);
  await prisma.seatPlan.deleteMany({ where: { examId } });
  return getPlan(schoolId, examId);
};

export const SeatPlanService = { getPlan, generate, move, clearSeat, fillEmpty, addRoom, removeRoom, deletePlan };
