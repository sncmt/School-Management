"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormatter } from "next-intl";
import { useCallback } from "react";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";

// Mirrors server/src/app/modules/{finance,fund,feeType,feeStructure}. Decimals arrive as strings.

type NameRef = { id: string; nameEn: string | null; nameBn: string | null };

// ------------------------------------------------------------------ settings

export type MidYearFeeRule = "FROM_ADMISSION" | "WHOLE_YEAR";
export type FinanceSettings = { midYearMonthlyFees: MidYearFeeRule; updatedAt: string | null };

// --------------------------------------------------------------------- funds

export type Fund = {
  id: string;
  nameEn: string | null;
  nameBn: string | null;
  description: string | null;
  isActive: boolean;
  // from the ledger, "1234.50"
  balance: string;
};

export type FundBody = { nameEn: string | null; nameBn: string | null; description?: string | null };

// ----------------------------------------------------------------- fee types

export type FeeFrequency = "ONE_TIME" | "MONTHLY";
// who is charged: every student, or only new / only old students of the year
export type FeeAppliesTo = "ALL" | "NEW_STUDENTS" | "OLD_STUDENTS";

export type FeeType = {
  id: string;
  nameEn: string | null;
  nameBn: string | null;
  description: string | null;
  frequency: FeeFrequency;
  appliesTo: FeeAppliesTo;
  isActive: boolean;
  fundId: string;
  fund: NameRef;
};

export type FeeTypeBody = { nameEn: string | null; nameBn: string | null; description?: string | null; fundId: string; appliesTo: FeeAppliesTo };

// ------------------------------------------------------------ fee structures

export type FeeStructure = {
  id: string;
  academicYearId: string;
  classId: string;
  feeTypeId: string;
  // a one-time fee, or a monthly fee that is the same every month
  amount: string;
  isActive: boolean;
  feeType: FeeType;
  schoolClass: { id: string; name: string };
  // a monthly fee that changes over the year; empty = `amount` every month
  monthlyAmounts: { month: number; amount: string }[];
};

export type MonthPeriod = { fromMonth: number; toMonth: number; amount: number };

export type FeeStructureBody = {
  academicYearId: string;
  classId: string;
  feeTypeId: string;
  amount?: number;
  monthlySchedule?: MonthPeriod[];
};

/* What saving or repairing a structure did to the fees already given to students. */
export type StructureSync = {
  removed: number;
  updated: number;
  // fees left alone because money was paid on them (or a discount is bigger than the new amount)
  blocked: { studentFeeId: string; studentId: string; month: number | null; paidAmount: string; reason: string }[];
};

// --------------------------------------------------------------------- api

export const financeApi = {
  settings: async () => (await httpClient.get<ApiResponse<FinanceSettings>>("/finance/settings")).data.data,
  saveSettings: async (body: { midYearMonthlyFees: MidYearFeeRule }) =>
    (await httpClient.put<ApiResponse<FinanceSettings>>("/finance/settings", body)).data.data,

  funds: async () => (await httpClient.get<ApiResponse<Fund[]>>("/fund", { params: { includeInactive: "true" } })).data.data,
  createFund: async (body: FundBody) => (await httpClient.post<ApiResponse<Fund>>("/fund", body)).data.data,
  updateFund: async ({ fundId, body }: { fundId: string; body: Partial<FundBody> & { isActive?: boolean } }) =>
    (await httpClient.patch<ApiResponse<Fund>>(`/fund/${fundId}`, body)).data.data,

  feeTypes: async () =>
    (await httpClient.get<ApiResponse<FeeType[]>>("/fee-type", { params: { includeInactive: "true" } })).data.data,
  createFeeType: async (body: FeeTypeBody & { frequency: FeeFrequency }) =>
    (await httpClient.post<ApiResponse<FeeType>>("/fee-type", body)).data.data,
  // the frequency is fixed once created
  updateFeeType: async ({ feeTypeId, body }: { feeTypeId: string; body: Partial<FeeTypeBody> & { isActive?: boolean } }) =>
    (
      await httpClient.patch<
        ApiResponse<{ feeType: FeeType; unpaidFeesMoved: number; sync: { removed: number; updated: number; blocked: number } }>
      >(`/fee-type/${feeTypeId}`, body)
    ).data
      .data,

  feeStructures: async (query: { academicYearId?: string; classId?: string }) =>
    (await httpClient.get<ApiResponse<FeeStructure[]>>("/fee-structure", { params: query })).data.data,
  // creates, or replaces the class's amounts for that fee type
  saveFeeStructure: async (body: FeeStructureBody) =>
    (await httpClient.post<ApiResponse<{ structure: FeeStructure; sync: StructureSync }>>("/fee-structure", body)).data.data,
  // gives the fee to students who don't have it yet, and re-prices unpaid fees
  // a year's class fees from the year before: every class's fee the year doesn't have yet
  copyFeeStructures: async (body: { toAcademicYearId: string; fromAcademicYearId?: string }) =>
    (
      await httpClient.post<
        ApiResponse<{ from: { name: string }; to: { name: string }; copied: number; skipped: number; studentsWithFees: number }>
      >("/fee-structure/copy", body)
    ).data.data,
  syncFeeStructure: async (feeStructureId: string) =>
    (await httpClient.post<ApiResponse<StructureSync>>(`/fee-structure/${feeStructureId}/sync`)).data.data,
};

// ------------------------------------------------------------------- hooks

export const financeKey = ["school", "finance"] as const;

export const useFinanceSettings = () => useQuery({ queryKey: [...financeKey, "settings"], queryFn: financeApi.settings });
export const useFunds = () => useQuery({ queryKey: [...financeKey, "funds"], queryFn: financeApi.funds });
export const useFeeTypes = () => useQuery({ queryKey: [...financeKey, "fee-types"], queryFn: financeApi.feeTypes });
export const useFeeStructures = (query: { academicYearId?: string; classId?: string } | null) =>
  useQuery({
    queryKey: [...financeKey, "fee-structures", query],
    queryFn: () => financeApi.feeStructures(query!),
    enabled: !!query?.academicYearId,
  });

/* Every finance change can move money or fees, so all finance lists refresh. */
export const useFinanceMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: financeKey }) });
};

export const useSaveFinanceSettings = () => useFinanceMutation(financeApi.saveSettings);
export const useCreateFund = () => useFinanceMutation(financeApi.createFund);
export const useUpdateFund = () => useFinanceMutation(financeApi.updateFund);
export const useCreateFeeType = () => useFinanceMutation(financeApi.createFeeType);
export const useUpdateFeeType = () => useFinanceMutation(financeApi.updateFeeType);
export const useSaveFeeStructure = () => useFinanceMutation(financeApi.saveFeeStructure);
export const useSyncFeeStructure = () => useFinanceMutation(financeApi.syncFeeStructure);
export const useCopyFeeStructures = () => useFinanceMutation(financeApi.copyFeeStructures);

/** An academic year's months in order, each with its calendar year: a July year gives Jul 2026 … Jun 2027. */
export const academicMonths = (year: { startDate: string; endDate: string }) => {
  const start = new Date(year.startDate);
  const end = new Date(year.endDate);
  const months: { month: number; year: number }[] = [];
  let y = start.getUTCFullYear();
  let m = start.getUTCMonth() + 1;
  while (y * 12 + m <= end.getUTCFullYear() * 12 + end.getUTCMonth() + 1 && months.length < 24) {
    months.push({ month: m, year: y });
    if (m === 12) {
      m = 1;
      y++;
    } else m++;
  }
  return months;
};

// ------------------------------------------------------------------- money

/** Taka for display: "৳1,250.50" in the current language's digits. */
export const useMoney = () => {
  const format = useFormatter();
  return useCallback(
    (value: string | number | null | undefined) =>
      value === null || value === undefined
        ? "—"
        : `৳${format.number(Number(value), { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`,
    [format],
  );
};

/** A month's name in the current language: 1 -> "January". */
export const useMonthName = () => {
  const format = useFormatter();
  return useCallback(
    (month: number, style: "long" | "short" = "long") =>
      format.dateTime(new Date(Date.UTC(2000, month - 1, 1)), { month: style, timeZone: "UTC" }),
    [format],
  );
};
