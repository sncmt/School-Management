"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";

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
  sections: SectionBrief[];
  // active students in the listed year; null when the school has no current year
  activeStudents: number | null;
};

export type ClassList = {
  academicYear: { id: string; name: string } | null;
  items: SchoolClass[];
};

export type ClassBody = { name: string; numericLevel: number };

export const classesApi = {
  // by level; student counts are for the current year
  list: async () => (await httpClient.get<ApiResponse<ClassList>>("/class")).data.data,

  create: async (body: ClassBody) =>
    (await httpClient.post<ApiResponse<SchoolClass>>("/class/create", body)).data.data,

  update: async ({ classId, body }: { classId: string; body: Partial<ClassBody> }) =>
    (await httpClient.patch<ApiResponse<SchoolClass>>(`/class/${classId}`, body)).data.data,

  remove: async (classId: string) => {
    await httpClient.delete(`/class/${classId}`);
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
