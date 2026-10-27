"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import type { Admission } from "@/lib/site";
import type { AccentColor, SidebarColor } from "@/lib/theme/accents";

// The school's own settings (its super admin only): its accent and sidebar colours, and its
// public homepage's image slider and admission section.

type Appearance = { accentColor: string | null; sidebarColor: string | null };

const appearanceKey = ["school", "settings", "appearance"] as const;

export const useAppearance = () =>
  useQuery({
    queryKey: appearanceKey,
    queryFn: async () => (await httpClient.get<ApiResponse<Appearance>>("/school-settings/appearance")).data.data,
  });

// null for a colour = back to the default
export const useSaveAppearance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { accentColor: AccentColor | null; sidebarColor: SidebarColor | null }) =>
      (await httpClient.patch<ApiResponse<Appearance>>("/school-settings/appearance", body)).data.data,
    onSuccess: (data) => queryClient.setQueryData(appearanceKey, data),
  });
};

// ------------------------------------------------------------- homepage slider

export type Slide = { id: string; image: string | null; caption: string | null; sortOrder: number };

// up to this many pictures (the server's limit too)
export const MAX_SLIDES = 6;

const slidesKey = ["school", "settings", "slides"] as const;

export const useSlides = () =>
  useQuery({
    queryKey: slidesKey,
    queryFn: async () => (await httpClient.get<ApiResponse<Slide[]>>("/school-settings/slides")).data.data,
  });

// every change answers with the whole list, in order
const useSlideMutation = <T,>(request: (body: T) => Promise<Slide[]>) => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: request, onSuccess: (data) => queryClient.setQueryData(slidesKey, data) });
};

export const useAddSlide = () =>
  useSlideMutation(async ({ file, caption }: { file: File; caption: string }) => {
    const body = new FormData();
    body.append("caption", caption);
    body.append("file", file);
    return (
      await httpClient.post<ApiResponse<Slide[]>>("/school-settings/slides", body, { headers: { "Content-Type": "multipart/form-data" } })
    ).data.data;
  });

export const useUpdateSlide = () =>
  useSlideMutation(
    async ({ id, caption }: { id: string; caption: string | null }) =>
      (await httpClient.patch<ApiResponse<Slide[]>>(`/school-settings/slides/${id}`, { caption })).data.data,
  );

export const useReorderSlides = () =>
  useSlideMutation(async (ids: string[]) => (await httpClient.put<ApiResponse<Slide[]>>("/school-settings/slides/order", { ids })).data.data);

export const useRemoveSlide = () =>
  useSlideMutation(async (id: string) => (await httpClient.delete<ApiResponse<Slide[]>>(`/school-settings/slides/${id}`)).data.data);

// ------------------------------------------------------------- admission section

// rows per list (the server's limit too)
export const MAX_ADMISSION_ROWS = 20;

const admissionKey = ["school", "settings", "admission"] as const;

export const useAdmission = () =>
  useQuery({
    queryKey: admissionKey,
    queryFn: async () => (await httpClient.get<ApiResponse<Admission>>("/school-settings/admission")).data.data,
  });

// the whole section at once
export const useSaveAdmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Admission) => (await httpClient.put<ApiResponse<Admission>>("/school-settings/admission", body)).data.data,
    onSuccess: (data) => queryClient.setQueryData(admissionKey, data),
  });
};
