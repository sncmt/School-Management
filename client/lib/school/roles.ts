"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";

// Mirrors server/src/app/modules/role: the school's roles and staff (super admin only).

export type RoleKind = "SUPER_ADMIN" | "TEACHER" | "GUARDIAN" | "CUSTOM";

export type Role = {
  id: string;
  name: string;
  description: string | null;
  kind: RoleKind;
  members: number;
  permissions: string[];
};

export type PermissionInfo = { code: string; name: string; module: { code: string; name: string } };

export type RoleList = { roles: Role[]; permissions: PermissionInfo[] };

export type StaffMember = {
  membershipId: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  user: { id: string; fullname: string; phone: string | null; email: string | null; isActive: boolean };
  teacher: { id: string; nameEn: string | null; nameBn: string | null } | null;
  roles: { id: string; name: string; kind: RoleKind }[];
};

export type RoleBody = { name: string; description?: string; permissions: string[] };

export const rolesApi = {
  list: async () => (await httpClient.get<ApiResponse<RoleList>>("/role")).data.data,
  create: async (body: RoleBody) => (await httpClient.post<ApiResponse<{ id: string }>>("/role", body)).data.data,
  // the Teacher role: permissions only
  update: async ({ roleId, body }: { roleId: string; body: { name?: string; description?: string | null; permissions?: string[] } }) =>
    (await httpClient.patch<ApiResponse<{ id: string }>>(`/role/${roleId}`, body)).data.data,
  remove: async (roleId: string) => {
    await httpClient.delete(`/role/${roleId}`);
  },

  staff: async () => (await httpClient.get<ApiResponse<StaffMember[]>>("/role/staff")).data.data,
  addStaff: async (body: { fullname: string; phone: string; roleIds: string[] }) =>
    (
      await httpClient.post<
        ApiResponse<{ member: StaffMember; account: { status: "CREATED" | "LINKED"; loginPhone: string; password: string | null } }>
      >("/role/staff", body)
    ).data.data,
  setStaffRoles: async ({ membershipId, roleIds }: { membershipId: string; roleIds: string[] }) =>
    (await httpClient.put<ApiResponse<StaffMember>>(`/role/staff/${membershipId}/roles`, { roleIds })).data.data,
};

const rolesKey = ["school", "roles"] as const;

export const useRoles = () => useQuery({ queryKey: [...rolesKey, "list"], queryFn: rolesApi.list });
export const useStaff = () => useQuery({ queryKey: [...rolesKey, "staff"], queryFn: rolesApi.staff });

const useRoleMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rolesKey });
      // a staff member may also be a teacher
      queryClient.invalidateQueries({ queryKey: ["school", "teachers"] });
    },
  });
};

export const useCreateRole = () => useRoleMutation(rolesApi.create);
export const useUpdateRole = () => useRoleMutation(rolesApi.update);
export const useDeleteRole = () => useRoleMutation(rolesApi.remove);
export const useAddStaff = () => useRoleMutation(rolesApi.addStaff);
export const useSetStaffRoles = () => useRoleMutation(rolesApi.setStaffRoles);
