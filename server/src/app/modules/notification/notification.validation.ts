import { z } from "zod";
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

export const NotificationValidation = { listQuery, notificationIdParams };

export type NotificationListQuery = z.infer<typeof listQuery>;
