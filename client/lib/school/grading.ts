"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";

// Mirrors server/src/app/modules/grading. Prisma Decimals arrive as strings ("5", "3.5").

export type MarkBand = { minPercent: string; grade: string; point: string };
export type GpaBand = { minGpa: string; grade: string };

export type GradingScale = {
  id: string;
  name: string;
  description: string | null;
  maxGpa: string;
  failGrade: string;
  failIfAnyCompulsoryFails: boolean;
  optionalBonusEnabled: boolean;
  optionalBonusThreshold: string;
  // used by a published result: it can't change any more, only be copied
  isLocked: boolean;
  markBands: MarkBand[]; // highest first
  gpaBands: GpaBand[];
  _count: { classSettings: number; classSubjects: number };
};

export type ScaleBody = {
  name: string;
  description?: string;
  maxGpa: number;
  failGrade: string;
  failIfAnyCompulsoryFails: boolean;
  optionalBonusEnabled: boolean;
  optionalBonusThreshold: number;
  markBands: { minPercent: number; grade: string; point: number }[];
  gpaBands: { minGpa: number; grade: string }[];
};

export type ResultSystem = "GRADED" | "MARKS_ONLY";
// FAIL: absent = 0 and failed; EXCLUDE: the subject is left out of the total and GPA
export type AbsentRule = "FAIL" | "EXCLUDE";

export type ClassResultSetting = {
  id: string;
  resultSystem: ResultSystem;
  gradingScaleId: string | null;
  gradingScale: { id: string; name: string; maxGpa: string; isLocked: boolean } | null;
  // 1st + 2nd paper graded together as one subject
  combinePapers: boolean;
  absentRule: AbsentRule;
};

export type ClassSettings = {
  academicYear: { id: string; name: string };
  items: { class: { id: string; name: string; numericLevel: number }; setting: ClassResultSetting | null }[];
};

export type ClassSettingBody = {
  academicYearId?: string;
  classId: string;
  resultSystem: ResultSystem;
  gradingScaleId?: string;
  combinePapers: boolean;
  absentRule: AbsentRule;
};

export const gradingApi = {
  scales: async () => (await httpClient.get<ApiResponse<GradingScale[]>>("/grading/scales")).data.data,

  createScale: async (body: ScaleBody) =>
    (await httpClient.post<ApiResponse<GradingScale>>("/grading/scales", body)).data.data,

  // replaces the whole scale; refused for a locked one
  updateScale: async ({ scaleId, body }: { scaleId: string; body: ScaleBody }) =>
    (await httpClient.put<ApiResponse<GradingScale>>(`/grading/scales/${scaleId}`, body)).data.data,

  // how a locked scale is changed: copy it, edit the copy
  copyScale: async ({ scaleId, name }: { scaleId: string; name: string }) =>
    (await httpClient.post<ApiResponse<GradingScale>>(`/grading/scales/${scaleId}/copy`, { name })).data.data,

  deleteScale: async (scaleId: string) => {
    await httpClient.delete(`/grading/scales/${scaleId}`);
  },

  classSettings: async (academicYearId?: string) =>
    (await httpClient.get<ApiResponse<ClassSettings>>("/grading/class-settings", { params: { academicYearId } })).data
      .data,

  setClassSetting: async (body: ClassSettingBody) =>
    (await httpClient.put<ApiResponse<ClassResultSetting>>("/grading/class-settings", body)).data.data,
};

const gradingKey = ["school", "grading"] as const;

export const useGradingScaleList = () => useQuery({ queryKey: [...gradingKey, "scales"], queryFn: gradingApi.scales });

export const useClassResultSettings = (academicYearId: string | undefined) =>
  useQuery({
    queryKey: [...gradingKey, "class-settings", academicYearId],
    queryFn: () => gradingApi.classSettings(academicYearId),
  });

const useGradingMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gradingKey });
      // the scale picker in a class subject's marks setup
      queryClient.invalidateQueries({ queryKey: ["school", "pickers", "grading-scales"] });
    },
  });
};

export const useCreateGradingScale = () => useGradingMutation(gradingApi.createScale);
export const useUpdateGradingScale = () => useGradingMutation(gradingApi.updateScale);
export const useCopyGradingScale = () => useGradingMutation(gradingApi.copyScale);
export const useDeleteGradingScale = () => useGradingMutation(gradingApi.deleteScale);
export const useSetClassResultSetting = () => useGradingMutation(gradingApi.setClassSetting);

/** Bangladesh's usual GPA 5 scale (SSC/HSC), the starting point for a new scale. */
export const STANDARD_GPA5: Omit<ScaleBody, "name"> = {
  description: "",
  maxGpa: 5,
  failGrade: "F",
  failIfAnyCompulsoryFails: true,
  optionalBonusEnabled: true,
  optionalBonusThreshold: 2,
  markBands: [
    { minPercent: 80, grade: "A+", point: 5 },
    { minPercent: 70, grade: "A", point: 4 },
    { minPercent: 60, grade: "A-", point: 3.5 },
    { minPercent: 50, grade: "B", point: 3 },
    { minPercent: 40, grade: "C", point: 2 },
    { minPercent: 33, grade: "D", point: 1 },
    { minPercent: 0, grade: "F", point: 0 },
  ],
  gpaBands: [
    { minGpa: 5, grade: "A+" },
    { minGpa: 4, grade: "A" },
    { minGpa: 3.5, grade: "A-" },
    { minGpa: 3, grade: "B" },
    { minGpa: 2, grade: "C" },
    { minGpa: 1, grade: "D" },
    { minGpa: 0, grade: "F" },
  ],
};
