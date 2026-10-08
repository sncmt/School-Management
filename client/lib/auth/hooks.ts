"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { getErrorStatus } from "@/lib/api/errors";
import type { SessionType } from "@/lib/tenant";
import { authApi } from "./api";
import { hasPermission, type PermissionCheck } from "./permissions";
import { authRoutes } from "./routes";
import { broadcastLogout } from "./session";
import type { SchoolMe } from "./types";

export const meQueryKey = ["auth", "me"] as const;

/** The logged-in session: user, and for a school also roles, permissions and modules. */
export const useMe = () =>
  useQuery({
    queryKey: meQueryKey,
    queryFn: authApi.getMe,
    staleTime: 5 * 60_000,
    // 401s are already handled by the refresh interceptor; only retry the network
    retry: (failureCount, error) => getErrorStatus(error) === undefined && failureCount < 2,
  });

export const useSchoolMe = (): SchoolMe | undefined => {
  const { data } = useMe();
  return data?.sessionType === "SCHOOL" ? (data as SchoolMe) : undefined;
};

/** `can("exam:view")`, `can(["a", "b"])` (all), `can(["a", "b"], { any: true })`. */
export const useCan = () => {
  const { data } = useMe();
  return useCallback(
    (required: PermissionCheck, options?: { any?: boolean }) => hasPermission(data, required, options),
    [data],
  );
};

export const usePlatformLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.platformLogin,
    // the guard loads the full session on the next page
    onSuccess: () => queryClient.removeQueries({ queryKey: meQueryKey }),
  });
};

export const useSchoolLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.schoolLogin,
    onSuccess: () => queryClient.removeQueries({ queryKey: meQueryKey }),
  });
};

export const useChangePassword = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.changePassword,
    // clears mustChangePassword; the server has already issued fresh cookies
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meQueryKey }),
  });
};

/**
 * Ends the session (or, with `everywhere`, every session of this user) and
 * leaves with a full page load so nothing from the old session stays in memory.
 */
export const useLogout = (type: SessionType) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ everywhere = false }: { everywhere?: boolean } = {}) =>
      everywhere ? authApi.logoutAll() : authApi.logout(type),
    onSuccess: () => {
      queryClient.clear();
      broadcastLogout();
      window.location.replace(authRoutes[type].login);
    },
  });
};
