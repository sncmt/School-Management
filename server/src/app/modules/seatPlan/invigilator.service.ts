import httpStatus from "http-status";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { dayKey, todayInBangladesh } from "../../shared/scheduleSchemas";
import type { SetDutyPayload } from "./seatPlan.validation";

/*
 * Invigilator duties of an exam's seat plan. A sitting is a date and start time of the
 * routine; a room needs invigilators at a sitting only when someone seated there has a
 * paper then. Auto-assigning spreads the duties evenly over the working teachers, never
 * puts one teacher in two rooms at once, and keeps teachers away from their own subject's
 * paper where it can. Teachers on leave are not given duties.
 */

type Auth = NonNullable<Express.Request["auth"]>;

const TX = { maxWait: 10_000, timeout: 30_000 };
const keyOf = (date: string, startTime: string) => `${date}|${startTime}`;

const loadPlan = async (schoolId: string, examId: string) => {
  const exam = await prisma.exam.findFirst({ where: { id: examId, schoolId }, select: { id: true } });
  if (!exam) throw new AppError("Exam not found!", httpStatus.NOT_FOUND);
  const plan = await prisma.seatPlan.findUnique({
    where: { examId },
    select: {
      id: true,
      invigilatorsPerRoom: true,
      rooms: { orderBy: { sortOrder: "asc" }, select: { roomId: true, room: { select: { number: true, building: true } } } },
      seats: { select: { roomId: true, enrollment: { select: { classId: true } } } },
    },
  });
  if (!plan) throw new AppError("Make the seat plan first", httpStatus.NOT_FOUND);
  return plan;
};

type Plan = Awaited<ReturnType<typeof loadPlan>>;

/* The exam's sittings in order, each with its papers and the plan's rooms in use then. */
const sittingsOf = async (examId: string, plan: Plan) => {
  const subjects = await prisma.examSubject.findMany({
    where: { examClass: { examId } },
    select: {
      date: true,
      startTime: true,
      endTime: true,
      classSubjectId: true,
      examClass: { select: { class: { select: { id: true, name: true, numericLevel: true } } } },
      classSubject: { select: { subject: { select: { nameEn: true, nameBn: true } } } },
    },
  });

  type Sitting = {
    key: string;
    date: string;
    startTime: string;
    endTime: string | null;
    papers: { classId: string; className: string; level: number; classSubjectId: string; subject: { nameEn: string | null; nameBn: string | null } }[];
  };
  const byKey = new Map<string, Sitting>();
  for (const s of subjects) {
    const date = dayKey(s.date);
    const startTime = s.startTime ?? "";
    const key = keyOf(date, startTime);
    const sitting = byKey.get(key) ?? { key, date, startTime, endTime: null, papers: [] };
    if (s.endTime && (!sitting.endTime || s.endTime > sitting.endTime)) sitting.endTime = s.endTime;
    sitting.papers.push({
      classId: s.examClass.class.id,
      className: s.examClass.class.name,
      level: s.examClass.class.numericLevel,
      classSubjectId: s.classSubjectId,
      subject: s.classSubject.subject,
    });
    byKey.set(key, sitting);
  }

  // students of each class in each room
  const perRoom = new Map<string, Map<string, number>>();
  for (const seat of plan.seats) {
    const counts = perRoom.get(seat.roomId) ?? new Map<string, number>();
    counts.set(seat.enrollment.classId, (counts.get(seat.enrollment.classId) ?? 0) + 1);
    perRoom.set(seat.roomId, counts);
  }

  return [...byKey.values()]
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .map((s) => {
      const classes = new Set(s.papers.map((p) => p.classId));
      const rooms = plan.rooms
        .map((r) => {
          const counts = perRoom.get(r.roomId) ?? new Map<string, number>();
          const students = [...counts].filter(([classId]) => classes.has(classId)).reduce((sum, [, n]) => sum + n, 0);
          return { roomId: r.roomId, number: r.room.number, building: r.room.building, students, classIds: [...counts.keys()].filter((c) => classes.has(c)) };
        })
        .filter((r) => r.students > 0);
      return { ...s, papers: s.papers.sort((a, b) => a.level - b.level), rooms };
    });
};

const workingTeachers = (schoolId: string) =>
  prisma.teacherProfile.findMany({
    where: { schoolId, status: { in: ["ACTIVE", "ON_LEAVE"] } },
    orderBy: { nameEn: "asc" },
    select: { id: true, nameEn: true, nameBn: true, designation: true, status: true },
  });

/* Each paper's (class subject's) teachers, to keep them away from their own paper. */
const subjectTeachersOf = async (classSubjectIds: string[]) => {
  const rows = await prisma.subjectTeacher.findMany({ where: { classSubjectId: { in: classSubjectIds } }, select: { classSubjectId: true, teacherId: true } });
  const of = new Map<string, Set<string>>();
  for (const r of rows) of.set(r.classSubjectId, (of.get(r.classSubjectId) ?? new Set()).add(r.teacherId));
  return of;
};

// ---------------------------------------------------------------------- read

const getDuties = async (schoolId: string, examId: string) => {
  const plan = await loadPlan(schoolId, examId);
  const [sittings, teachers, duties] = await Promise.all([
    sittingsOf(examId, plan),
    workingTeachers(schoolId),
    prisma.invigilatorDuty.findMany({ where: { planId: plan.id }, select: { roomId: true, date: true, startTime: true, teacherId: true } }),
  ]);
  const ownSubject = await subjectTeachersOf([...new Set(sittings.flatMap((s) => s.papers.map((p) => p.classSubjectId)))]);

  const dutyOf = new Map<string, string[]>();
  const load = new Map<string, number>();
  for (const d of duties) {
    const k = `${keyOf(dayKey(d.date), d.startTime)}|${d.roomId}`;
    dutyOf.set(k, [...(dutyOf.get(k) ?? []), d.teacherId]);
    load.set(d.teacherId, (load.get(d.teacherId) ?? 0) + 1);
  }

  return {
    perRoom: plan.invigilatorsPerRoom,
    sittings: sittings.map((s) => ({
      key: s.key,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      papers: s.papers.map((p) => ({ classId: p.classId, className: p.className, subject: p.subject })),
      rooms: s.rooms.map((r) => {
        // the teachers of the papers written in this room at this sitting
        const own = new Set(s.papers.filter((p) => r.classIds.includes(p.classId)).flatMap((p) => [...(ownSubject.get(p.classSubjectId) ?? [])]));
        return { roomId: r.roomId, number: r.number, building: r.building, students: r.students, teacherIds: dutyOf.get(`${s.key}|${r.roomId}`) ?? [], ownSubjectTeacherIds: [...own] };
      }),
    })),
    teachers: teachers.map((t) => ({ ...t, duties: load.get(t.id) ?? 0 })),
    total: duties.length,
  };
};

// -------------------------------------------------------------------- assign

/* Assigns every room at every sitting afresh: perRoom teachers each, the duties spread evenly. */
const autoAssign = async (schoolId: string, examId: string, perRoom: number) => {
  const plan = await loadPlan(schoolId, examId);
  const [sittings, teachers] = await Promise.all([sittingsOf(examId, plan), workingTeachers(schoolId)]);
  if (sittings.length === 0) throw new AppError("The exam routine has no dates yet", httpStatus.BAD_REQUEST);
  const available = teachers.filter((t) => t.status === "ACTIVE");
  if (available.length === 0) throw new AppError("There are no working teachers to assign", httpStatus.BAD_REQUEST);
  const ownSubject = await subjectTeachersOf([...new Set(sittings.flatMap((s) => s.papers.map((p) => p.classSubjectId)))]);

  const load = new Map(available.map((t) => [t.id, 0]));
  const duties: { roomId: string; date: Date; startTime: string; teacherId: string }[] = [];
  let missing = 0;

  for (const s of sittings) {
    const busy = new Set<string>();
    for (const room of s.rooms) {
      const own = new Set(s.papers.filter((p) => room.classIds.includes(p.classId)).flatMap((p) => [...(ownSubject.get(p.classSubjectId) ?? [])]));
      // the least loaded first, a teacher of the paper written here last
      const picks = available
        .filter((t) => !busy.has(t.id))
        .sort((a, b) => Number(own.has(a.id)) - Number(own.has(b.id)) || load.get(a.id)! - load.get(b.id)! || a.nameEn.localeCompare(b.nameEn))
        .slice(0, perRoom);
      missing += perRoom - picks.length;
      for (const t of picks) {
        busy.add(t.id);
        load.set(t.id, load.get(t.id)! + 1);
        duties.push({ roomId: room.roomId, date: new Date(`${s.date}T00:00:00Z`), startTime: s.startTime, teacherId: t.id });
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.seatPlan.update({ where: { id: plan.id }, data: { invigilatorsPerRoom: perRoom } });
    await tx.invigilatorDuty.deleteMany({ where: { planId: plan.id } });
    await tx.invigilatorDuty.createMany({ data: duties.map((d) => ({ ...d, planId: plan.id })) });
  }, TX);
  return { ...(await getDuties(schoolId, examId)), missing };
};

/* Sets the invigilators of one room at one sitting (none clears it). */
const setRoomDuty = async (schoolId: string, examId: string, payload: SetDutyPayload) => {
  const plan = await loadPlan(schoolId, examId);
  const date = dayKey(payload.date);
  const sittings = await sittingsOf(examId, plan);
  const sitting = sittings.find((s) => s.key === keyOf(date, payload.startTime));
  if (!sitting) throw new AppError("There is no paper at that time", httpStatus.BAD_REQUEST);
  if (!plan.rooms.some((r) => r.roomId === payload.roomId)) throw new AppError("This room is not in the seat plan", httpStatus.BAD_REQUEST);

  const teacherIds = [...new Set(payload.teacherIds)];
  const teachers = await prisma.teacherProfile.findMany({
    where: { id: { in: teacherIds }, schoolId, status: { in: ["ACTIVE", "ON_LEAVE"] } },
    select: { id: true, nameEn: true },
  });
  if (teachers.length !== teacherIds.length) throw new AppError("Choose working teachers of this school", httpStatus.BAD_REQUEST);

  // one room at a time
  const elsewhere = await prisma.invigilatorDuty.findFirst({
    where: { planId: plan.id, date: payload.date, startTime: payload.startTime, teacherId: { in: teacherIds }, roomId: { not: payload.roomId } },
    select: { teacherId: true, room: { select: { number: true } } },
  });
  if (elsewhere) {
    const who = teachers.find((t) => t.id === elsewhere.teacherId)?.nameEn ?? "";
    throw new AppError(`${who} is already in room ${elsewhere.room.number} at that time`, httpStatus.CONFLICT);
  }

  await prisma.$transaction(async (tx) => {
    await tx.invigilatorDuty.deleteMany({ where: { planId: plan.id, date: payload.date, startTime: payload.startTime, roomId: payload.roomId } });
    if (teacherIds.length > 0) {
      await tx.invigilatorDuty.createMany({
        data: teacherIds.map((teacherId) => ({ planId: plan.id, roomId: payload.roomId, date: payload.date, startTime: payload.startTime, teacherId })),
      });
    }
  }, TX);
  return getDuties(schoolId, examId);
};

const clearDuties = async (schoolId: string, examId: string) => {
  const plan = await loadPlan(schoolId, examId);
  await prisma.invigilatorDuty.deleteMany({ where: { planId: plan.id } });
  return getDuties(schoolId, examId);
};

// ------------------------------------------------------------------- teacher

/* The logged-in teacher's duties from today, with who else is in the room. */
const myDuties = async (auth: Auth) => {
  const teacher = auth.membershipId
    ? await prisma.teacherProfile.findUnique({ where: { membershipId: auth.membershipId }, select: { id: true, schoolId: true } })
    : null;
  if (!teacher || teacher.schoolId !== auth.schoolId) return { items: [] };

  const duties = await prisma.invigilatorDuty.findMany({
    where: { teacherId: teacher.id, date: { gte: todayInBangladesh() } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: 30,
    select: {
      planId: true,
      roomId: true,
      date: true,
      startTime: true,
      room: { select: { number: true, building: true } },
      plan: { select: { exam: { select: { id: true, nameEn: true, nameBn: true } } } },
    },
  });
  if (duties.length === 0) return { items: [] };

  const partners = await prisma.invigilatorDuty.findMany({
    where: { OR: duties.map((d) => ({ planId: d.planId, roomId: d.roomId, date: d.date, startTime: d.startTime })), teacherId: { not: teacher.id } },
    select: { planId: true, roomId: true, date: true, startTime: true, teacher: { select: { nameEn: true, nameBn: true } } },
  });
  const same = (a: { planId: string; roomId: string; date: Date; startTime: string }, b: typeof a) =>
    a.planId === b.planId && a.roomId === b.roomId && a.date.getTime() === b.date.getTime() && a.startTime === b.startTime;

  return {
    items: duties.map((d) => ({
      exam: d.plan.exam,
      date: dayKey(d.date),
      startTime: d.startTime || null,
      room: d.room,
      with: partners.filter((p) => same(p, d)).map((p) => p.teacher),
    })),
  };
};

export const InvigilatorService = { getDuties, autoAssign, setRoomDuty, clearDuties, myDuties };
