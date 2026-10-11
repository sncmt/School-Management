"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import type { Religion } from "@/lib/subjects";

export type ClassSubjectType = "COMPULSORY" | "OPTIONAL";

type NameBrief = { id: string; nameEn: string | null; nameBn: string | null };

export type ClassSubject = {
  id: string;
  classId: string;
  subjectId: string;
  // null = the whole class
  groupId: string | null;
  type: ClassSubjectType;
  sortOrder: number;
  // the marks setup; Prisma Decimals arrive as strings ("100", "33.5"), null = not set yet
  fullMarks: string | null;
  passMarks: string | null;
  class: { id: string; name: string; numericLevel: number };
  group: NameBrief | null;
  subject: NameBrief & {
    code: string | null;
    religion: Religion | null;
    schoolId: string | null;
    parent: (NameBrief & { code: string | null }) | null;
  };
  parts: { id: string; name: string; fullMarks: string; passMarks: string }[];
  // this subject's own scale; null = the class's scale
  gradingScale: { id: string; name: string } | null;
};

export type ClassSubjectList = {
  academicYear: { id: string; name: string };
  items: ClassSubject[];
};

export type MarksSetupBody = {
  fullMarks: number;
  passMarks: number;
  parts: { name: string; fullMarks: number; passMarks: number }[];
  gradingScaleId: string | null;
};

export const classSubjectsApi = {
  // one class in the current year, in its order
  list: async (classId: string) =>
    (await httpClient.get<ApiResponse<ClassSubjectList>>("/class-subject", { params: { classId } })).data.data,

  assign: async (body: {
    classId: string;
    items: { subjectId: string; groupId?: string; type: ClassSubjectType }[];
  }) => (await httpClient.post<ApiResponse<ClassSubjectList>>("/class-subject", body)).data.data,

  // the class's whole order at once
  reorder: async (body: { classId: string; classSubjectIds: string[] }) =>
    (await httpClient.put<ApiResponse<ClassSubjectList>>("/class-subject/reorder", body)).data.data,

  setType: async ({ classSubjectId, type }: { classSubjectId: string; type: ClassSubjectType }) =>
    (await httpClient.patch<ApiResponse<ClassSubject>>(`/class-subject/${classSubjectId}`, { type })).data.data,

  setMarks: async ({ classSubjectId, body }: { classSubjectId: string; body: MarksSetupBody }) =>
    (await httpClient.put<ApiResponse<ClassSubject>>(`/class-subject/${classSubjectId}/marks`, body)).data.data,

  remove: async (classSubjectId: string) => {
    await httpClient.delete(`/class-subject/${classSubjectId}`);
  },
};

const classSubjectsKey = ["school", "class-subjects"] as const;

export const useClassSubjects = (classId: string | null) =>
  useQuery({
    queryKey: [...classSubjectsKey, classId],
    queryFn: () => classSubjectsApi.list(classId!),
    enabled: !!classId,
  });

const useClassSubjectMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: classSubjectsKey });
      // groups show how many subjects each has
      queryClient.invalidateQueries({ queryKey: ["school", "groups"] });
    },
  });
};

export const useAssignClassSubjects = () => useClassSubjectMutation(classSubjectsApi.assign);
export const useSetClassSubjectType = () => useClassSubjectMutation(classSubjectsApi.setType);
export const useSetClassSubjectMarks = () => useClassSubjectMutation(classSubjectsApi.setMarks);
export const useRemoveClassSubject = () => useClassSubjectMutation(classSubjectsApi.remove);

/*
 * Reorder updates the cached list right away, so a dropped row stays where it was
 * dropped while the server saves; on failure the list is reloaded from the server.
 */
export const useReorderClassSubjects = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: classSubjectsApi.reorder,
    onMutate: async ({ classId, classSubjectIds }) => {
      const key = [...classSubjectsKey, classId];
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData<ClassSubjectList>(key, (old) => {
        if (!old) return old;
        const byId = new Map(old.items.map((item) => [item.id, item]));
        return { ...old, items: classSubjectIds.map((id) => byId.get(id)!).filter(Boolean) };
      });
    },
    onSettled: (_data, _error, { classId }) =>
      queryClient.invalidateQueries({ queryKey: [...classSubjectsKey, classId] }),
  });
};

/** The school's grading scales, for a subject's own scale. Needs grading:view. */
export const useGradingScales = (enabled = true) =>
  useQuery({
    queryKey: ["school", "pickers", "grading-scales"],
    queryFn: async () =>
      (await httpClient.get<ApiResponse<{ id: string; name: string }[]>>("/grading/scales")).data.data,
    enabled,
  });
