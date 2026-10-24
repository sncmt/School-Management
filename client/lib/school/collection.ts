"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import { financeKey, useFinanceMutation, type FeeFrequency } from "./finance";

// Mirrors server/src/app/modules/{studentFee,payment}. Decimals arrive as strings;
// payable and remaining are numbers.

type NameRef = { id: string; nameEn: string | null; nameBn: string | null };
type StudentRef = { id: string; nameEn: string; nameBn: string; admissionNo: string };

export type FeeStatus = "UNPAID" | "PARTIAL" | "PAID" | "WAIVED";
// ONLINE: a guardian paid through SSLCommerz (never taken at the office)
export type PaymentMethod = "CASH" | "MOBILE_BANKING" | "ONLINE";

// ---------------------------------------------------------------- student fees

export type StudentFee = {
  id: string;
  studentId: string;
  academicYearId: string;
  // null: a fee for this student only (a fine, a custom charge)
  feeStructureId: string | null;
  feeTypeId: string;
  amount: string;
  discountAmount: string;
  discountReason: string | null;
  paidAmount: string;
  // monthly fees: the month; one-time fees: null
  month: number | null;
  year: number | null;
  status: FeeStatus;
  description: string | null;
  feeType: NameRef & { frequency: FeeFrequency };
  fund: NameRef;
  // the payment screen only: the fee's academic year
  academicYear?: { id: string; name: string };
  payable: number;
  remaining: number;
};

export type StudentFeeList = {
  items: (StudentFee & { student: StudentRef })[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: {
    totalAmount: string;
    totalDiscount: string;
    totalPayable: string;
    totalPaid: string;
    totalRemaining: string;
    countByStatus: Partial<Record<FeeStatus, number>>;
  };
};

export type FeeListQuery = {
  academicYearId?: string;
  classId?: string;
  feeTypeId?: string;
  status?: FeeStatus;
  month?: number;
  year?: number;
  due?: "true";
  page: number;
  limit: number;
};

export type PayableFees = {
  student: StudentRef;
  // oldest first; one-time fees first
  items: (StudentFee & { isDue: boolean })[];
  summary: { totalRemaining: string; totalDue: string };
};

export type CustomFeeBody = {
  studentId: string;
  academicYearId: string;
  feeTypeId: string;
  amount: number;
  month?: number;
  year?: number;
  description?: string;
};

export type BulkDiscountBody = {
  studentId: string;
  feeTypeId: string;
  academicYearId: string;
  discountAmount?: number;
  discounts?: { fromMonth: number; toMonth: number; discountAmount: number }[];
  discountReason?: string;
};

// -------------------------------------------------------------------- payments

export type PaymentLine = {
  id: string;
  amount: string;
  studentFee: {
    id: string;
    month: number | null;
    year: number | null;
    description: string | null;
    academicYear: { id: string; name: string };
    feeType: NameRef;
    fund: NameRef;
  };
};

export type Payment = {
  id: string;
  receiptNo: string;
  studentId: string;
  amount: string;
  method: PaymentMethod;
  status: "SUCCESS" | "CANCELLED";
  transactionRef: string | null;
  paidAt: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  student: StudentRef;
  allocations: PaymentLine[];
};

export type Receipt = Payment & {
  school: {
    nameEn: string;
    nameBn: string | null;
    logo: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    language: "EN" | "BN";
  } | null;
  student: StudentRef & { fatherName: string | null; guardianName: string | null };
  enrollment: {
    rollNumber: string | null;
    academicYear: { id: string; name: string };
    class: { name: string };
    section: { name: string; isDefault: boolean };
  } | null;
  receivedByName: string | null;
};

export type PaymentList = {
  items: (Omit<Payment, "allocations"> & { _count: { allocations: number } })[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: { collected: string; byStatus: Partial<Record<"SUCCESS" | "CANCELLED", { count: number; amount: string }>> };
};

export type PaymentListQuery = {
  studentId?: string;
  status?: "SUCCESS" | "CANCELLED";
  method?: PaymentMethod;
  // ISO timestamps (a Bangladesh day's start and end)
  from?: string;
  to?: string;
  page: number;
  limit: number;
};

export type RecordPaymentBody = {
  studentId: string;
  method: PaymentMethod;
  transactionRef?: string;
  paidAt?: string;
  // amount left out = the fee's whole remaining amount
  allocations: { studentFeeId: string; amount?: number }[];
};

// --------------------------------------------------------------------- api

export const collectionApi = {
  studentFees: async (studentId: string, query: FeeListQuery) =>
    (await httpClient.get<ApiResponse<StudentFeeList>>(`/student-fee/student/${studentId}`, { params: query })).data.data,
  fees: async (query: FeeListQuery) => (await httpClient.get<ApiResponse<StudentFeeList>>("/student-fee", { params: query })).data.data,
  payable: async (studentId: string, paidYearId?: string) =>
    (await httpClient.get<ApiResponse<PayableFees>>(`/payment/student/${studentId}/payable`, { params: paidYearId ? { paidYearId } : {} })).data.data,

  addCustomFee: async (body: CustomFeeBody) => (await httpClient.post<ApiResponse<StudentFee>>("/student-fee/custom", body)).data.data,
  removeCustomFee: async (studentFeeId: string) => {
    await httpClient.delete(`/student-fee/custom/${studentFeeId}`);
  },
  // 0 removes the discount
  discount: async ({ studentFeeId, ...body }: { studentFeeId: string; discountAmount: number; discountReason?: string }) =>
    (await httpClient.patch<ApiResponse<StudentFee>>(`/student-fee/${studentFeeId}/discount`, body)).data.data,
  discountByFeeType: async (body: BulkDiscountBody) =>
    (await httpClient.post<ApiResponse<{ updatedCount: number; skippedMonths: number[] }>>("/student-fee/discount/by-fee-type", body)).data
      .data,

  recordPayment: async (body: RecordPaymentBody) => (await httpClient.post<ApiResponse<Payment>>("/payment", body)).data.data,
  payments: async (query: PaymentListQuery) => (await httpClient.get<ApiResponse<PaymentList>>("/payment", { params: query })).data.data,
  receipt: async (paymentId: string) => (await httpClient.get<ApiResponse<Receipt>>(`/payment/${paymentId}/receipt`)).data.data,
  cancelPayment: async ({ paymentId, reason }: { paymentId: string; reason: string }) =>
    (await httpClient.post<ApiResponse<Payment>>(`/payment/${paymentId}/cancel`, { reason })).data.data,
};

// ------------------------------------------------------------------- hooks

export const useStudentFees = (studentId: string, query: FeeListQuery) =>
  useQuery({
    queryKey: [...financeKey, "student-fees", studentId, query],
    queryFn: () => collectionApi.studentFees(studentId, query),
    placeholderData: keepPreviousData,
  });

export const useFeeList = (query: FeeListQuery | null) =>
  useQuery({
    queryKey: [...financeKey, "fees", query],
    queryFn: () => collectionApi.fees(query!),
    enabled: !!query,
    placeholderData: keepPreviousData,
  });

// paidYearId: also that year's paid and waived fees (listed, not payable)
export const usePayableFees = (studentId: string, paidYearId?: string) =>
  useQuery({
    queryKey: [...financeKey, "payable", studentId, paidYearId ?? null],
    queryFn: () => collectionApi.payable(studentId, paidYearId),
    placeholderData: keepPreviousData,
  });

export const usePayments = (query: PaymentListQuery) =>
  useQuery({
    queryKey: [...financeKey, "payments", query],
    queryFn: () => collectionApi.payments(query),
    placeholderData: keepPreviousData,
  });

export const useReceipt = (paymentId: string | null) =>
  useQuery({
    queryKey: [...financeKey, "receipt", paymentId],
    queryFn: () => collectionApi.receipt(paymentId!),
    enabled: !!paymentId,
  });

export const useAddCustomFee = () => useFinanceMutation(collectionApi.addCustomFee);
export const useRemoveCustomFee = () => useFinanceMutation(collectionApi.removeCustomFee);
export const useDiscount = () => useFinanceMutation(collectionApi.discount);
export const useDiscountByFeeType = () => useFinanceMutation(collectionApi.discountByFeeType);
export const useRecordPayment = () => useFinanceMutation(collectionApi.recordPayment);
export const useCancelPayment = () => useFinanceMutation(collectionApi.cancelPayment);

// ------------------------------------------------------------------- dates

/** A Bangladesh calendar day ("YYYY-MM-DD") as the ISO start or end of that day. */
export const bdDayStart = (day: string) => `${day}T00:00:00+06:00`;
export const bdDayEnd = (day: string) => `${day}T23:59:59.999+06:00`;
