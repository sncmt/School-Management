"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";

/*
 * Subjects, for both lists:
 *   PLATFORM  the shared NCTB list, kept by the platform admin  (/platform/subject)
 *   SCHOOL    a school's view: the NCTB list (read-only) plus its own subjects  (/subject)
 */
export type SubjectScope = "PLATFORM" | "SCHOOL";

// ------------------------------------------------------------------- types

export const RELIGIONS = ["ISLAM", "HINDUISM", "CHRISTIANITY", "BUDDHISM", "OTHER"] as const;
export type Religion = (typeof RELIGIONS)[number];

// a school's own subject may have no name in its non-school language (NCTB subjects have both)
type SubjectBrief = {
  id: string;
  nameEn: string | null;
  nameBn: string | null;
  code: string | null;
  religion: Religion | null;
  schoolId: string | null;
};

export type Subject = SubjectBrief & {
  parentId: string | null;
  parent: SubjectBrief | null;
  papers: SubjectBrief[];
  // PLATFORM = from the NCTB list (a school can't change it), SCHOOL = the school's own
  source: "PLATFORM" | "SCHOOL";
};

/** Main subject, a paper of one, or a religion subject (never both of the last two). */
export type SubjectKind = "main" | "paper" | "religion";

export const subjectKind = (subject: Pick<Subject, "parentId" | "religion">): SubjectKind =>
  subject.parentId ? "paper" : subject.religion ? "religion" : "main";

export type SubjectBody = {
  nameEn: string | null;
  nameBn: string | null;
  code: string | null;
  parentId: string | null;
  religion: Religion | null;
};

// --------------------------------------------------------------------- api

const BASE: Record<SubjectScope, string> = { PLATFORM: "/platform/subject", SCHOOL: "/subject" };

export const subjectsApi = (scope: SubjectScope) => ({
  list: async (search?: string) =>
    (await httpClient.get<ApiResponse<Subject[]>>(BASE[scope], { params: { search: search || undefined } })).data
      .data,

  // create treats a missing field as "not given" (null isn't accepted there); update treats null as "clear"
  create: async (body: SubjectBody) =>
    (
      await httpClient.post<ApiResponse<Subject>>(BASE[scope], {
        nameEn: body.nameEn ?? undefined,
        nameBn: body.nameBn ?? undefined,
        code: body.code ?? undefined,
        parentId: body.parentId ?? undefined,
        religion: body.religion ?? undefined,
      })
    ).data.data,

  update: async ({ subjectId, body }: { subjectId: string; body: SubjectBody }) =>
    (await httpClient.patch<ApiResponse<Subject>>(`${BASE[scope]}/${subjectId}`, body)).data.data,

  remove: async (subjectId: string) => {
    await httpClient.delete(`${BASE[scope]}/${subjectId}`);
  },
});

// ------------------------------------------------------------------- hooks

const subjectsKey = (scope: SubjectScope) =>
  scope === "PLATFORM" ? (["platform", "subjects"] as const) : (["school", "subjects"] as const);

export const useSubjects = (scope: SubjectScope, search = "") =>
  useQuery({
    queryKey: [...subjectsKey(scope), { search }],
    queryFn: () => subjectsApi(scope).list(search),
    placeholderData: keepPreviousData,
  });

const useSubjectMutation = <TArgs, TResult>(scope: SubjectScope, mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: subjectsKey(scope) }),
  });
};

export const useCreateSubject = (scope: SubjectScope) => useSubjectMutation(scope, subjectsApi(scope).create);
export const useUpdateSubject = (scope: SubjectScope) => useSubjectMutation(scope, subjectsApi(scope).update);
export const useDeleteSubject = (scope: SubjectScope) => useSubjectMutation(scope, subjectsApi(scope).remove);
