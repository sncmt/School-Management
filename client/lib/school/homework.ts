"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import type { ListMeta, NoticeAttachment } from "./noticeKinds";

// Mirrors server/src/app/modules/homework. Days are "YYYY-MM-DD" (Bangladesh calendar days).

export const CHECK_STATUSES = ["DONE", "LATE", "NOT_DONE", "EXCUSED"] as const;
export type CheckStatus = (typeof CHECK_STATUSES)[number];

type Named = { id: string; nameEn: string | null; nameBn: string | null };
export type HomeworkSubject = Named & { code: string | null };
export type HomeworkSection = { id: string; name: string; isDefault: boolean };

/** What the person may give homework for this year: each class subject with its sections. */
export type HomeworkOption = {
  classSubjectId: string;
  class: { id: string; name: string };
  subject: HomeworkSubject;
  group: Named | null;
  sections: HomeworkSection[];
};
export type HomeworkOptions = { academicYear: { id: string; name: string } | null; subjects: HomeworkOption[] };

export type HomeworkRow = {
  id: string;
  title: string;
  assignedOn: string;
  dueDate: string;
  fullMarks: number | null;
  classSubjectId: string;
  class: { id: string; name: string; numericLevel: number };
  classSubject: { id: string; type: string; groupId: string | null; group: Named | null; subject: HomeworkSubject };
  sections: HomeworkSection[];
  author: string | null;
  attachmentCount: number;
  checked: { done: number; late: number; notDone: number; excused: number };
  // may edit, tick and delete it
  canManage: boolean;
};
export type HomeworkList = { items: HomeworkRow[]; meta: ListMeta };

export type HomeworkCheck = { status: CheckStatus; marks: number | null; comment: string | null };

export type SheetStudent = {
  enrollmentId: string;
  rollNumber: string | null;
  section: HomeworkSection;
  student: { id: string; nameEn: string; nameBn: string; photo: string | null };
  check: (HomeworkCheck & { checkedAt: string }) | null;
};

export type HomeworkDetail = Omit<HomeworkRow, "checked"> & {
  instructions: string;
  academicYear: { id: string; name: string; isCurrent: boolean };
  createdAt: string;
  updatedAt: string;
  attachments: NoticeAttachment[];
  students: SheetStudent[];
};

export type HomeworkBody = {
  classSubjectId: string;
  sectionIds: string[];
  title: string;
  instructions: string;
  assignedOn: string;
  dueDate: string;
  fullMarks: number | null;
};

export type CheckBody = { enrollmentId: string; status: CheckStatus | null; marks: number | null; comment: string | null };

export type FamilyHomeworkItem = {
  id: string;
  title: string;
  instructions: string;
  assignedOn: string;
  dueDate: string;
  fullMarks: number | null;
  subject: HomeworkSubject;
  attachments: NoticeAttachment[];
  // null: not ticked yet
  check: HomeworkCheck | null;
};

export type HomeworkListQuery = {
  page?: number;
  limit?: number;
  classId?: string;
  sectionId?: string;
  classSubjectId?: string;
  from?: string;
  to?: string;
  mine?: boolean;
  // by due date: the latest first (default) or the soonest first
  order?: "asc" | "desc";
};

export const homeworkApi = {
  options: async () => (await httpClient.get<ApiResponse<HomeworkOptions>>("/homework/options")).data.data,
  list: async (params: HomeworkListQuery) => (await httpClient.get<ApiResponse<HomeworkList>>("/homework", { params })).data.data,
  get: async (homeworkId: string) => (await httpClient.get<ApiResponse<HomeworkDetail>>(`/homework/${homeworkId}`)).data.data,
  create: async (body: HomeworkBody) => (await httpClient.post<ApiResponse<HomeworkDetail>>("/homework", body)).data.data,
  update: async ({ homeworkId, body }: { homeworkId: string; body: Partial<Omit<HomeworkBody, "classSubjectId">> }) =>
    (await httpClient.patch<ApiResponse<HomeworkDetail>>(`/homework/${homeworkId}`, body)).data.data,
  remove: async (homeworkId: string) => {
    await httpClient.delete(`/homework/${homeworkId}`);
  },
  saveChecks: async ({ homeworkId, checks }: { homeworkId: string; checks: CheckBody[] }) =>
    (await httpClient.put<ApiResponse<HomeworkDetail>>(`/homework/${homeworkId}/checks`, { checks })).data.data,
  // one file in the "file" field; the multipart header stops axios sending JSON
  attach: async ({ homeworkId, file }: { homeworkId: string; file: File }) => {
    const body = new FormData();
    body.append("file", file);
    return (
      await httpClient.post<ApiResponse<HomeworkDetail>>(`/homework/${homeworkId}/attachments`, body, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    ).data.data;
  },
  detach: async ({ homeworkId, attachmentId }: { homeworkId: string; attachmentId: string }) =>
    (await httpClient.delete<ApiResponse<HomeworkDetail>>(`/homework/${homeworkId}/attachments/${attachmentId}`)).data.data,

  family: async (params: { studentId: string; page?: number; limit?: number }) =>
    (await httpClient.get<ApiResponse<{ items: FamilyHomeworkItem[]; meta: ListMeta }>>("/family/homework", { params })).data.data,
};

export const homeworkKey = ["school", "homework"] as const;

export const useHomeworkOptions = (enabled = true) =>
  useQuery({ queryKey: [...homeworkKey, "options"], queryFn: homeworkApi.options, enabled, staleTime: 5 * 60_000 });

export const useHomeworkList = (query: HomeworkListQuery, enabled = true) =>
  useQuery({ queryKey: [...homeworkKey, "list", query], queryFn: () => homeworkApi.list(query), placeholderData: keepPreviousData, enabled });

export const useHomework = (homeworkId: string | null) =>
  useQuery({ queryKey: [...homeworkKey, "one", homeworkId], queryFn: () => homeworkApi.get(homeworkId!), enabled: !!homeworkId });

export const useFamilyHomework = (studentId: string | undefined, page: number) =>
  useQuery({
    queryKey: [...homeworkKey, "family", studentId, page],
    queryFn: () => homeworkApi.family({ studentId: studentId!, page, limit: 15 }),
    enabled: !!studentId,
    placeholderData: keepPreviousData,
  });

const useHomeworkMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: homeworkKey }),
  });
};

export const useCreateHomework = () => useHomeworkMutation(homeworkApi.create);
export const useUpdateHomework = () => useHomeworkMutation(homeworkApi.update);
export const useDeleteHomework = () => useHomeworkMutation(homeworkApi.remove);
export const useSaveHomeworkChecks = () => useHomeworkMutation(homeworkApi.saveChecks);
export const useDetachHomeworkFile = () => useHomeworkMutation(homeworkApi.detach);

/** Today in Bangladesh, "YYYY-MM-DD". */
export const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(new Date());

/** Whole days from today to a day key: 0 today, 1 tomorrow, -1 yesterday. */
export const daysFromToday = (day: string) =>
  Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${todayKey()}T00:00:00Z`)) / 86_400_000);
