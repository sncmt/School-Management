import { z } from "zod";
import { idSchema } from "../../shared/financeSchemas";

const number = z.string({ error: "Room number is required!" }).trim().min(1, "Room number is required!").max(30, "Room number is too long");
const building = z.string().trim().max(100).nullable().optional();
const capacity = z
  .number({ error: "Seats are required!" })
  .int("Seats must be a whole number")
  .min(1, "A room needs at least 1 seat")
  .max(500, "A room can have at most 500 seats");

const createRoom = z.strictObject({ number, building, capacity });

// several rooms at once: prefix + each number from..to ("101".."110", or "A-1".."A-8")
const createRooms = z
  .strictObject({
    prefix: z.string().trim().max(20).default(""),
    from: z.number().int().min(0).max(9999),
    to: z.number().int().min(0).max(9999),
    building,
    capacity,
  })
  .refine((d) => d.to >= d.from, { path: ["to"], message: "The last number must not be before the first" })
  .refine((d) => d.to - d.from < 100, { path: ["to"], message: "Add at most 100 rooms at a time" });

const updateRoom = z
  .strictObject({ number: number.optional(), building, capacity: capacity.optional(), isActive: z.boolean().optional() })
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field to update" });

const roomIdParams = z.object({ roomId: idSchema("Room id") });

const listQuery = z.object({
  includeInactive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export const RoomValidation = { createRoom, createRooms, updateRoom, roomIdParams, listQuery };

export type CreateRoomPayload = z.infer<typeof createRoom>;
export type CreateRoomsPayload = z.infer<typeof createRooms>;
export type UpdateRoomPayload = z.infer<typeof updateRoom>;
