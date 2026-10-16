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
    // the server has already issued fresh cookies
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meQueryKey }),
  });
};

export const useSendPasswordCode = () => useMutation({ mutationFn: authApi.sendPasswordCode });

export const useSetUserPassword = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.setUserPassword,
    // their own password: the server has issued fresh cookies for this device
    onSuccess: (result) => result.self && queryClient.invalidateQueries({ queryKey: meQueryKey }),
  });
};

/**
 * How this user changes their own password: with the current one (platform admins and,
 * in a school, guardians), with a code emailed to them (the school super admin), or not
 * at all (everyone else asks the super admin).
 */
export const useOwnPasswordMode = (): "CURRENT" | "EMAIL_CODE" | null => {
  const { data: me } = useMe();
  if (!me) return null;
  if (me.sessionType === "PLATFORM") return "CURRENT";
  if (me.isSuperAdmin) return "EMAIL_CODE";
  return me.roles.some((r) => r.name === "GUARDIAN") ? "CURRENT" : null;
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
