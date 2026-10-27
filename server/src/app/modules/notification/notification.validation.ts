import { z } from "zod";
import { NotificationType } from "../../../../generated/prisma/enums";
import { idSchema } from "../../shared/financeSchemas";

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  // "true": unread ones only
  unread: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

const notificationIdParams = z.object({ notificationId: idSchema("Message id") });

// turning one in-app message type on or off for the school
const typeParams = z.object({ type: z.enum(NotificationType) });
const setTypeEnabled = z.strictObject({ enabled: z.boolean({ error: "Say whether it is on or off" }) });

// the mobile app's phone for push notifications (a Firebase token is about 160 characters)
const token = z.string({ error: "Device token is required" }).trim().min(20, "Invalid device token").max(4096);
const registerDevice = z.strictObject({
  token,
  language: z.enum(["BN", "EN"]).default("BN"),
  platform: z.enum(["android", "ios"]).default("android"),
});
const unregisterDevice = z.strictObject({ token });

export const NotificationValidation = { listQuery, notificationIdParams, typeParams, setTypeEnabled, registerDevice, unregisterDevice };

export type NotificationListQuery = z.infer<typeof listQuery>;
