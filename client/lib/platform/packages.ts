"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import type { SubscriptionPlan } from "./subscriptions";

// Mirrors server/src/app/modules/package: the subscription packages. Money arrives as "500.00".

export type SubscriptionPackage = {
  id: string;
  // BASIC, STANDARD...: never changes
  code: string;
  name: string;
  // the most active students a school on it may have; null = unlimited
  maxStudents: number | null;
  monthlyPrice: string;
  // twelve times the monthly price
  yearlyPrice: string;
  // switched off: can't be chosen for a school (schools already on it stay)
  isActive: boolean;
  sortOrder: number;
  // schools on it
  schools: number;
};

export type PackageBody = { name: string; maxStudents: number | null; monthlyPrice: number; isActive?: boolean; sortOrder?: number };
export type NewPackageBody = PackageBody & { code: string };

export const packagesApi = {
  list: async () => (await httpClient.get<ApiResponse<SubscriptionPackage[]>>("/platform/package")).data.data,
  create: async (body: NewPackageBody) => (await httpClient.post<ApiResponse<SubscriptionPackage>>("/platform/package", body)).data.data,
  update: async ({ id, body }: { id: string; body: Partial<PackageBody> }) =>
    (await httpClient.patch<ApiResponse<SubscriptionPackage>>(`/platform/package/${id}`, body)).data.data,
  remove: async (id: string) => (await httpClient.delete(`/platform/package/${id}`)).data,
};

const packagesKey = ["platform", "packages"] as const;

export const usePackages = () => useQuery({ queryKey: packagesKey, queryFn: packagesApi.list });

const usePackageMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: packagesKey });
      // schools and subscriptions show their package's price
      queryClient.invalidateQueries({ queryKey: ["platform", "schools"] });
      queryClient.invalidateQueries({ queryKey: ["platform", "subscriptions"] });
    },
  });
};

export const useCreatePackage = () => usePackageMutation(packagesApi.create);
export const useUpdatePackage = () => usePackageMutation(packagesApi.update);
export const useRemovePackage = () => usePackageMutation(packagesApi.remove);

/**
 * What a school on a package pays a period (a month, or twelve times it for a year), after its
 * discount, as "2250" ("" without a package or plan). The same rule as the server's priceOf.
 */
export const packagePrice = (monthlyPrice: string | number | null | undefined, plan: SubscriptionPlan | null | undefined, discount: string | number = 0) => {
  if (monthlyPrice == null || !plan) return "";
  const base = Number(monthlyPrice) * (plan === "YEARLY" ? 12 : 1);
  return String(Math.round(base * (1 - Number(discount || 0) / 100) * 100) / 100);
};
