"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";

/** A section's settings for one academic year (all optional until set). */
export type SectionYearConfig = {
  id: string;
  academicYearId: string;
  capacity: number | null;
  startTime: string | null; // "08:00"
  endTime: string | null;
  periodTemplate: { id: string; nameEn: string | null; nameBn: string | null } | null;
  classTeacherMembershipId: string | null;
  classTeacherMembership: {
    id: string;
    user: { id: string; fullname: string; phone: string | null };
    // the teacher's names in this school
    teacherProfile: { id: string; nameEn: string; nameBn: string } | null;
  } | null;
};

export type Section = {
  id: string;
  name: string;
  // the class's automatic section: its name is never shown
  isDefault: boolean;
  class: { id: string; name: string; numericLevel: number };
  // for the listed year; null when the school has no current year
  yearInfo: { config: SectionYearConfig | null; activeStudents: number; isOverCapacity: boolean } | null;
};

export type SectionList = {
  academicYear: { id: string; name: string } | null;
  items: Section[];
};

export type CreateSectionsResult = {
  created: Section[];
  skipped: { classId: string; className: string; name: string }[];
  replacedDefaultSections: number;
};

// missing = leave as it is, null = clear
export type SectionYearConfigBody = {
  academicYearId: string;
  classTeacherMembershipId?: string | null;
  capacity?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  periodTemplateId?: string | null;
};

export const sectionsApi = {
  // by class level, then name; year data for the current year
  list: async () => (await httpClient.get<ApiResponse<SectionList>>("/section")).data.data,

  // every class gets every name; existing pairs are skipped
  create: async (body: { classIds: string[]; names: string[] }) =>
    (await httpClient.post<ApiResponse<CreateSectionsResult>>("/section/create", body)).data.data,

  rename: async ({ sectionId, name }: { sectionId: string; name: string }) =>
    (await httpClient.patch<ApiResponse<Section>>(`/section/${sectionId}`, { name })).data.data,

  remove: async (sectionId: string) => {
    await httpClient.delete(`/section/${sectionId}`);
  },

  setYearConfig: async ({ sectionId, body }: { sectionId: string; body: SectionYearConfigBody }) =>
    (
      await httpClient.put<ApiResponse<{ warnings: string[] }>>(`/section/${sectionId}/year-config`, body)
    ).data.data,
};

const sectionsKey = ["school", "sections"] as const;

export const useSections = () => useQuery({ queryKey: sectionsKey, queryFn: sectionsApi.list });

const useSectionMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionsKey });
      // the classes page lists each class's sections
      queryClient.invalidateQueries({ queryKey: ["school", "classes"] });
    },
  });
};

export const useCreateSections = () => useSectionMutation(sectionsApi.create);
export const useRenameSection = () => useSectionMutation(sectionsApi.rename);
export const useDeleteSection = () => useSectionMutation(sectionsApi.remove);
export const useSetSectionYearConfig = () => useSectionMutation(sectionsApi.setYearConfig);
