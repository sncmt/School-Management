import httpStatus from "http-status";
import { prisma } from "../../../../lib/prisma";
import config from "../../config";
import { AppError } from "../../errorHandler/AppError";
import { todayInBangladesh } from "../../shared/scheduleSchemas";
import type { CreateDevicePayload, UpdateDevicePayload } from "./device.validation";
import { pendingByDevice } from "./people.service";
import { rulesOf } from "./processor.service";
import type { SaveRulesPayload } from "./device.validation";

/*
 * A school's attendance devices: registering them by serial number, seeing whether they
 * are online and what they sent. A device polls every few seconds, so one not heard from
 * for two minutes is offline.
 */

const ONLINE_MS = 2 * 60_000;

// midnight in Bangladesh, as a moment
const startOfToday = () => new Date(todayInBangladesh().getTime() - 6 * 3_600_000);

const listDevices = async (schoolId: string) => {
  const [devices, today, pending] = await Promise.all([
    prisma.attendanceDevice.findMany({ where: { schoolId }, orderBy: [{ isActive: "desc" }, { name: "asc" }] }),
    prisma.devicePunch.groupBy({ by: ["deviceId"], where: { schoolId, punchedAt: { gte: startOfToday() } }, _count: { _all: true } }),
    pendingByDevice(schoolId),
  ]);
  const now = Date.now();
  return {
    // what the school types into the device's "cloud server" settings
    server: { host: config.deviceServer.host, port: config.deviceServer.port },
    items: devices.map(({ attlogStamp: _stamp, operlogStamp: _opStamp, ...d }) => ({
      ...d,
      online: !!d.lastSeenAt && now - d.lastSeenAt.getTime() < ONLINE_MS,
      punchesToday: today.find((t) => t.deviceId === d.id)?._count._all ?? 0,
      // commands (people, fingerprints) the device has still to take
      pending: pending.find((p) => p.deviceId === d.id)?._count._all ?? 0,
    })),
  };
};

const findDevice = async (schoolId: string, deviceId: string) => {
  const device = await prisma.attendanceDevice.findFirst({ where: { id: deviceId, schoolId } });
  if (!device) throw new AppError("Device not found!", httpStatus.NOT_FOUND);
  return device;
};

const createDevice = async (schoolId: string, data: CreateDevicePayload) => {
  const taken = await prisma.attendanceDevice.findUnique({ where: { serialNumber: data.serialNumber }, select: { schoolId: true } });
  if (taken) {
    throw new AppError(
      taken.schoolId === schoolId ? "This device is already added" : "This device is registered to another school. Ask them to remove it first",
      httpStatus.CONFLICT,
    );
  }
  return prisma.attendanceDevice.create({ data: { schoolId, serialNumber: data.serialNumber, name: data.name, location: data.location || null } });
};

const updateDevice = async (schoolId: string, deviceId: string, data: UpdateDevicePayload) => {
  await findDevice(schoolId, deviceId);
  return prisma.attendanceDevice.update({
    where: { id: deviceId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.location !== undefined ? { location: data.location || null } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
};

/* Only a device that never sent a punch: its punches are attendance history. */
const deleteDevice = async (schoolId: string, deviceId: string) => {
  await findDevice(schoolId, deviceId);
  const punches = await prisma.devicePunch.count({ where: { deviceId } });
  if (punches > 0) throw new AppError("This device has sent punches. Stop using it instead", httpStatus.CONFLICT);
  await prisma.attendanceDevice.delete({ where: { id: deviceId } });
  return { id: deviceId };
};

/*
 * The latest punches, of one device or all the school's, with who each was and what it
 * became (arrived, late, left…); and today's arrivals by the devices so far.
 */
const recentPunches = async (schoolId: string, deviceId: string | undefined, limit: number) => {
  if (deviceId) await findDevice(schoolId, deviceId);
  const today = todayInBangladesh();
  const [rows, studentsToday, teachersToday] = await Promise.all([
    prisma.devicePunch.findMany({
      where: { schoolId, ...(deviceId ? { deviceId } : {}) },
      orderBy: { punchedAt: "desc" },
      take: limit,
      select: { id: true, pin: true, punchedAt: true, status: true, verifyType: true, processedAt: true, outcome: true, device: { select: { id: true, name: true } } },
    }),
    prisma.studentAttendance.groupBy({ by: ["status"], where: { session: { schoolId, date: today }, source: "DEVICE" }, _count: { _all: true } }),
    prisma.teacherAttendance.groupBy({ by: ["status"], where: { schoolId, date: today, source: "DEVICE" }, _count: { _all: true } }),
  ]);
  const people = await prisma.devicePerson.findMany({
    where: { schoolId, pin: { in: [...new Set(rows.map((r) => r.pin))] } },
    select: {
      pin: true,
      student: { select: { id: true, nameEn: true, nameBn: true, enrollments: { where: { status: "ACTIVE" }, orderBy: { academicYear: { startDate: "desc" } }, take: 1, select: { rollNumber: true, class: { select: { name: true } }, section: { select: { name: true, isDefault: true } } } } } },
      teacher: { select: { id: true, nameEn: true, nameBn: true, designation: true } },
    },
  });
  const whoOf = new Map(
    people.map((p) => {
      const e = p.student?.enrollments[0];
      return [
        p.pin,
        p.student
          ? { kind: "student" as const, id: p.student.id, nameEn: p.student.nameEn, nameBn: p.student.nameBn, info: e ? [e.class.name, e.section.isDefault ? null : e.section.name, e.rollNumber ? `#${e.rollNumber}` : null].filter(Boolean).join(" · ") : null }
          : { kind: "teacher" as const, id: p.teacher!.id, nameEn: p.teacher!.nameEn, nameBn: p.teacher!.nameBn, info: p.teacher!.designation },
      ];
    }),
  );
  const count = (groups: { status: string; _count: { _all: number } }[], ...statuses: string[]) =>
    groups.filter((g) => statuses.includes(g.status)).reduce((sum, g) => sum + g._count._all, 0);
  return {
    today: {
      studentsIn: count(studentsToday, "PRESENT", "LATE"),
      studentsLate: count(studentsToday, "LATE"),
      studentsAbsent: count(studentsToday, "ABSENT"),
      teachersIn: count(teachersToday, "PRESENT", "LATE"),
      teachersLate: count(teachersToday, "LATE"),
    },
    items: rows.map((r) => ({ ...r, person: whoOf.get(r.pin) ?? null })),
  };
};

/* The school's rules for turning punches into attendance (the defaults until it saves its own). */
const getRules = async (schoolId: string) => {
  const { studentAbsentDoneOn: _s, teacherAbsentDoneOn: _t, ...rules } = await rulesOf(schoolId);
  return {
    lateAfterMinutes: rules.lateAfterMinutes,
    studentAbsentAt: rules.studentAbsentAt,
    teacherStartTime: rules.teacherStartTime,
    teacherLateAfterMinutes: rules.teacherLateAfterMinutes,
    teacherAbsentAt: rules.teacherAbsentAt,
    checkoutGapMinutes: rules.checkoutGapMinutes,
  };
};

const saveRules = async (schoolId: string, userId: string, data: SaveRulesPayload) => {
  await prisma.deviceAttendanceSetting.upsert({ where: { schoolId }, create: { schoolId, ...data, updatedBy: userId }, update: { ...data, updatedBy: userId } });
  return getRules(schoolId);
};

export const DeviceService = { listDevices, createDevice, updateDevice, deleteDevice, recentPunches, getRules, saveRules };
