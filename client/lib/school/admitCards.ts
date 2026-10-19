"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";

// Mirrors server/src/app/modules/admitCard. Days are "YYYY-MM-DD".

export type AdmitSettings = { rules: string; signatures: string[] };

type Named = { id: string; nameEn: string | null; nameBn: string | null };

export type AdmitCard = {
  enrollmentId: string;
  student: { id: string; nameEn: string; nameBn: string; admissionNo: string; fatherName: string; motherName: string; photo: string | null };
  rollNumber: string | null;
  class: { id: string; name: string; numericLevel: number };
  section: { id: string; name: string; isDefault: boolean };
  group: Named | null;
  // the class's first and last exam day; null until the routine has dates
  firstDay: string | null;
  lastDay: string | null;
  // from the seat plan; null without one
  seat: { room: string; building: string | null; seatNo: number } | null;
};

export type AdmitCardSheet = {
  school: {
    nameEn: string;
    nameBn: string | null;
    logo: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
  } | null;
  // from the result card design
  design: { accentColor: string; showLogo: boolean; showAddress: boolean };
  rules: string[];
  signatures: string[];
  exam: { id: string; nameEn: string | null; nameBn: string | null; academicYear: { id: string; name: string }; releasedAt: string | null };
  cards: AdmitCard[];
};

export type AdmitCardsQuery = { classId?: string; sectionId?: string };

export const admitCardsApi = {
  settings: async () => (await httpClient.get<ApiResponse<AdmitSettings>>("/admit-card/settings")).data.data,
  saveSettings: async (body: AdmitSettings) => (await httpClient.put<ApiResponse<AdmitSettings>>("/admit-card/settings", body)).data.data,
  cards: async ({ examId, ...params }: AdmitCardsQuery & { examId: string }) =>
    (await httpClient.get<ApiResponse<AdmitCardSheet>>(`/admit-card/exams/${examId}`, { params })).data.data,
  release: async ({ examId, released }: { examId: string; released: boolean }) =>
    (await httpClient.post<ApiResponse<{ released: boolean }>>(`/admit-card/exams/${examId}/release`, { released })).data.data,
  family: async (params: { studentId: string; examId: string }) =>
    (await httpClient.get<ApiResponse<AdmitCardSheet>>("/family/admit-card", { params })).data.data,
};

const key = ["school", "admitCards"] as const;

export const useAdmitSettings = () => useQuery({ queryKey: [...key, "settings"], queryFn: admitCardsApi.settings });

export const useAdmitCards = (examId: string | undefined, query: AdmitCardsQuery) =>
  useQuery({ queryKey: [...key, "cards", examId, query], queryFn: () => admitCardsApi.cards({ examId: examId!, ...query }), enabled: !!examId });

export const useFamilyAdmitCard = (query: { studentId: string; examId: string } | null) =>
  useQuery({ queryKey: [...key, "family", query], queryFn: () => admitCardsApi.family(query!), enabled: !!query });

const useAdmitMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: key }) });
};

export const useSaveAdmitSettings = () => useAdmitMutation(admitCardsApi.saveSettings);
export const useReleaseAdmitCards = () => useAdmitMutation(admitCardsApi.release);
