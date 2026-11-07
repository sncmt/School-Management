"use client";

import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import type { Standing, SubscriptionPayment, SubscriptionPlan } from "@/lib/platform/subscriptions";

// The school's own subscription to the platform (the super admin reads it; the platform records it).

export type MySubscription = Standing & {
  plan: SubscriptionPlan | null;
  // the package (null for a school made before packages) and the price of a period now
  package: { name: string; maxStudents: number | null } | null;
  price: { monthly: string; yearly: string; discount: string; due: string | null } | null;
  students: { active: number; max: number | null };
  payments: Omit<SubscriptionPayment, "note" | "createdAt">[];
};

export const useMySubscription = (enabled: boolean) =>
  useQuery({
    queryKey: ["school", "subscription"],
    queryFn: async () => (await httpClient.get<ApiResponse<MySubscription>>("/subscription")).data.data,
    enabled,
  });
