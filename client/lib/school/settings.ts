"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import type { AccentColor } from "@/lib/theme/accents";

// The school's own settings (its super admin only): for now its accent colour.

type Appearance = { accentColor: string | null };

const appearanceKey = ["school", "settings", "appearance"] as const;

export const useAppearance = () =>
  useQuery({
    queryKey: appearanceKey,
    queryFn: async () => (await httpClient.get<ApiResponse<Appearance>>("/school-settings/appearance")).data.data,
  });

export const useSaveAppearance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (accentColor: AccentColor | null) =>
      (await httpClient.patch<ApiResponse<Appearance>>("/school-settings/appearance", { accentColor })).data.data,
    onSuccess: (data) => queryClient.setQueryData(appearanceKey, data),
  });
};
