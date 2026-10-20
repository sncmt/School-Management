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

export const NotificationValidation = { listQuery, notificationIdParams, typeParams, setTypeEnabled };

export type NotificationListQuery = z.infer<typeof listQuery>;
