"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";

// Mirrors server/src/app/modules/schedule: different hours for some days (Ramadan timing,
// an exam day). For a section on a date, the override with the shortest date range wins;
// inside it a section rule beats a class rule, which beats a whole-school rule.

export type OverrideRule = {
  id: string;
  // both null = the whole school; classId only = that class; sectionId = that section
  classId: string | null;
  sectionId: string | null;
  class: { id: string; name: string; numericLevel: number } | null;
  section: { id: string; name: string; isDefault: boolean } | null;
  startTime: string;
  endTime: string;
  // null = each section keeps its own bell schedule
  periodTemplateId: string | null;
  periodTemplate: { id: string; nameEn: string | null; nameBn: string | null } | null;
};

export type ScheduleOverride = {
  id: string;
  academicYearId: string;
  academicYear: { id: string; name: string };
  name: string;
  fromDate: string;
  toDate: string;
  rules: OverrideRule[];
};

export type OverrideBody = {
  academicYearId: string;
  name: string;
  fromDate: string;
  toDate: string;
  rules: { classId?: string; sectionId?: string; startTime: string; endTime: string; periodTemplateId?: string }[];
};

export const scheduleApi = {
  overrides: async (academicYearId: string) =>
    (await httpClient.get<ApiResponse<ScheduleOverride[]>>("/schedule/overrides", { params: { academicYearId } })).data
      .data,

  createOverride: async (body: OverrideBody) =>
    (await httpClient.post<ApiResponse<ScheduleOverride>>("/schedule/overrides", body)).data.data,

  // replaces the name, the dates and every rule
  updateOverride: async ({ overrideId, body }: { overrideId: string; body: OverrideBody }) =>
    (await httpClient.put<ApiResponse<ScheduleOverride>>(`/schedule/overrides/${overrideId}`, body)).data.data,

  deleteOverride: async (overrideId: string) => {
    await httpClient.delete(`/schedule/overrides/${overrideId}`);
  },
};

const scheduleKey = ["school", "schedule"] as const;

export const useScheduleOverrides = (academicYearId: string | undefined) =>
  useQuery({
    queryKey: [...scheduleKey, "overrides", academicYearId],
    queryFn: () => scheduleApi.overrides(academicYearId!),
    enabled: !!academicYearId,
  });

// a change of hours moves the routine's times on those days, and bell schedule usage counts
const useScheduleMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKey });
      queryClient.invalidateQueries({ queryKey: ["school", "routine"] });
    },
  });
};

export const useCreateScheduleOverride = () => useScheduleMutation(scheduleApi.createOverride);
export const useUpdateScheduleOverride = () => useScheduleMutation(scheduleApi.updateOverride);
export const useDeleteScheduleOverride = () => useScheduleMutation(scheduleApi.deleteOverride);
