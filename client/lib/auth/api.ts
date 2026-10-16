import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import type { SessionType } from "@/lib/tenant";
import type { Me, PlatformLoginResult, SchoolLoginResult } from "./types";

const segment = (type: SessionType) => (type === "PLATFORM" ? "platform" : "school");

export const authApi = {
  platformLogin: async (body: { email: string; password: string }) =>
    (await httpClient.post<ApiResponse<PlatformLoginResult>>("/auth/platform/login", body)).data.data,

  // the school comes from the host, never the body
  schoolLogin: async (body: { identifier: string; password: string }) =>
    (await httpClient.post<ApiResponse<SchoolLoginResult>>("/auth/school/login", body)).data.data,

  getMe: async () => (await httpClient.get<ApiResponse<Me>>("/auth/me")).data.data,

  logout: async (type: SessionType) => {
    await httpClient.post(`/auth/${segment(type)}/logout`);
  },

  logoutAll: async () => {
    await httpClient.post("/auth/logout-all");
  },

  changePassword: async (body: { currentPassword: string; newPassword: string }) => {
    await httpClient.post("/auth/change-password", body);
  },

  // the school super admin: a code to their email, then the new password with the code
  sendPasswordCode: async (userId: string) =>
    (await httpClient.post<ApiResponse<{ sentTo: string; expiresAt: string }>>("/auth/school/password-code", { userId })).data.data,

  setUserPassword: async ({ userId, ...body }: { userId: string; newPassword: string; code: string }) =>
    (
      await httpClient.post<ApiResponse<{ self: boolean; user: { id: string; fullname: string } }>>(
        `/auth/school/users/${userId}/password`,
        body,
      )
    ).data.data,
};
