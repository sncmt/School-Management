import httpStatus from "http-status";
import { prisma } from "../../../../lib/prisma";
import { AppError } from "../../errorHandler/AppError";
import { isForeignKeyViolation, isUniqueViolation } from "../../utils/prismaError";
import type { CreateRoomPayload, CreateRoomsPayload, UpdateRoomPayload } from "./room.validation";

/*
 * The school's rooms, by number, with how many students each seats. Numbers are unique
 * in a school, ignoring case ("lab 2" is "Lab 2").
 */

const DUPLICATE = "A room with this number already exists";

// "2" before "10", "101" before "101A"
const byNumber = (a: { number: string }, b: { number: string }) => a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: "base" });

const assertNumberFree = async (schoolId: string, number: string, excludeId?: string) => {
  const clash = await prisma.room.findFirst({
    where: { schoolId, number: { equals: number, mode: "insensitive" }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (clash) throw new AppError(DUPLICATE, httpStatus.CONFLICT);
};

const listRooms = async (schoolId: string, opts: { includeInactive?: boolean }) => {
  const rooms = await prisma.room.findMany({ where: { schoolId, ...(opts.includeInactive ? {} : { isActive: true }) } });
  rooms.sort(byNumber);
  const active = rooms.filter((r) => r.isActive);
  return { items: rooms, activeRooms: active.length, activeSeats: active.reduce((sum, r) => sum + r.capacity, 0) };
};

const createRoom = async (schoolId: string, data: CreateRoomPayload) => {
  await assertNumberFree(schoolId, data.number);
  try {
    return await prisma.room.create({ data: { schoolId, number: data.number, building: data.building || null, capacity: data.capacity } });
  } catch (e) {
    // the unique index is the last guard against two requests at once
    if (isUniqueViolation(e)) throw new AppError(DUPLICATE, httpStatus.CONFLICT);
    throw e;
  }
};

/* Rooms prefix+from .. prefix+to; numbers that already exist are skipped and reported. */
const createRooms = async (schoolId: string, data: CreateRoomsPayload) => {
  const numbers = Array.from({ length: data.to - data.from + 1 }, (_, i) => `${data.prefix}${data.from + i}`);
  const existing = await prisma.room.findMany({
    where: { schoolId, OR: numbers.map((n) => ({ number: { equals: n, mode: "insensitive" as const } })) },
    select: { number: true },
  });
  const taken = new Set(existing.map((r) => r.number.toLowerCase()));
  const fresh = numbers.filter((n) => !taken.has(n.toLowerCase()));

  if (fresh.length > 0) {
    await prisma.room.createMany({
      data: fresh.map((n) => ({ schoolId, number: n, building: data.building || null, capacity: data.capacity })),
      skipDuplicates: true,
    });
  }
  return { created: fresh, skipped: numbers.filter((n) => taken.has(n.toLowerCase())) };
};

const findRoom = async (schoolId: string, roomId: string) => {
  const room = await prisma.room.findFirst({ where: { id: roomId, schoolId } });
  if (!room) throw new AppError("Room not found!", httpStatus.NOT_FOUND);
  return room;
};

const updateRoom = async (schoolId: string, roomId: string, data: UpdateRoomPayload) => {
  await findRoom(schoolId, roomId);
  if (data.number) await assertNumberFree(schoolId, data.number, roomId);
  try {
    return await prisma.room.update({
      where: { id: roomId },
      data: {
        ...(data.number !== undefined ? { number: data.number } : {}),
        ...(data.building !== undefined ? { building: data.building || null } : {}),
        ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError(DUPLICATE, httpStatus.CONFLICT);
    throw e;
  }
};

const deleteRoom = async (schoolId: string, roomId: string) => {
  await findRoom(schoolId, roomId);
  try {
    await prisma.room.delete({ where: { id: roomId } });
  } catch (e) {
    // a seat plan uses it (Restrict): old plans must keep their rooms
    if (isForeignKeyViolation(e)) throw new AppError("This room is in a seat plan. Stop using it instead", httpStatus.CONFLICT);
    throw e;
  }
  return { id: roomId };
};

export const RoomService = { listRooms, createRoom, createRooms, updateRoom, deleteRoom };
