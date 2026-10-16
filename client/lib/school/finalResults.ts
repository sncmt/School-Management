"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import type { ExamType } from "./exams";
import type { ResultCards, ResultSummary } from "./results";

// Mirrors server/src/app/modules/exam/finalResult.*. A final result weighs several exams of a
// class together (Half-yearly 30% + Annual 70%). Prisma Decimals arrive as strings.

type NameRef = { id: string; nameEn: string | null; nameBn: string | null };

export type FinalMethod = "AVERAGE" | "BEST";

export type FinalComponent = {
  id: string;
  nameEn: string | null;
  nameBn: string | null;
  weight: string;
  method: FinalMethod;
  // BEST: how many of the best exams count
  bestCount: number | null;
  sortOrder: number;
  exams: { exam: NameRef & { type: ExamType } }[];
};

export type FinalFormula = {
  id: string;
  academicYearId: string;
  classId: string;
  nameEn: string | null;
  nameBn: string | null;
  status: "DRAFT" | "PUBLISHED";
  attendanceFrom: string | null;
  attendanceTo: string | null;
  publishedAt: string | null;
  academicYear: { id: string; name: string };
  class: { id: string; name: string; numericLevel: number };
  components: FinalComponent[];
};

export type FinalFormulaList = { academicYear: { id: string; name: string }; items: FinalFormula[] };

export type FormulaBody = {
  nameEn: string | null;
  nameBn: string | null;
  attendanceFrom?: string;
  attendanceTo?: string;
  components: {
    nameEn: string | null;
    nameBn: string | null;
    weight: number;
    method: FinalMethod;
    bestCount?: number;
    examIds: string[];
  }[];
};

export type FinalPublishOutcome = { published: number; passed: number; failed: number; passRate: number };

/* A subject's share from one component: its percentage, and the exams behind it. */
export type ComponentLine = {
  componentId: string;
  nameEn: string | null;
  nameBn: string | null;
  weight: number;
  percentage: number | null; // null = no exam of this component has the subject
  exams: { examId: string; percentage: number; used: boolean }[];
};

export type FinalSubjectLine = {
  subjectId: string;
  nameEn: string | null;
  nameBn: string | null;
  code: string | null;
  isOptional: boolean;
  excluded: boolean;
  percentage: string;
  passPercentage: string;
  fullMarks: string;
  marks: string | null;
  passed: boolean;
  grade: string | null;
  point: string | null;
  components: ComponentLine[];
  sortOrder: number;
};

export type FinalTabulation = {
  formula: NameRef;
  academicYear: { id: string; name: string };
  class: { id: string; name: string };
  publishedAt: string | null;
  subjects: { subjectId: string; nameEn: string | null; nameBn: string | null; code: string | null; isOptional: boolean; sortOrder: number }[];
  summary: ResultSummary;
  students: {
    enrollmentId: string;
    student: { id: string; nameEn: string; nameBn: string; admissionNo: string };
    rollNumber: string | null;
    section: { id: string; name: string; isDefault: boolean };
    group: NameRef | null;
    totalMarks: string;
    fullMarks: string;
    percentage: string;
    gpa: string | null;
    grade: string | null;
    passed: boolean;
    failedSubjects: number;
    sectionPosition: number;
    classPosition: number;
    attendancePercent: number | null;
    subjects: Record<string, FinalSubjectLine>;
  }[];
};

// --------------------------------------------------------------------- api

type CardsQuery = { sectionId?: string; enrollmentId?: string };
type TabulationQuery = { sectionId?: string; sort: "roll" | "merit" };

export const finalResultsApi = {
  list: async (query: { academicYearId?: string; classId?: string } = {}) =>
    (await httpClient.get<ApiResponse<FinalFormulaList>>("/final-results", { params: query })).data.data,

  create: async (body: FormulaBody & { classId: string; academicYearId?: string }) =>
    (await httpClient.post<ApiResponse<FinalFormula>>("/final-results", body)).data.data,

  update: async ({ formulaId, body }: { formulaId: string; body: FormulaBody }) =>
    (await httpClient.put<ApiResponse<FinalFormula>>(`/final-results/${formulaId}`, body)).data.data,

  remove: async (formulaId: string) => (await httpClient.delete<ApiResponse<null>>(`/final-results/${formulaId}`)).data.data,

  publish: async (formulaId: string) =>
    (await httpClient.post<ApiResponse<FinalPublishOutcome>>(`/final-results/${formulaId}/publish`)).data.data,

  unlock: async (formulaId: string) => (await httpClient.post<ApiResponse<unknown>>(`/final-results/${formulaId}/unlock`)).data.data,

  tabulation: async (formulaId: string, query: TabulationQuery) =>
    (await httpClient.get<ApiResponse<FinalTabulation>>(`/final-results/${formulaId}/tabulation`, { params: query })).data.data,

  cards: async (formulaId: string, query: CardsQuery) =>
    (await httpClient.get<ApiResponse<ResultCards>>(`/final-results/${formulaId}/cards`, { params: query })).data.data,
};

// ------------------------------------------------------------------- hooks

const finalKey = ["school", "final-results"] as const;

export const useFinalFormulas = () => useQuery({ queryKey: [...finalKey, "list"], queryFn: () => finalResultsApi.list() });

export const useFinalTabulation = (formulaId: string, query: TabulationQuery) =>
  useQuery({
    queryKey: [...finalKey, "tabulation", formulaId, query],
    queryFn: () => finalResultsApi.tabulation(formulaId, query),
    placeholderData: keepPreviousData,
  });

export const useFinalCards = (formulaId: string | undefined, query: CardsQuery | null) =>
  useQuery({
    queryKey: [...finalKey, "cards", formulaId, query],
    queryFn: () => finalResultsApi.cards(formulaId!, query!),
    enabled: !!formulaId && !!query,
  });

const useFinalMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: finalKey });
      // publishing locks the grading scales
      queryClient.invalidateQueries({ queryKey: ["school", "grading"] });
    },
  });
};

export const useCreateFormula = () => useFinalMutation(finalResultsApi.create);
export const useUpdateFormula = () => useFinalMutation(finalResultsApi.update);
export const useDeleteFormula = () => useFinalMutation(finalResultsApi.remove);
export const usePublishFinal = () => useFinalMutation(finalResultsApi.publish);
export const useUnlockFinal = () => useFinalMutation(finalResultsApi.unlock);
