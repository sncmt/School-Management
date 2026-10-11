"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";

export type AcademicYear = {
  id: string;
  name: string;
  // calendar dates; the server sends them as midnight UTC ("2027-01-01T00:00:00.000Z")
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  _count: { enrollments: number; exams: number };
};

export type CreateAcademicYearResult = AcademicYear & {
  carriedOverSections: number;
  carriedOverSubjects: number;
  carriedOverSubjectTeachers: number;
  carriedOverResultSettings: number;
  carriedOverRoutine: number;
};

export type AcademicYearBody = { name: string; startDate: string; endDate: string }; // dates YYYY-MM-DD

export const academicYearsApi = {
  // newest first
  list: async () => (await httpClient.get<ApiResponse<AcademicYear[]>>("/academic-year")).data.data,

  create: async (body: AcademicYearBody & { isCurrent: boolean }) =>
    (await httpClient.post<ApiResponse<CreateAcademicYearResult>>("/academic-year/create", body)).data.data,

  update: async ({ yearId, body }: { yearId: string; body: Partial<AcademicYearBody> }) =>
    (await httpClient.patch<ApiResponse<AcademicYear>>(`/academic-year/${yearId}`, body)).data.data,

  makeCurrent: async (yearId: string) =>
    (await httpClient.patch<ApiResponse<AcademicYear>>(`/academic-year/${yearId}/current`)).data.data,
};

const yearsKey = ["school", "academic-years"] as const;

export const useAcademicYears = () => useQuery({ queryKey: yearsKey, queryFn: academicYearsApi.list });

const useYearMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    // other pages show counts "in the current year": refresh everything of this school
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["school"] }),
  });
};

export const useCreateAcademicYear = () => useYearMutation(academicYearsApi.create);
export const useUpdateAcademicYear = () => useYearMutation(academicYearsApi.update);
export const useMakeAcademicYearCurrent = () => useYearMutation(academicYearsApi.makeCurrent);
