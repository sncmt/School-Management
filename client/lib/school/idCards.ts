"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";

// Mirrors server/src/app/modules/idCard.

// all portrait (54 x 85.6 mm), each its own design
export const ID_CARD_TEMPLATES = ["CLASSIC", "MODERN", "MINIMAL", "BOLD", "ELEGANT"] as const;
export type IdCardTemplate = (typeof ID_CARD_TEMPLATES)[number];

export type IdCardSettings = {
  template: IdCardTemplate;
  accentColor: string;
  showLogo: boolean;
  showAdmissionNo: boolean;
  showBack: boolean;
  backText: string;
  signatureLabel: string;
};

export type IdCardSchool = {
  nameEn: string;
  nameBn: string | null;
  logo: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
};

export type IdCard = {
  id: string;
  rollNumber: string | null;
  class: { id: string; name: string; numericLevel: number };
  section: { id: string; name: string; isDefault: boolean };
  group: { id: string; nameEn: string | null; nameBn: string | null } | null;
  student: { id: string; nameEn: string; nameBn: string; fatherName: string; admissionNo: string; photo: string | null; mobile: string | null };
};

export type IdCardYear = { id: string; name: string; startDate: string; endDate: string };

export type IdCardData = { school: IdCardSchool | null; settings: IdCardSettings; academicYear: IdCardYear; cards: IdCard[] };

export type IdCardsQuery = { academicYearId?: string; classId?: string; sectionId?: string; enrollmentId?: string };

export const idCardsApi = {
  settings: async () => (await httpClient.get<ApiResponse<IdCardSettings>>("/id-card/settings")).data.data,
  school: async () => (await httpClient.get<ApiResponse<IdCardSchool>>("/id-card/school")).data.data,
  saveSettings: async (body: IdCardSettings) => (await httpClient.put<ApiResponse<IdCardSettings>>("/id-card/settings", body)).data.data,
  cards: async (params: IdCardsQuery) => (await httpClient.get<ApiResponse<IdCardData>>("/id-card", { params })).data.data,
};

const key = ["school", "idCards"] as const;

export const useIdCardSettings = () => useQuery({ queryKey: [...key, "settings"], queryFn: idCardsApi.settings });

// the school's name, logo and address, for the design previews
export const useIdCardSchool = () => useQuery({ queryKey: [...key, "school"], queryFn: idCardsApi.school, staleTime: 5 * 60_000 });

export const useIdCards = (query: IdCardsQuery, enabled = true) =>
  useQuery({ queryKey: [...key, "cards", query], queryFn: () => idCardsApi.cards(query), enabled });

export const useSaveIdCardSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: idCardsApi.saveSettings, onSuccess: () => queryClient.invalidateQueries({ queryKey: key }) });
};

/** "+8801712345678" -> "01712345678": the number as people write it. */
export const localMobile = (phone: string | null) => (phone ? phone.replace(/^\+88/, "") : null);
