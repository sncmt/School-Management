"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormatter } from "next-intl";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import { packagePrice } from "./packages";
import type { SchoolStatus } from "./schools";

// Mirrors server/src/app/modules/subscription. Dates arrive as ISO strings, amounts as strings.

export type SubscriptionPlan = "MONTHLY" | "YEARLY";
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = ["MONTHLY", "YEARLY"];

/* A paid period: a year and month (monthly), or a year (yearly). */
export type PaidPeriod = { plan: SubscriptionPlan; year: number; month: number | null };

export type SubscriptionPayment = PaidPeriod & {
  id: string;
  period: string;
  amount: string | null;
  paidOn: string;
  note?: string | null;
  createdAt?: string;
};

/* Where a school stands: the last period paid, and whether this month (or year) is paid. */
export type Standing = { paidThrough: PaidPeriod | null; currentPaid: boolean | null };

export type SubscriptionSchoolRow = Standing & {
  id: string;
  nameEn: string;
  nameBn: string;
  subdomain: string;
  status: SchoolStatus;
  activationDate: string | null;
  subscriptionPlan: SubscriptionPlan | null;
  package: { id: string; name: string; maxStudents: number | null } | null;
  payments: number;
};

export type SchoolSubscription = Standing & {
  school: {
    id: string;
    nameEn: string;
    nameBn: string;
    subdomain: string;
    status: SchoolStatus;
    activationDate: string | null;
    discount: string;
    subscriptionPlan: SubscriptionPlan | null;
  };
  plan: SubscriptionPlan | null;
  // the package now, and the price of a period after the discount (a new payment's amount)
  package: { id: string; code: string; name: string; maxStudents: number | null; monthlyPrice: string } | null;
  price: { monthly: string; yearly: string; discount: string; due: string | null } | null;
  students: { active: number; max: number | null };
  payments: SubscriptionPayment[];
};

/* A payment to record; the plan only when the school has none yet. */
export type PaymentBody = { plan?: SubscriptionPlan; year: number; month?: number; amount?: number; paidOn?: string; note?: string };

export type SubscriptionListQuery = { page: number; limit: number; search?: string };

export const subscriptionsApi = {
  list: async (query: SubscriptionListQuery) =>
    (
      await httpClient.get<ApiResponse<{ items: SubscriptionSchoolRow[]; meta: { page: number; limit: number; total: number; totalPages: number } }>>(
        "/platform/subscription",
        { params: query },
      )
    ).data.data,
  get: async (schoolId: string) => (await httpClient.get<ApiResponse<SchoolSubscription>>(`/platform/subscription/${schoolId}`)).data.data,
  addPayment: async ({ schoolId, body }: { schoolId: string; body: PaymentBody }) =>
    (await httpClient.post<ApiResponse<SubscriptionPayment>>(`/platform/subscription/${schoolId}/payments`, body)).data.data,
  removePayment: async (paymentId: string) => (await httpClient.delete(`/platform/subscription/payments/${paymentId}`)).data,
  setPlan: async ({ schoolId, plan }: { schoolId: string; plan: SubscriptionPlan }) =>
    (await httpClient.patch<ApiResponse<SchoolSubscription>>(`/platform/subscription/${schoolId}/plan`, { plan })).data.data,
};

const subscriptionsKey = ["platform", "subscriptions"] as const;

export const useSubscriptions = (query: SubscriptionListQuery) =>
  useQuery({ queryKey: [...subscriptionsKey, "list", query], queryFn: () => subscriptionsApi.list(query), placeholderData: keepPreviousData });

export const useSchoolSubscription = (schoolId: string) =>
  useQuery({ queryKey: [...subscriptionsKey, "school", schoolId], queryFn: () => subscriptionsApi.get(schoolId) });

const useSubscriptionMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionsKey });
      // the schools pages show the plan too
      queryClient.invalidateQueries({ queryKey: ["platform", "schools"] });
    },
  });
};

export const useAddSubscriptionPayment = () => useSubscriptionMutation(subscriptionsApi.addPayment);
export const useRemoveSubscriptionPayment = () => useSubscriptionMutation(subscriptionsApi.removePayment);
export const useSetSubscriptionPlan = () => useSubscriptionMutation(subscriptionsApi.setPlan);

/* What a payment needs to know about its school: its plan, package price and discount. */
export type PayingSchool = {
  id: string;
  subscriptionPlan: SubscriptionPlan | null;
  package: { monthlyPrice: string } | null;
  discount: string;
};

/** What the school pays for one period of a plan (its package's price), after its discount ("2250"), or "" without a package. */
export const planFee = (school: Pick<PayingSchool, "package" | "discount">, plan: SubscriptionPlan) =>
  packagePrice(school.package?.monthlyPrice, plan, school.discount);

/** `period(p)` -> "October 2026" for a month, "2026" for a year, in the current language. */
export const usePeriodLabel = () => {
  const format = useFormatter();
  return ({ year, month }: { year: number; month: number | null }) =>
    month ? format.dateTime(new Date(Date.UTC(year, month - 1, 1)), { month: "long", year: "numeric", timeZone: "UTC" }) : format.number(year, { useGrouping: false });
};
