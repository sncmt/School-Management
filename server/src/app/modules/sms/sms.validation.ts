import { z } from "zod";
import { SmsEvent, SmsLanguage, SmsProvider, SmsStatus } from "../../../../generated/prisma/enums";

const atLeastOne = { message: "Provide at least one field to update" };

const updateSettings = z
  .strictObject({
    // all SMS on or off
    isActive: z.boolean().optional(),
    provider: z.enum(SmsProvider).optional(),
    // "" clears it
    senderId: z
      .string()
      .trim()
      .max(20, "Sender ID: at most 20 characters")
      .transform((v) => v || null)
      .nullable()
      .optional(),
    language: z.enum(SmsLanguage).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, atLeastOne);

// null or "" brings the default wording back
const body = z.string().trim().max(1000, "An SMS template can be at most 1000 characters").nullable().optional();

const updateTemplate = z
  .strictObject({ enabled: z.boolean().optional(), bodyBn: body, bodyEn: body })
  .refine((d) => Object.keys(d).length > 0, atLeastOne);

const eventParams = z.object({ event: z.enum(SmsEvent) });

const logQuery = z.object({
  status: z.enum(SmsStatus).optional(),
  // a phone number or a student's name
  search: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// who an SMS by hand goes to: the whole school, a class, or a section
const recipientsQuery = z.object({
  classId: z.string().trim().min(1).optional(),
  sectionId: z.string().trim().min(1).optional(),
});

const sendSms = recipientsQuery.extend({
  message: z.string({ error: "Write the message" }).trim().min(1, "Write the message").max(1000, "A message can be at most 1000 characters"),
});

export const SmsValidation = { updateSettings, updateTemplate, eventParams, logQuery, recipientsQuery, sendSms };

export type UpdateSmsSettingsPayload = z.infer<typeof updateSettings>;
export type UpdateSmsTemplatePayload = z.infer<typeof updateTemplate>;
export type SmsLogQuery = z.infer<typeof logQuery>;
export type SmsRecipientsQuery = z.infer<typeof recipientsQuery>;
export type SendSmsPayload = z.infer<typeof sendSms>;
