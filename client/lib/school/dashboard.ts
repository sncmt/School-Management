"use client";

import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import type { PaymentMethod } from "./collection";

// Mirrors server/src/app/modules/dashboard. Each part is null when the person may not
// see it (or there is no current academic year). Money arrives as "1234.50".

export type DashboardSummary = {
  academicYear: { id: string; name: string } | null;
  students: { total: number; boys: number; girls: number; newThisYear: number } | null;
  teachers: { working: number; onLeave: number } | null;
  attendance: {
    date: string;
    sectionsTaken: number;
    sections: number;
    marked: number;
    present: number;
    late: number;
    absent: number;
    leave: number;
    // late counts as present; null before any roll call today
    presentPercent: number | null;
  } | null;
  money: {
    today: { collected: string; payments: number };
    thisMonth: { collected: string; spent: string };
    dueNow: string;
    // the last six months, oldest first: "2026-05"
    months: { month: string; collected: string; spent: string }[];
  } | null;
  recentPayments:
    | {
        id: string;
        receiptNo: string;
        amount: string;
        method: PaymentMethod;
        status: "SUCCESS" | "CANCELLED";
        paidAt: string;
        student: { id: string; nameEn: string; nameBn: string };
      }[]
    | null;
  // holidays in the next 45 days
  upcoming: { id: string; nameEn: string | null; nameBn: string | null; kind: string; type: string | null; from: string; to: string }[] | null;
};

export const useDashboard = (enabled = true) =>
  useQuery({
    queryKey: ["school", "dashboard"],
    enabled,
    queryFn: async () => (await httpClient.get<ApiResponse<DashboardSummary>>("/dashboard")).data.data,
    // fresh numbers each time the dashboard is opened, and every few minutes while it stays open
    refetchInterval: 5 * 60_000,
  });
