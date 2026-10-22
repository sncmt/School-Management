import { z } from "zod";
import { idSchema } from "../../shared/financeSchemas";

const serialNumber = z
  .string({ error: "Serial number is required!" })
  .trim()
  .min(4, "Enter the device's serial number")
  .max(64, "The serial number is too long")
  // as printed on the device (Menu → System Info → Device Info): letters and digits
  .regex(/^[A-Za-z0-9_-]+$/, "Use the serial number as shown on the device: letters and digits only");

const name = z.string({ error: "Name is required!" }).trim().min(1, "Give the device a name").max(60);
const location = z.string().trim().max(100).nullable().optional();

const createDevice = z.strictObject({ serialNumber, name, location });
const updateDevice = z
  .strictObject({ name: name.optional(), location, isActive: z.boolean().optional() })
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field to update" });

const deviceParams = z.object({ deviceId: idSchema("Device id") });
const punchesQuery = z.object({
  deviceId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const peopleQuery = z.object({
  kind: z.enum(["student", "teacher"]).default("student"),
  classId: z.string().trim().min(1).optional(),
  sectionId: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).max(60).optional(),
});

const personParams = z.object({ kind: z.enum(["student", "teacher"]), id: idSchema("Person id") });

const setCard = z.strictObject({
  // as the card reader shows it; null clears the card
  cardNumber: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z-]{1,32}$/, "Use the card number as the reader shows it: digits (and letters) only")
    .nullable(),
});

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use the 24-hour time HH:mm, for example 10:00");
const minutes = z.number().int().min(0, "Minutes can't be below 0").max(240, "At most 240 minutes");

const saveRules = z.strictObject({
  lateAfterMinutes: minutes,
  // null: never marked absent by the device
  studentAbsentAt: hhmm.nullable(),
  teacherStartTime: hhmm,
  teacherLateAfterMinutes: minutes,
  teacherAbsentAt: hhmm.nullable(),
  checkoutGapMinutes: z.number().int().min(5, "At least 5 minutes").max(600, "At most 600 minutes"),
});

export const DeviceValidation = {
  saveRules, createDevice, updateDevice, deviceParams, punchesQuery, peopleQuery, personParams, setCard };

export type CreateDevicePayload = z.infer<typeof createDevice>;
export type UpdateDevicePayload = z.infer<typeof updateDevice>;
export type PeopleQuery = z.infer<typeof peopleQuery>;
export type SaveRulesPayload = z.infer<typeof saveRules>;
