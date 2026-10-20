"use client";

import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import type { Standing, SubscriptionPayment, SubscriptionPlan } from "@/lib/platform/subscriptions";

// The school's own subscription to the platform (the super admin reads it; the platform records it).

export type MySubscription = Standing & {
  plan: SubscriptionPlan | null;
  payments: Omit<SubscriptionPayment, "note" | "createdAt">[];
};

export const useMySubscription = (enabled: boolean) =>
  useQuery({
    queryKey: ["school", "subscription"],
    queryFn: async () => (await httpClient.get<ApiResponse<MySubscription>>("/subscription")).data.data,
    enabled,
  });
