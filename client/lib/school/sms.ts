"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import type { BilingualName } from "@/lib/i18n/names";

import type { SmsActivity } from "./smsKinds";

// Mirrors server/src/app/modules/sms. Dates arrive as ISO strings.

export { activityPermission, SMS_ACTIVITIES, SMS_PERMISSIONS } from "./smsKinds";
export type { SmsActivity } from "./smsKinds";

export type SmsEvent =
  | "STUDENT_ADMITTED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_CANCELLED"
  | "STUDENT_ABSENT"
  | "STUDENT_LATE"
  | "RESULT_PUBLISHED"
  | "ADMIT_CARD_RELEASED"
  | "FEE_DUE"
  | "STUDENT_PROMOTED"
  | "STUDENT_GRADUATED";

export type SmsLanguage = "BN" | "EN";
export type SmsProvider = "TEST";
export type SmsStatus = "QUEUED" | "SENDING" | "SENT" | "FAILED" | "CANCELLED";
export const SMS_STATUSES: SmsStatus[] = ["QUEUED", "SENDING", "SENT", "FAILED", "CANCELLED"];

export type SmsSettings = {
  isActive: boolean;
  provider: SmsProvider;
  senderId: string | null;
  language: SmsLanguage;
  updatedAt: string | null;
};

export type SmsTemplate = {
  event: SmsEvent;
  activity: SmsActivity;
  enabled: boolean;
  // the wording in use: the school's own, or the default
  bodyBn: string;
  bodyEn: string;
  customBn: boolean;
  customEn: boolean;
  defaults: Record<SmsLanguage, string>;
  placeholders: string[];
};

export type SmsMessage = {
  id: string;
  phone: string;
  body: string;
  parts: number;
  // null: sent by hand
  event: SmsEvent | null;
  status: SmsStatus;
  sendAfter: string;
  attempts: number;
  error: string | null;
  provider: SmsProvider | null;
  sentAt: string | null;
  createdAt: string;
  createdBy: string | null;
  student: (BilingualName & { id: string; admissionNo: string }) | null;
};

export type SmsLog = {
  items: SmsMessage[];
  thisMonth: Record<SmsStatus, number> & { partsSent: number };
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type SmsLogQuery = { page: number; limit: number; status?: SmsStatus; search?: string };
export type SmsTarget = { classId?: string; sectionId?: string };
export type SmsRecipients = { students: number; withoutPhone: number; phones: number };

export const smsApi = {
  settings: async () => (await httpClient.get<ApiResponse<SmsSettings>>("/sms/settings")).data.data,
  updateSettings: async (body: Partial<Omit<SmsSettings, "updatedAt">>) =>
    (await httpClient.patch<ApiResponse<SmsSettings>>("/sms/settings", body)).data.data,

  templates: async () => (await httpClient.get<ApiResponse<SmsTemplate[]>>("/sms/templates")).data.data,
  // a body of null brings the default wording back
  updateTemplate: async ({ event, body }: { event: SmsEvent; body: { enabled?: boolean; bodyBn?: string | null; bodyEn?: string | null } }) =>
    (await httpClient.patch<ApiResponse<SmsTemplate>>(`/sms/templates/${event}`, body)).data.data,

  log: async (query: SmsLogQuery) => (await httpClient.get<ApiResponse<SmsLog>>("/sms/messages", { params: query })).data.data,

  recipients: async (target: SmsTarget) => (await httpClient.get<ApiResponse<SmsRecipients>>("/sms/recipients", { params: target })).data.data,
  send: async (body: SmsTarget & { message: string }) =>
    (await httpClient.post<ApiResponse<{ queued: number; parts: number; totalParts: number }>>("/sms/send", body)).data.data,
};

const smsKey = ["school", "sms"] as const;

export const useSmsSettings = (enabled = true) => useQuery({ queryKey: [...smsKey, "settings"], queryFn: smsApi.settings, enabled });
export const useSmsTemplates = (enabled = true) => useQuery({ queryKey: [...smsKey, "templates"], queryFn: smsApi.templates, enabled });
export const useSmsLog = (query: SmsLogQuery, enabled = true) =>
  useQuery({ queryKey: [...smsKey, "log", query], queryFn: () => smsApi.log(query), placeholderData: keepPreviousData, enabled, refetchInterval: 30_000 });
export const useSmsRecipients = (target: SmsTarget, enabled = true) =>
  useQuery({ queryKey: [...smsKey, "recipients", target], queryFn: () => smsApi.recipients(target), enabled });

const useSmsMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: smsKey }) });
};

export const useUpdateSmsSettings = () => useSmsMutation(smsApi.updateSettings);
export const useUpdateSmsTemplate = () => useSmsMutation(smsApi.updateTemplate);
export const useSendSms = () => useSmsMutation(smsApi.send);

// ------------------------------------------------------------------ length

// the GSM 03.38 alphabet (mirrors the server): only these keep an SMS at 160 characters
const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXTENDED = "^{}\\[~]|€\f";

/** How many SMS a text takes: GSM 160 (153 each when split), Unicode 70 (67 each when split). */
export const smsParts = (text: string) => {
  let gsm = 0;
  for (const ch of text) {
    if (GSM_BASIC.includes(ch)) gsm += 1;
    else if (GSM_EXTENDED.includes(ch)) gsm += 2;
    else return { unicode: true, length: text.length, parts: text.length === 0 ? 0 : text.length <= 70 ? 1 : Math.ceil(text.length / 67) };
  }
  return { unicode: false, length: gsm, parts: gsm === 0 ? 0 : gsm <= 160 ? 1 : Math.ceil(gsm / 153) };
};
