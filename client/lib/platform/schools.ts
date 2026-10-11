"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import { uploadFile } from "@/lib/api/upload";

// ------------------------------------------------------------------- types

export const SCHOOL_STATUSES = ["PENDING", "ACTIVE", "INACTIVE", "SUSPENDED", "EXPIRED"] as const;
export type SchoolStatus = (typeof SCHOOL_STATUSES)[number];

export type SchoolLanguage = "EN" | "BN";

export type School = {
  id: string;
  schoolCode: string;
  nameEn: string;
  nameBn: string;
  subdomain: string;
  email: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  language: SchoolLanguage;
  // signed links to the stored images, or null
  logo: string | null;
  favicon: string | null;
  status: SchoolStatus;
  activationDate: string | null;
  monthlyFee: string | null; // Prisma Decimal arrives as a string
  discount: string;
  createdAt: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type SchoolSortBy = "createdAt" | "nameEn";

export type SchoolListQuery = {
  page: number;
  limit: number;
  search?: string;
  status?: SchoolStatus;
  sortBy: SchoolSortBy;
  sortOrder: "asc" | "desc";
};

export type CreateSchoolBody = {
  nameEn: string;
  nameBn: string;
  subdomain: string;
  email: string;
  phone?: string;
  website?: string;
  address?: string;
  language: SchoolLanguage;
  monthlyFee?: number;
  discount?: number;
};

export type ActivateSchoolResult = {
  school: School;
  superAdmin: { id: string; fullname: string; email: string };
  temporaryPassword: string;
};

export type SchoolDetail = School & {
  superAdmin: {
    id: string;
    fullname: string;
    email: string | null;
    phone: string | null;
    isActive: boolean;
    mustChangePassword: boolean;
  } | null;
  stats: { activeStudents: number; activeTeachers: number };
  modules: { code: string; name: string; type: "FREE" | "PAID" }[];
};

// subdomain can't change; null clears an optional field
export type UpdateSchoolBody = Partial<{
  nameEn: string;
  nameBn: string;
  email: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  language: SchoolLanguage;
  monthlyFee: number | null;
  discount: number;
}>;

export type BrandingImage = "logo" | "favicon";
export type SchoolBranding = Pick<School, "id" | "logo" | "favicon">;

export type ChangeableSchoolStatus = "ACTIVE" | "SUSPENDED" | "INACTIVE";

export type ResetSuperAdminPasswordResult = {
  superAdmin: { id: string; fullname: string; email: string };
  temporaryPassword: string;
};

/*
 * What can be done to a school in its current status. Mirrors STATUS_CHANGES
 * in the server's school.service.ts: a school that was never activated goes
 * through Activate (which creates its super admin), never Reactivate.
 */
export const schoolActions = (school: Pick<School, "status" | "activationDate">) => {
  const wasActivated = !!school.activationDate;
  return {
    activate: !wasActivated && school.status !== "ACTIVE",
    reactivate: wasActivated && ["SUSPENDED", "INACTIVE", "EXPIRED"].includes(school.status),
    suspend: school.status === "ACTIVE",
    deactivate: ["PENDING", "ACTIVE", "SUSPENDED", "EXPIRED"].includes(school.status),
    resetPassword: wasActivated,
    openSite: school.status === "ACTIVE",
  };
};

// --------------------------------------------------------------------- api

export const schoolsApi = {
  list: async (query: SchoolListQuery) =>
    (
      await httpClient.get<ApiResponse<{ data: School[]; meta: PaginationMeta }>>("/school/get_all", {
        params: query,
      })
    ).data.data,

  create: async (body: CreateSchoolBody) =>
    (await httpClient.post<ApiResponse<School>>("/school/create", body)).data.data,

  activate: async (schoolId: string) =>
    (await httpClient.patch<ApiResponse<ActivateSchoolResult>>(`/school/${schoolId}/activate`)).data.data,

  get: async (schoolId: string) =>
    (await httpClient.get<ApiResponse<SchoolDetail>>(`/school/${schoolId}`)).data.data,

  update: async ({ schoolId, body }: { schoolId: string; body: UpdateSchoolBody }) =>
    (await httpClient.patch<ApiResponse<School>>(`/school/${schoolId}`, body)).data.data,

  changeStatus: async ({ schoolId, status }: { schoolId: string; status: ChangeableSchoolStatus }) =>
    (await httpClient.patch<ApiResponse<School>>(`/school/${schoolId}/status`, { status })).data.data,

  resetSuperAdminPassword: async (schoolId: string) =>
    (
      await httpClient.post<ApiResponse<ResetSuperAdminPasswordResult>>(
        `/school/${schoolId}/super-admin/reset-password`,
      )
    ).data.data,

  // the server resizes it: logo 512 px WebP, favicon 64 px PNG
  setBranding: ({ schoolId, kind, file, onProgress }: { schoolId: string; kind: BrandingImage; file: File; onProgress?: (percent: number) => void }) =>
    uploadFile<SchoolBranding>(`/school/${schoolId}/${kind}`, file, onProgress),

  removeBranding: async ({ schoolId, kind }: { schoolId: string; kind: BrandingImage }) =>
    (await httpClient.delete<ApiResponse<SchoolBranding>>(`/school/${schoolId}/${kind}`)).data.data,
};

// ------------------------------------------------------------------- hooks

const schoolsKey = ["platform", "schools"] as const;

export const useSchools = (query: SchoolListQuery) =>
  useQuery({
    queryKey: [...schoolsKey, query],
    queryFn: () => schoolsApi.list(query),
    // keep the current page on screen while the next one loads
    placeholderData: keepPreviousData,
  });

export const useCreateSchool = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: schoolsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schoolsKey }),
  });
};

export const useSchool = (schoolId: string) =>
  useQuery({
    queryKey: [...schoolsKey, "detail", schoolId],
    queryFn: () => schoolsApi.get(schoolId),
  });

// every change refreshes both the list and the school's own page
const useSchoolMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: schoolsKey }),
  });
};

export const useActivateSchool = () => useSchoolMutation(schoolsApi.activate);
export const useUpdateSchool = () => useSchoolMutation(schoolsApi.update);
export const useChangeSchoolStatus = () => useSchoolMutation(schoolsApi.changeStatus);
// the detail page shows the super admin as "using a temporary password" afterwards
export const useResetSuperAdminPassword = () => useSchoolMutation(schoolsApi.resetSuperAdminPassword);
export const useSetSchoolBranding = () => useSchoolMutation(schoolsApi.setBranding);
export const useRemoveSchoolBranding = () => useSchoolMutation(schoolsApi.removeBranding);
