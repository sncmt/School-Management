"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import type { BilingualName } from "@/lib/i18n/names";

// Mirrors server/src/app/modules/notification. Dates arrive as ISO strings.

export type NotificationType =
  | "STUDENT_ADMITTED"
  | "PAYMENT_RECEIVED"
  | "PAYMENT_CANCELLED"
  | "STUDENT_ABSENT"
  | "STUDENT_LATE"
  | "RESULT_PUBLISHED"
  | "ADMIT_CARD_RELEASED"
  | "FEE_DUE"
  | "STUDENT_PROMOTED";

/* The facts a message keeps; the sentence is written here, in the reader's language. */
export type NotificationData = {
  student: BilingualName;
  // STUDENT_ADMITTED, STUDENT_PROMOTED (the new class; a graduate's last class)
  admissionNo?: string;
  className?: string | null;
  section?: string | null;
  academicYear?: string | null;
  // STUDENT_PROMOTED
  outcome?: "PROMOTED" | "GRADUATED";
  // PAYMENT_*, FEE_DUE (the total owed)
  amount?: string;
  // FEE_DUE: how many fees make up the amount
  fees?: number;
  receiptNo?: string;
  // STUDENT_ABSENT / STUDENT_LATE: YYYY-MM-DD
  date?: string;
  // RESULT_PUBLISHED / ADMIT_CARD_RELEASED
  exam?: BilingualName;
};

export type AppNotification = {
  id: string;
  type: NotificationType;
  data: NotificationData;
  studentId: string | null;
  read: boolean;
  createdAt: string;
};

export type NotificationList = {
  items: AppNotification[];
  unread: number;
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type NotificationQuery = { page?: number; limit?: number; unread?: boolean };

export const notificationsApi = {
  list: async ({ unread, ...query }: NotificationQuery) =>
    (await httpClient.get<ApiResponse<NotificationList>>("/notification", { params: { ...query, unread: unread ? "true" : undefined } })).data
      .data,

  unreadCount: async () => (await httpClient.get<ApiResponse<{ unread: number }>>("/notification/unread-count")).data.data,

  markRead: async (notificationId: string) =>
    (await httpClient.post<ApiResponse<{ unread: number }>>(`/notification/${notificationId}/read`)).data.data,

  markAllRead: async () => (await httpClient.post<ApiResponse<{ unread: number }>>("/notification/read-all")).data.data,
};

const notificationsKey = ["school", "notifications"] as const;
const countKey = [...notificationsKey, "unread-count"] as const;

// how often the badge asks for news (near-live, without a socket)
const POLL_MS = 30_000;

/**
 * The badge number, asked for every half minute while the tab is open (and on returning to it).
 * When it goes up, the lists are fetched again so new messages show.
 */
export const useUnreadCount = () => {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: countKey,
    queryFn: notificationsApi.unreadCount,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
  });

  const unread = query.data?.unread;
  const last = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (unread !== undefined && last.current !== undefined && unread > last.current) {
      queryClient.invalidateQueries({ queryKey: [...notificationsKey, "list"] });
    }
    last.current = unread;
  }, [unread, queryClient]);

  return unread ?? 0;
};

export const useNotifications = (query: NotificationQuery, enabled = true) =>
  useQuery({
    queryKey: [...notificationsKey, "list", query],
    queryFn: () => notificationsApi.list(query),
    placeholderData: keepPreviousData,
    enabled,
  });

const useInboxMutation = <TArgs>(mutationFn: (args: TArgs) => Promise<{ unread: number }>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: ({ unread }) => {
      // the badge changes at once; the lists catch up
      queryClient.setQueryData(countKey, { unread });
      queryClient.invalidateQueries({ queryKey: [...notificationsKey, "list"] });
    },
  });
};

export const useMarkNotificationRead = () => useInboxMutation(notificationsApi.markRead);
export const useMarkAllNotificationsRead = () => useInboxMutation(() => notificationsApi.markAllRead());
