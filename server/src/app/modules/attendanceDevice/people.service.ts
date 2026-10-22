import httpStatus from "http-status";
import type { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { open, seal } from "../../shared/secretBox";
import { WORKING_STATUSES } from "../teacher/teacher.service";
import type { PeopleQuery } from "./device.validation";

/*
 * The people on a school's devices. Each student (on roll this year) and each working
 * teacher gets a device number (PIN) and, if the school uses cards, an RFID card number.
 * Every change becomes commands queued for each of the school's devices, which collect
 * them when they poll. Fingerprints are taken on a device; it sends them to us and we pass
 * them to the school's other devices, so a person enrolled at one gate is known at all.
 */

type Kind = "student" | "teacher";
type Person = { pin: string; name: string; cardNumber: string | null };

const SENT_RETRY_MS = 10 * 60_000;
const BATCH = 40;

// devices show plain Latin letters only, 24 at most
const deviceName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .'-]/g, "")
    .trim()
    .slice(0, 24);

// --------------------------------------------------------------- commands

export const userCommand = (p: Person) =>
  `DATA UPDATE USERINFO PIN=${p.pin}\tName=${deviceName(p.name)}\tPri=0\tPasswd=\tCard=${p.cardNumber ?? ""}\tGrp=1\tTZ=0000000100000000\tVerify=0`;
export const fingerCommand = (pin: string, f: { fingerIndex: number; size: number; valid: number; template: string }) =>
  `DATA UPDATE FINGERTMP PIN=${pin}\tFID=${f.fingerIndex}\tSize=${f.size}\tValid=${f.valid}\tTMP=${f.template}`;
export const deleteCommand = (pin: string) => `DATA DELETE USERINFO PIN=${pin}`;

/* The commands, for each of the school's devices in use (but the one they came from). */
const queue = async (db: Prisma.TransactionClient | typeof prisma, schoolId: string, bodies: string[], exceptDeviceId?: string) => {
  if (bodies.length === 0) return 0;
  const devices = await db.attendanceDevice.findMany({ where: { schoolId, isActive: true, ...(exceptDeviceId ? { id: { not: exceptDeviceId } } : {}) }, select: { id: true } });
  if (devices.length === 0) return 0;
  await db.deviceCommand.createMany({ data: devices.flatMap((d) => bodies.map((body) => ({ deviceId: d.id, body }))) });
  return devices.length * bodies.length;
};

// ------------------------------------------------------------------ people

/* Who belongs on the devices: students on roll this year, working teachers. */
const currentYearId = async (schoolId: string) =>
  (await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true }, select: { id: true } }))?.id ?? null;

const onRollStudents = (schoolId: string, yearId: string | null): Prisma.StudentWhereInput => ({
  schoolId,
  status: "ACTIVE",
  enrollments: { some: { status: "ACTIVE", ...(yearId ? { academicYearId: yearId } : {}) } },
});

const workingTeachers = (schoolId: string): Prisma.TeacherProfileWhereInput => ({ schoolId, status: { in: WORKING_STATUSES } });

const roll = (r: string | null | undefined) => (r && /^\d+$/.test(r) ? Number(r) : Number.MAX_SAFE_INTEGER);

/* The people list for the school's screen: name, class or post, number, card, fingers. */
const listPeople = async (schoolId: string, query: PeopleQuery) => {
  const yearId = await currentYearId(schoolId);
  const personSelect = { select: { id: true, pin: true, cardNumber: true, _count: { select: { fingerprints: true } } } } as const;

  if (query.kind === "teacher") {
    const teachers = await prisma.teacherProfile.findMany({
      where: { ...workingTeachers(schoolId), ...(query.search ? { OR: [{ nameEn: { contains: query.search, mode: "insensitive" } }, { nameBn: { contains: query.search } }] } : {}) },
      orderBy: { nameEn: "asc" },
      select: { id: true, nameEn: true, nameBn: true, designation: true, devicePerson: personSelect },
    });
    return {
      items: teachers.map((t) => ({
        kind: "teacher" as const,
        id: t.id,
        nameEn: t.nameEn,
        nameBn: t.nameBn,
        info: t.designation,
        person: t.devicePerson && { pin: t.devicePerson.pin, cardNumber: t.devicePerson.cardNumber, fingerprints: t.devicePerson._count.fingerprints },
      })),
    };
  }

  const students = await prisma.student.findMany({
    where: {
      ...onRollStudents(schoolId, yearId),
      ...(query.classId || query.sectionId
        ? { enrollments: { some: { status: "ACTIVE", ...(yearId ? { academicYearId: yearId } : {}), ...(query.classId ? { classId: query.classId } : {}), ...(query.sectionId ? { sectionId: query.sectionId } : {}) } } }
        : {}),
      ...(query.search
        ? { OR: [{ nameEn: { contains: query.search, mode: "insensitive" } }, { nameBn: { contains: query.search } }, { admissionNo: { contains: query.search, mode: "insensitive" } }] }
        : {}),
    },
    take: 500,
    select: {
      id: true,
      nameEn: true,
      nameBn: true,
      admissionNo: true,
      devicePerson: personSelect,
      enrollments: {
        where: { status: "ACTIVE", ...(yearId ? { academicYearId: yearId } : {}) },
        take: 1,
        select: { rollNumber: true, class: { select: { name: true, numericLevel: true } }, section: { select: { name: true, isDefault: true } } },
      },
    },
  });
  students.sort((a, b) => {
    const ea = a.enrollments[0];
    const eb = b.enrollments[0];
    return (ea?.class.numericLevel ?? 0) - (eb?.class.numericLevel ?? 0) || (ea?.section.name ?? "").localeCompare(eb?.section.name ?? "") || roll(ea?.rollNumber) - roll(eb?.rollNumber);
  });
  return {
    items: students.map((s) => {
      const e = s.enrollments[0];
      return {
        kind: "student" as const,
        id: s.id,
        nameEn: s.nameEn,
        nameBn: s.nameBn,
        info: e ? [e.class.name, e.section.isDefault ? null : e.section.name, e.rollNumber ? `#${e.rollNumber}` : null].filter(Boolean).join(" · ") : null,
        admissionNo: s.admissionNo,
        person: s.devicePerson && { pin: s.devicePerson.pin, cardNumber: s.devicePerson.cardNumber, fingerprints: s.devicePerson._count.fingerprints },
      };
    }),
  };
};

/* The next free number of the school (numbers only grow, so a number is never reused). */
const nextPin = async (db: Prisma.TransactionClient, schoolId: string) => {
  const rows = await db.$queryRaw<{ max: number | null }[]>`
    SELECT MAX(CAST("pin" AS INTEGER)) AS max FROM "DevicePerson" WHERE "schoolId" = ${schoolId} AND "pin" ~ '^[0-9]{1,9}$'`;
  return (rows[0]?.max ?? 0) + 1;
};

// one school's numbering at a time
const lockNumbers = (tx: Prisma.TransactionClient, schoolId: string) => tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`device-pins:${schoolId}`}))`;

/* Numbers for everyone who has none yet (or only the people given): students in class, section and roll order, then teachers. */
const assignNumbers = async (schoolId: string, only?: { studentIds?: string[]; teacherIds?: string[] }) => {
  const yearId = await currentYearId(schoolId);
  const [students, teachers] = await Promise.all([
    prisma.student.findMany({
      where: { ...onRollStudents(schoolId, yearId), devicePerson: null, ...(only ? { id: { in: only.studentIds ?? [] } } : {}) },
      select: {
        id: true,
        nameEn: true,
        enrollments: {
          where: { status: "ACTIVE", ...(yearId ? { academicYearId: yearId } : {}) },
          take: 1,
          select: { rollNumber: true, class: { select: { numericLevel: true } }, section: { select: { name: true } } },
        },
      },
    }),
    prisma.teacherProfile.findMany({ where: { ...workingTeachers(schoolId), devicePerson: null, ...(only ? { id: { in: only.teacherIds ?? [] } } : {}) }, orderBy: { nameEn: "asc" }, select: { id: true, nameEn: true } }),
  ]);
  students.sort((a, b) => {
    const ea = a.enrollments[0];
    const eb = b.enrollments[0];
    return (ea?.class.numericLevel ?? 0) - (eb?.class.numericLevel ?? 0) || (ea?.section.name ?? "").localeCompare(eb?.section.name ?? "") || roll(ea?.rollNumber) - roll(eb?.rollNumber);
  });
  if (students.length + teachers.length === 0) return { assigned: 0, queued: 0 };

  return prisma.$transaction(
    async (tx) => {
      await lockNumbers(tx, schoolId);
      let pin = await nextPin(tx, schoolId);
      const rows = [
        ...students.map((s) => ({ schoolId, studentId: s.id, pin: String(pin++), name: s.nameEn })),
        ...teachers.map((t) => ({ schoolId, teacherId: t.id, pin: String(pin++), name: t.nameEn })),
      ];
      await tx.devicePerson.createMany({ data: rows.map(({ name: _name, ...r }) => r) });
      const queued = await queue(tx, schoolId, rows.map((r) => userCommand({ pin: r.pin, name: r.name, cardNumber: null })));
      return { assigned: rows.length, queued };
    },
    { maxWait: 10_000, timeout: 60_000 },
  );
};

/* The person record of a student / teacher of this school (made, with a number, if missing). */
const personOf = async (schoolId: string, kind: Kind, id: string) => {
  const owner =
    kind === "student"
      ? await prisma.student.findFirst({ where: { id, schoolId }, select: { id: true, nameEn: true } })
      : await prisma.teacherProfile.findFirst({ where: { id, schoolId }, select: { id: true, nameEn: true } });
  if (!owner) throw new AppError(kind === "student" ? "Student not found!" : "Teacher not found!", httpStatus.NOT_FOUND);
  const where = kind === "student" ? { studentId: id } : { teacherId: id };
  const existing = await prisma.devicePerson.findUnique({ where: where as Prisma.DevicePersonWhereUniqueInput });
  if (existing) return { person: existing, name: owner.nameEn };
  const person = await prisma.$transaction(async (tx) => {
    await lockNumbers(tx, schoolId);
    return tx.devicePerson.create({ data: { schoolId, ...where, pin: String(await nextPin(tx, schoolId)) } });
  });
  return { person, name: owner.nameEn };
};

/* Sets (or clears) a person's RFID card number; the devices get the change. */
const setCard = async (schoolId: string, kind: Kind, id: string, cardNumber: string | null) => {
  const { person, name } = await personOf(schoolId, kind, id);
  if (cardNumber) {
    const taken = await prisma.devicePerson.findFirst({ where: { schoolId, cardNumber, id: { not: person.id } }, select: { id: true } });
    if (taken) throw new AppError("This card is already given to someone else", httpStatus.CONFLICT);
  }
  const updated = await prisma.devicePerson.update({ where: { id: person.id }, data: { cardNumber } });
  await queue(prisma, schoolId, [userCommand({ pin: updated.pin, name, cardNumber: updated.cardNumber })]);
  return { pin: updated.pin, cardNumber: updated.cardNumber };
};

/*
 * Everything a device should hold, afresh: everyone on roll / working with their card and
 * fingerprints, and the removal of those who left. Its older waiting commands are dropped.
 */
const syncDevice = async (schoolId: string, deviceId: string) => {
  const device = await prisma.attendanceDevice.findFirst({ where: { id: deviceId, schoolId }, select: { id: true, isActive: true } });
  if (!device) throw new AppError("Device not found!", httpStatus.NOT_FOUND);
  if (!device.isActive) throw new AppError("This device is not in use", httpStatus.BAD_REQUEST);
  const yearId = await currentYearId(schoolId);

  const people = await prisma.devicePerson.findMany({
    where: { schoolId },
    select: {
      pin: true,
      cardNumber: true,
      student: { select: { nameEn: true, status: true, enrollments: { where: { status: "ACTIVE", ...(yearId ? { academicYearId: yearId } : {}) }, take: 1, select: { id: true } } } },
      teacher: { select: { nameEn: true, status: true } },
      fingerprints: { select: { fingerIndex: true, size: true, valid: true, template: true } },
    },
  });

  const bodies: string[] = [];
  for (const p of people) {
    const active = p.student
      ? p.student.status === "ACTIVE" && p.student.enrollments.length > 0
      : !!p.teacher && (WORKING_STATUSES as string[]).includes(p.teacher.status);
    if (!active) {
      bodies.push(deleteCommand(p.pin));
      continue;
    }
    bodies.push(userCommand({ pin: p.pin, name: p.student?.nameEn ?? p.teacher?.nameEn ?? "", cardNumber: p.cardNumber }));
    for (const f of p.fingerprints) bodies.push(fingerCommand(p.pin, { ...f, template: open(f.template) }));
  }

  await prisma.$transaction(async (tx) => {
    await tx.deviceCommand.deleteMany({ where: { deviceId, status: { in: ["PENDING", "SENT"] } } });
    if (bodies.length > 0) await tx.deviceCommand.createMany({ data: bodies.map((body) => ({ deviceId, body })) });
  });
  return { queued: bodies.length };
};

// ------------------------------------------------------- from the devices

/* "PIN=1\tName=Rahim\tCard=123" -> { PIN: "1", Name: "Rahim", Card: "123" } */
const fields = (text: string) =>
  Object.fromEntries(
    text
      .split("\t")
      .map((part) => {
        const at = part.indexOf("=");
        return at > 0 ? [part.slice(0, at).trim(), part.slice(at + 1).trim()] : null;
      })
      .filter((x): x is [string, string] => x !== null),
  );

/*
 * People and fingerprints a device sends us (enrolled or changed on it): "USER PIN=…" lines
 * bring a card registered at the device, "FP PIN=…" lines a fingerprint we keep and pass on.
 * Numbers we did not give out are ignored.
 */
const receiveOperlog = async (device: { id: string; schoolId: string }, body: string, table: string) => {
  let users = 0;
  let fingers = 0;
  for (const line of body.split(/\r?\n/)) {
    const kind = table === "USERINFO" ? "USER" : table === "FINGERTMP" ? "FP" : line.split(" ")[0];
    const rest = table === "USERINFO" || table === "FINGERTMP" ? line : line.slice(kind.length + 1);
    if (kind !== "USER" && kind !== "FP") continue;
    const f = fields(rest);
    const pin = f.PIN;
    if (!pin || !/^\d{1,9}$/.test(pin)) continue;
    const person = await prisma.devicePerson.findUnique({ where: { schoolId_pin: { schoolId: device.schoolId, pin } }, select: { id: true, cardNumber: true } });
    if (!person) continue;

    if (kind === "USER") {
      const card = f.Card && f.Card !== "0" && /^[\w-]{1,32}$/.test(f.Card) ? f.Card : null;
      if (card && card !== person.cardNumber) {
        const taken = await prisma.devicePerson.findFirst({ where: { schoolId: device.schoolId, cardNumber: card, id: { not: person.id } }, select: { id: true } });
        if (!taken) {
          await prisma.devicePerson.update({ where: { id: person.id }, data: { cardNumber: card } });
          users++;
        }
      }
    } else {
      const fingerIndex = Number(f.FID);
      const template = f.TMP;
      if (!Number.isInteger(fingerIndex) || fingerIndex < 0 || fingerIndex > 9 || !template || template.length > 20_000) continue;
      const size = Number(f.Size) || template.length;
      const valid = Number(f.Valid ?? 1) || 1;
      await prisma.deviceFingerprint.upsert({
        where: { personId_fingerIndex: { personId: person.id, fingerIndex } },
        create: { personId: person.id, fingerIndex, template: seal(template), size, valid, fromDeviceId: device.id },
        update: { template: seal(template), size, valid, fromDeviceId: device.id },
      });
      // the school's other devices learn the finger too
      await queue(prisma, device.schoolId, [fingerCommand(pin, { fingerIndex, size, valid, template })], device.id);
      fingers++;
    }
  }
  return { users, fingers };
};

/* The device's next commands, as "C:<seq>:<command>" lines; ones sent long ago and never answered go again. */
const nextCommands = async (deviceId: string) => {
  await prisma.deviceCommand.updateMany({ where: { deviceId, status: "SENT", sentAt: { lt: new Date(Date.now() - SENT_RETRY_MS) } }, data: { status: "PENDING" } });
  const commands = await prisma.deviceCommand.findMany({ where: { deviceId, status: "PENDING" }, orderBy: { seq: "asc" }, take: BATCH, select: { id: true, seq: true, body: true } });
  if (commands.length === 0) return null;
  await prisma.deviceCommand.updateMany({ where: { id: { in: commands.map((c) => c.id) } }, data: { status: "SENT", sentAt: new Date() } });
  return commands.map((c) => `C:${c.seq}:${c.body}`).join("\n");
};

/* The device's answers: "ID=12&Return=0&CMD=DATA" lines (0 = done). */
const receiveResults = async (deviceId: string, body: string) => {
  for (const line of body.split(/\r?\n/)) {
    const params = new URLSearchParams(line.trim());
    const seq = Number(params.get("ID"));
    const code = Number(params.get("Return"));
    if (!Number.isInteger(seq) || !params.has("Return")) continue;
    await prisma.deviceCommand.updateMany({
      where: { deviceId, seq },
      data: { status: code >= 0 ? "DONE" : "FAILED", returnCode: Number.isFinite(code) ? code : null, doneAt: new Date() },
    });
  }
};

/* Commands still waiting, per device: for the device list. */
export const pendingByDevice = (schoolId: string) =>
  prisma.deviceCommand.groupBy({ by: ["deviceId"], where: { device: { schoolId }, status: { in: ["PENDING", "SENT"] } }, _count: { _all: true } });

export const PeopleService = { listPeople, assignNumbers, setCard, syncDevice, receiveOperlog, nextCommands, receiveResults };
