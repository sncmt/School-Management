"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import type { About, Admission } from "@/lib/site";
import type { AccentColor, SidebarColor } from "@/lib/theme/accents";

// The school's own settings (its super admin only): its accent and sidebar colours, and its
// public homepage's sections: the image slider, about, admission and the gallery.

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

// ------------------------------------------------------------- the slider and the gallery

// the homepage's two picture lists, managed the same way
export type PhotoList = "slides" | "gallery";

export type ListPhoto = { id: string; image: string | null; caption: string | null; sortOrder: number };

// up to this many pictures in each (the server's limits too)
export const MAX_PHOTOS: Record<PhotoList, number> = { slides: 6, gallery: 24 };

const photosKey = (list: PhotoList) => ["school", "settings", list] as const;

export const usePhotos = (list: PhotoList) =>
  useQuery({
    queryKey: photosKey(list),
    queryFn: async () => (await httpClient.get<ApiResponse<ListPhoto[]>>(`/school-settings/${list}`)).data.data,
  });

// every change answers with the whole list, in order
const usePhotoMutation = <T,>(list: PhotoList, request: (body: T) => Promise<ListPhoto[]>) => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: request, onSuccess: (data) => queryClient.setQueryData(photosKey(list), data) });
};

export const useAddPhoto = (list: PhotoList) =>
  usePhotoMutation(list, async ({ file, caption }: { file: File; caption: string }) => {
    const body = new FormData();
    body.append("caption", caption);
    body.append("file", file);
    return (
      await httpClient.post<ApiResponse<ListPhoto[]>>(`/school-settings/${list}`, body, { headers: { "Content-Type": "multipart/form-data" } })
    ).data.data;
  });

export const useUpdatePhoto = (list: PhotoList) =>
  usePhotoMutation(
    list,
    async ({ id, caption }: { id: string; caption: string | null }) =>
      (await httpClient.patch<ApiResponse<ListPhoto[]>>(`/school-settings/${list}/${id}`, { caption })).data.data,
  );

export const useReorderPhotos = (list: PhotoList) =>
  usePhotoMutation(list, async (ids: string[]) => (await httpClient.put<ApiResponse<ListPhoto[]>>(`/school-settings/${list}/order`, { ids })).data.data);

export const useRemovePhoto = (list: PhotoList) =>
  usePhotoMutation(list, async (id: string) => (await httpClient.delete<ApiResponse<ListPhoto[]>>(`/school-settings/${list}/${id}`)).data.data);

// ------------------------------------------------------------- about section

// up to this many facts beside the words (the server's limit too)
export const MAX_ABOUT_FACTS = 4;

const aboutKey = ["school", "settings", "about"] as const;

export const useAbout = () =>
  useQuery({
    queryKey: aboutKey,
    queryFn: async () => (await httpClient.get<ApiResponse<About>>("/school-settings/about")).data.data,
  });

const useAboutMutation = <T,>(request: (body: T) => Promise<About>) => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: request, onSuccess: (data) => queryClient.setQueryData(aboutKey, data) });
};

// the words and the facts
export const useSaveAbout = () =>
  useAboutMutation(async (body: Pick<About, "body" | "facts">) => (await httpClient.put<ApiResponse<About>>("/school-settings/about", body)).data.data);

export const useUploadAboutImage = () =>
  useAboutMutation(async (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return (await httpClient.post<ApiResponse<About>>("/school-settings/about/image", body, { headers: { "Content-Type": "multipart/form-data" } })).data
      .data;
  });

export const useRemoveAboutImage = () =>
  useAboutMutation(async () => (await httpClient.delete<ApiResponse<About>>("/school-settings/about/image")).data.data);

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
