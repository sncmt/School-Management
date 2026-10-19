import { z } from "zod";
import { idSchema } from "../../shared/financeSchemas";
import { dateOnlySchema, timeSchema } from "../../shared/scheduleSchemas";

const generate = z.strictObject({
  // the rooms in the order they fill
  roomIds: z.array(idSchema("Room")).min(1, "Choose at least one room").max(200),
  // groups of class ids that share rooms, in fill order; a class in no group is not seated
  groups: z
    .array(z.array(idSchema("Class")).min(1, "A group needs a class").max(6, "At most 6 classes in a group"))
    .min(1, "Put at least one class in a group")
    .max(30),
});

const move = z.strictObject({
  enrollmentId: idSchema("Student"),
  roomId: idSchema("Room"),
  seatNo: z.number().int().min(1),
});

const addRoom = z.strictObject({ roomId: idSchema("Room") });

const autoAssign = z.strictObject({
  perRoom: z.number().int().min(1, "At least one invigilator a room").max(4, "At most 4 invigilators a room"),
});

const setDuty = z.strictObject({
  date: dateOnlySchema,
  // "" when the routine has no time that day
  startTime: z.union([z.literal(""), timeSchema]),
  roomId: idSchema("Room"),
  // none: the room has no invigilator at that sitting
  teacherIds: z.array(idSchema("Teacher")).max(4, "At most 4 invigilators a room"),
});

const examParams = z.object({ examId: idSchema("Exam id") });
const seatParams = z.object({ examId: idSchema("Exam id"), enrollmentId: idSchema("Student") });
const roomParams = z.object({ examId: idSchema("Exam id"), roomId: idSchema("Room id") });

export const SeatPlanValidation = { generate, move, addRoom, autoAssign, setDuty, examParams, seatParams, roomParams };

export type GeneratePayload = z.infer<typeof generate>;
export type MovePayload = z.infer<typeof move>;
export type SetDutyPayload = z.infer<typeof setDuty>;
