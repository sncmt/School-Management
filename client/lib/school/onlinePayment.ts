"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import { financeKey, useFinanceMutation } from "./finance";

// Mirrors server/src/app/modules/onlinePayment: the school's SSLCommerz store.

export type OnlinePaymentSettings = {
  enabled: boolean;
  sandbox: boolean;
  storeId: string | null;
  // a password is saved (it is never sent back)
  hasPassword: boolean;
  // "1.50": percent added to what guardians pay
  chargePercent: string;
  lastTest: { at: string; ok: boolean; message: string | null } | null;
};

export type SaveOnlinePaymentBody = {
  enabled: boolean;
  sandbox: boolean;
  storeId: string | null;
  // left out: keep the saved one; "": remove it
  storePassword?: string;
  chargePercent: number;
};

export const onlinePaymentApi = {
  settings: async () => (await httpClient.get<ApiResponse<OnlinePaymentSettings>>("/online-payment/settings")).data.data,
  save: async (body: SaveOnlinePaymentBody) => (await httpClient.put<ApiResponse<OnlinePaymentSettings>>("/online-payment/settings", body)).data.data,
  test: async () => (await httpClient.post<ApiResponse<OnlinePaymentSettings>>("/online-payment/settings/test")).data.data,
};

const key = ["school", "onlinePayment"] as const;

export const useOnlinePaymentSettings = () => useQuery({ queryKey: [...key, "settings"], queryFn: onlinePaymentApi.settings });

const useSettingsMutation = <TArgs,>(mutationFn: (args: TArgs) => Promise<OnlinePaymentSettings>) => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: (data) => queryClient.setQueryData([...key, "settings"], data) });
};

export const useSaveOnlinePayment = () => useSettingsMutation(onlinePaymentApi.save);
export const useTestOnlinePayment = () => useSettingsMutation(() => onlinePaymentApi.test());

// ----------------------------------------------- guardians paying (the family login)

export type PayableFee = {
  id: string;
  feeType: { nameEn: string | null; nameBn: string | null };
  month: number | null;
  year: number | null;
  description: string | null;
  academicYear: { id: string; name: string };
  // still owed, "500.00"
  remaining: string;
};

export type PayOptions = { enabled: boolean; chargePercent: string; fees: PayableFee[] };

export type OnlinePaymentStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED";

export type PayResult = {
  tranId: string;
  status: OnlinePaymentStatus;
  feeAmount: string;
  charge: string;
  total: string;
  // paid online but no longer owed (taken at the office meanwhile): the school refunds it
  refundAmount: string;
  failReason: string | null;
  paidAt: string | null;
  createdAt: string;
  student: { id: string; nameEn: string; nameBn: string };
  payment: { id: string; receiptNo: string; amount: string } | null;
};

export const familyPayApi = {
  options: async (studentId: string) => (await httpClient.get<ApiResponse<PayOptions>>(`/family/pay/${studentId}`)).data.data,
  start: async (body: { studentId: string; feeIds: string[] }) =>
    (await httpClient.post<ApiResponse<{ tranId: string; gatewayUrl: string; total: string }>>("/family/pay", body)).data.data,
  result: async (tranId: string) => (await httpClient.get<ApiResponse<PayResult>>(`/family/pay/result/${tranId}`)).data.data,
};

export const usePayOptions = (studentId: string | null) =>
  useQuery({ queryKey: ["school", "familyPay", "options", studentId], queryFn: () => familyPayApi.options(studentId!), enabled: !!studentId });

export const useStartPayment = () => useMutation({ mutationFn: familyPayApi.start });

// while SSLCommerz has not answered, ask again every few seconds
export const usePayResult = (tranId: string) =>
  useQuery({
    queryKey: ["school", "familyPay", "result", tranId],
    queryFn: () => familyPayApi.result(tranId),
    refetchInterval: (query) => (query.state.data?.status === "PENDING" && query.state.dataUpdateCount < 20 ? 4000 : false),
  });

// ----------------------------------------------- the office's list of online payments

export type OnlinePaymentRow = {
  id: string;
  tranId: string;
  status: OnlinePaymentStatus;
  // a test payment (SSLCommerz's sandbox): no real money
  sandbox: boolean;
  feeAmount: string;
  charge: string;
  total: string;
  // what SSLCommerz pays the school after its own charge
  storeAmount: string | null;
  valId: string | null;
  bankTranId: string | null;
  cardType: string | null;
  failReason: string | null;
  // paid but to be given back (taken at the office meanwhile, or the receipt cancelled)
  refundAmount: string;
  refundedAt: string | null;
  refundNote: string | null;
  paidAt: string | null;
  createdAt: string;
  student: { id: string; nameEn: string; nameBn: string; admissionNo: string };
  payer: { id: string; fullname: string; phone: string | null } | null;
  payment: { id: string; receiptNo: string; status: "SUCCESS" | "CANCELLED"; amount: string } | null;
};

export type OnlinePaymentList = {
  items: OnlinePaymentRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: {
    paid: { count: number; total: string; charge: string };
    byStatus: Partial<Record<OnlinePaymentStatus, number>>;
    // whatever the filters
    pending: number;
    refundsOwed: { count: number; amount: string };
  };
};

export type OnlinePaymentListQuery = {
  status?: OnlinePaymentStatus;
  refund?: "OWED" | "DONE";
  // ISO timestamps (a Bangladesh day's start and end), on when the payment was started
  from?: string;
  to?: string;
  search?: string;
  page: number;
  limit: number;
};

export const onlineOfficeApi = {
  list: async (query: OnlinePaymentListQuery) =>
    (await httpClient.get<ApiResponse<OnlinePaymentList>>("/online-payment/payments", { params: query })).data.data,
  check: async (id: string) => (await httpClient.post<ApiResponse<OnlinePaymentRow>>(`/online-payment/payments/${id}/check`)).data.data,
  markRefund: async ({ id, ...body }: { id: string; refunded: boolean; note?: string }) =>
    (await httpClient.post<ApiResponse<OnlinePaymentRow>>(`/online-payment/payments/${id}/refund`, body)).data.data,
};

// under the finance key: a check can record a payment, and a cancelled receipt changes refunds
export const useOnlinePayments = (query: OnlinePaymentListQuery) =>
  useQuery({ queryKey: [...financeKey, "online", query], queryFn: () => onlineOfficeApi.list(query), placeholderData: keepPreviousData });

export const useCheckOnlinePayment = () => useFinanceMutation(onlineOfficeApi.check);
export const useMarkRefund = () => useFinanceMutation(onlineOfficeApi.markRefund);
