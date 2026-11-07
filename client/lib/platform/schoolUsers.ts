"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";

// Mirrors server/src/app/modules/school/schoolUsers.service: a school's people, for the platform admin.

export const SCHOOL_USER_ROLES = ["SUPER_ADMIN", "TEACHER", "STAFF", "GUARDIAN"] as const;
export type SchoolUserRole = (typeof SCHOOL_USER_ROLES)[number];

export type SchoolUser = {
  membershipId: string;
  status: string;
  user: { id: string; fullname: string; email: string | null; phone: string | null; isActive: boolean };
  // SUPER_ADMIN, TEACHER, GUARDIAN, or the name of a role the school made
  roles: string[];
  // the same login at this many other schools
  otherSchools: number;
  // a platform admin's account: not changed from here
  platformAdmin: boolean;
};

type Meta = { page: number; limit: number; total: number; totalPages: number };
export type SchoolUserList = { items: SchoolUser[]; meta: Meta };
export type SchoolUsersQuery = { search?: string; role?: SchoolUserRole; page: number; limit: number };

export type PasswordChange = {
  id: string;
  targetUserId: string;
  targetName: string;
  source: "PLATFORM" | "SCHOOL_SUPER_ADMIN";
  changedByName: string;
  generated: boolean;
  createdAt: string;
};

export type SetPasswordResult = { user: { id: string; fullname: string }; temporaryPassword: string | null; otherSchools: number };

export const schoolUsersApi = {
  list: async (schoolId: string, query: SchoolUsersQuery) =>
    (await httpClient.get<ApiResponse<SchoolUserList>>(`/school/${schoolId}/users`, { params: query })).data.data,
  // newPassword left out: one is made up and sent back once
  setPassword: async ({ schoolId, userId, newPassword }: { schoolId: string; userId: string; newPassword?: string }) =>
    (await httpClient.post<ApiResponse<SetPasswordResult>>(`/school/${schoolId}/users/${userId}/password`, newPassword ? { newPassword } : {})).data.data,
  log: async (schoolId: string, page: number) =>
    (await httpClient.get<ApiResponse<{ items: PasswordChange[]; meta: Meta }>>(`/school/${schoolId}/password-log`, { params: { page, limit: 20 } })).data.data,
};

const key = (schoolId: string) => ["platform", "schools", schoolId, "users"] as const;

export const useSchoolUsers = (schoolId: string, query: SchoolUsersQuery) =>
  useQuery({ queryKey: [...key(schoolId), "list", query], queryFn: () => schoolUsersApi.list(schoolId, query), placeholderData: keepPreviousData });

export const usePasswordLog = (schoolId: string, page: number) =>
  useQuery({ queryKey: [...key(schoolId), "log", page], queryFn: () => schoolUsersApi.log(schoolId, page), placeholderData: keepPreviousData });

export const useSetUserPassword = (schoolId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: schoolUsersApi.setPassword,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(schoolId) }),
  });
};
