"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import type { AcademicTrack } from "@/lib/school/academicYears";

export type SectionBrief = {
  id: string;
  name: string;
  // the section a class gets automatically; its name is never shown
  isDefault: boolean;
};

export type SchoolClass = {
  id: string;
  name: string;
  numericLevel: number;
  // school or college: the class is taught only in years of its track
  track: AcademicTrack;
  sections: SectionBrief[];
  // active students in the listed year; null when the school has no current year
  activeStudents: number | null;
};

export type ClassList = {
  // the main track's current year (or the asked track's)
  academicYear: { id: string; name: string; track: AcademicTrack } | null;
  // the current year of each track; each class's count is in its own track's year
  currentYears: { id: string; name: string; track: AcademicTrack }[];
  items: SchoolClass[];
};

// track: only for an institution with school and college
export type ClassBody = { name: string; numericLevel: number; track?: AcademicTrack };

/** The classes of one track (all when no track is given). */
export const classesOfTrack = <C extends { track: AcademicTrack }>(classes: C[] | undefined, track?: AcademicTrack | null) =>
  (classes ?? []).filter((c) => !track || c.track === track);

export const classesApi = {
  // by level; student counts are for the current year
  list: async () => (await httpClient.get<ApiResponse<ClassList>>("/class")).data.data,

  create: async (body: ClassBody) =>
    (await httpClient.post<ApiResponse<SchoolClass>>("/class/create", body)).data.data,

  update: async ({ classId, body }: { classId: string; body: Partial<ClassBody> }) =>
    (await httpClient.patch<ApiResponse<SchoolClass>>(`/class/${classId}`, body)).data.data,

  // with everything set up for it and done in it; its students stay, unplaced (super admin)
  remove: async ({ classId, reason }: { classId: string; reason?: string }) => {
    await httpClient.delete(`/class/${classId}`, { params: { reason } });
  },
};

const classesKey = ["school", "classes"] as const;

export const useClasses = () => useQuery({ queryKey: classesKey, queryFn: classesApi.list });

const useClassMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: classesKey }),
  });
};

export const useCreateClass = () => useClassMutation(classesApi.create);
export const useUpdateClass = () => useClassMutation(classesApi.update);
export const useDeleteClass = () => useClassMutation(classesApi.remove);
