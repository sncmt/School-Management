"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import type { AcademicTrack } from "@/lib/school/academicYears";

// Mirrors server/src/app/modules/rollNumber: a class's (or one section's) roll numbers for a year.

export type RollRow = {
  enrollmentId: string;
  rollNumber: string | null;
  section: { id: string; name: string; isDefault: boolean };
  group: { id: string; nameEn: string | null; nameBn: string | null } | null;
  student: { id: string; nameEn: string; nameBn: string; admissionNo: string; gender: "MALE" | "FEMALE" | "OTHER" };
};

export type RollSheet = {
  academicYear: { id: string; name: string; track: AcademicTrack };
  class: { id: string; name: string; sections: { id: string; name: string; isDefault: boolean }[] };
  section: { id: string; name: string; isDefault: boolean } | null;
  // active students, by section and roll
  items: RollRow[];
};

export type RollsQuery = { academicYearId?: string; classId: string; sectionId?: string };

export type SaveRollsBody = RollsQuery & { items: { enrollmentId: string; rollNumber: string | null }[] };

export const rollNumbersApi = {
  get: async (query: RollsQuery) =>
    (await httpClient.get<ApiResponse<RollSheet>>("/roll-numbers", { params: query })).data.data,

  // all or nothing; every roll unique in its section afterwards
  save: async (body: SaveRollsBody) =>
    (await httpClient.put<ApiResponse<{ updated: number }>>("/roll-numbers", body)).data.data,
};

const rollsKey = ["school", "roll-numbers"] as const;

export const useRollSheet = (query: RollsQuery | null) =>
  useQuery({
    queryKey: [...rollsKey, query],
    queryFn: () => rollNumbersApi.get(query!),
    enabled: !!query,
  });

export const useSaveRolls = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rollNumbersApi.save,
    // rolls show on student lists, attendance, marks sheets and cards
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["school"] }),
  });
};
