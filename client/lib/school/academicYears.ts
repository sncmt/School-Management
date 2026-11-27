"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";

/*
 * School or college. An institution with both (institutionType SCHOOL_AND_COLLEGE) runs two
 * lines of years side by side, each with its own current year; every class belongs to one.
 */
export type AcademicTrack = "SCHOOL" | "COLLEGE";
export type InstitutionType = "SCHOOL" | "COLLEGE" | "SCHOOL_AND_COLLEGE";
export const ACADEMIC_TRACKS: AcademicTrack[] = ["SCHOOL", "COLLEGE"];

/** The tracks an institution of this type has, the main one first. */
export const tracksOf = (type: InstitutionType | undefined): AcademicTrack[] =>
  type === "SCHOOL_AND_COLLEGE" ? ["SCHOOL", "COLLEGE"] : type === "COLLEGE" ? ["COLLEGE"] : ["SCHOOL"];

export type AcademicYear = {
  id: string;
  name: string;
  track: AcademicTrack;
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

/** The years of one track (all of them when no track is given). */
export const yearsOfTrack = <Y extends { track: AcademicTrack }>(years: Y[] | undefined, track?: AcademicTrack | null) =>
  (years ?? []).filter((y) => !track || y.track === track);

/** The current year of a track (of the first track that has one when none is given). */
export const currentYearOf = <Y extends { track: AcademicTrack; isCurrent: boolean }>(years: Y[] | undefined, track?: AcademicTrack | null) =>
  (years ?? []).find((y) => y.isCurrent && (!track || y.track === track)) ??
  (track ? undefined : (years ?? []).find((y) => y.isCurrent));

export const academicYearsApi = {
  // newest first
  list: async () => (await httpClient.get<ApiResponse<AcademicYear[]>>("/academic-year")).data.data,

  // track: only for an institution with school and college (the others get their one track)
  create: async (body: AcademicYearBody & { isCurrent: boolean; track?: AcademicTrack }) =>
    (await httpClient.post<ApiResponse<CreateAcademicYearResult>>("/academic-year/create", body)).data.data,

  update: async ({ yearId, body }: { yearId: string; body: Partial<AcademicYearBody> }) =>
    (await httpClient.patch<ApiResponse<AcademicYear>>(`/academic-year/${yearId}`, body)).data.data,

  makeCurrent: async (yearId: string) =>
    (await httpClient.patch<ApiResponse<AcademicYear>>(`/academic-year/${yearId}/current`)).data.data,

  // a year made by mistake: never the current one, nothing enrolled or done in it
  remove: async ({ yearId, reason }: { yearId: string; reason?: string }) => {
    await httpClient.delete(`/academic-year/${yearId}`, { params: { reason } });
  },
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
export const useDeleteAcademicYear = () => useYearMutation(academicYearsApi.remove);
