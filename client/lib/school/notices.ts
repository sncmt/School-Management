"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";

import type { ListMeta, NoticeAttachment, NoticeAudience, NoticeCategory, NoticeState } from "./noticeKinds";

// Mirrors server/src/app/modules/notice. Dates arrive as ISO strings.

export { NOTICE_AUDIENCES, NOTICE_CATEGORIES, NOTICE_STATES } from "./noticeKinds";
export type { ListMeta, NoticeAttachment, NoticeAudience, NoticeCategory, NoticeState } from "./noticeKinds";

export type NoticeTarget = {
  class: { id: string; name: string };
  // null: the whole class
  section: { id: string; name: string; isDefault: boolean } | null;
};

export type BoardNotice = {
  id: string;
  title: string;
  body: string;
  category: NoticeCategory;
  audience: NoticeAudience;
  pinned: boolean;
  isPublic: boolean;
  publishAt: string;
  expiresAt: string | null;
  read: boolean;
  attachments: NoticeAttachment[];
};

export type NoticeBoard = { items: BoardNotice[]; unread: number; meta: ListMeta };

export type NoticeRow = {
  id: string;
  title: string;
  category: NoticeCategory;
  audience: NoticeAudience;
  isPublic: boolean;
  pinned: boolean;
  status: "DRAFT" | "PUBLISHED";
  state: NoticeState;
  publishAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  // the user who wrote it (a writer may delete their own drafts)
  authorId: string | null;
  author: string | null;
  targets: NoticeTarget[];
  attachmentCount: number;
  readCount: number;
};

export type NoticeList = { items: NoticeRow[]; meta: ListMeta };

export type NoticeDetail = Omit<NoticeRow, "attachmentCount"> & {
  body: string;
  publishedAt: string | null;
  updatedAt: string;
  publisher: string | null;
  attachments: NoticeAttachment[];
};

export type NoticeBody = {
  title: string;
  body: string;
  category: NoticeCategory;
  audience: NoticeAudience;
  targets: { classId: string; sectionId?: string }[];
  isPublic: boolean;
  pinned: boolean;
  publishAt: string | null;
  expiresAt: string | null;
};

export type BoardQuery = { page?: number; limit?: number; category?: NoticeCategory };
export type NoticeListQuery = { page?: number; limit?: number; state?: NoticeState; category?: NoticeCategory; audience?: NoticeAudience; search?: string };

export const noticesApi = {
  board: async (params: BoardQuery) => (await httpClient.get<ApiResponse<NoticeBoard>>("/notice/board", { params })).data.data,
  markRead: async (noticeId: string) => {
    await httpClient.post(`/notice/${noticeId}/read`);
  },

  list: async (params: NoticeListQuery) => (await httpClient.get<ApiResponse<NoticeList>>("/notice", { params })).data.data,
  get: async (noticeId: string) => (await httpClient.get<ApiResponse<NoticeDetail>>(`/notice/${noticeId}`)).data.data,
  create: async (body: NoticeBody & { publish: boolean }) => (await httpClient.post<ApiResponse<NoticeDetail>>("/notice", body)).data.data,
  update: async ({ noticeId, body }: { noticeId: string; body: Partial<NoticeBody> }) =>
    (await httpClient.patch<ApiResponse<NoticeDetail>>(`/notice/${noticeId}`, body)).data.data,
  publish: async ({ noticeId, publishAt }: { noticeId: string; publishAt?: string | null }) =>
    (await httpClient.post<ApiResponse<NoticeDetail>>(`/notice/${noticeId}/publish`, publishAt ? { publishAt } : {})).data.data,
  unpublish: async (noticeId: string) => (await httpClient.post<ApiResponse<NoticeDetail>>(`/notice/${noticeId}/unpublish`)).data.data,
  remove: async (noticeId: string) => {
    await httpClient.delete(`/notice/${noticeId}`);
  },

  // one file in the "file" field; the multipart header stops axios sending JSON
  attach: async ({ noticeId, file }: { noticeId: string; file: File }) => {
    const body = new FormData();
    body.append("file", file);
    return (
      await httpClient.post<ApiResponse<NoticeDetail>>(`/notice/${noticeId}/attachments`, body, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ).data.data;
  },
  detach: async ({ noticeId, attachmentId }: { noticeId: string; attachmentId: string }) =>
    (await httpClient.delete<ApiResponse<NoticeDetail>>(`/notice/${noticeId}/attachments/${attachmentId}`)).data.data,
};

const noticesKey = ["school", "notices"] as const;

export const useNoticeBoard = (query: BoardQuery = {}) =>
  useQuery({
    queryKey: [...noticesKey, "board", query],
    queryFn: () => noticesApi.board(query),
    placeholderData: keepPreviousData,
    // new notices show up while the page stays open
    refetchInterval: 5 * 60_000,
  });

export const useNoticeList = (query: NoticeListQuery, enabled = true) =>
  useQuery({
    queryKey: [...noticesKey, "list", query],
    queryFn: () => noticesApi.list(query),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useNotice = (noticeId: string | null) =>
  useQuery({
    queryKey: [...noticesKey, "one", noticeId],
    queryFn: () => noticesApi.get(noticeId!),
    enabled: !!noticeId,
  });

const useNoticeMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noticesKey }),
  });
};

export const useMarkNoticeRead = () => useNoticeMutation(noticesApi.markRead);
export const useCreateNotice = () => useNoticeMutation(noticesApi.create);
export const useUpdateNotice = () => useNoticeMutation(noticesApi.update);
export const usePublishNotice = () => useNoticeMutation(noticesApi.publish);
export const useUnpublishNotice = () => useNoticeMutation(noticesApi.unpublish);
export const useDeleteNotice = () => useNoticeMutation(noticesApi.remove);
export const useAttachNoticeFile = () => useNoticeMutation(noticesApi.attach);
export const useDetachNoticeFile = () => useNoticeMutation(noticesApi.detach);

/** Same limits as the server: PDF or image, 10 MB, 5 per notice. */
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_MAX_COUNT = 5;
export const ATTACHMENT_ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,image/gif";
