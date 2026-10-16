"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import { bangladeshDay } from "@/lib/dates";
import type { PaymentMethod } from "./collection";
import { financeKey, useFinanceMutation } from "./finance";

// Mirrors server/src/app/modules/{fund (deposit, transfer, ledger), expense, finance (reports)}.
// Money arrives as strings ("1234.50").

type NameRef = { id: string; nameEn: string | null; nameBn: string | null };
type Meta = { page: number; limit: number; total: number; totalPages: number };

export type LedgerType = "INCOME" | "EXPENSE" | "TRANSFER_IN" | "TRANSFER_OUT";
export type LedgerSource = "PAYMENT" | "PAYMENT_REVERSAL" | "MANUAL_DEPOSIT" | "EXPENSE" | "TRANSFER" | "ADJUSTMENT";

/* One row of a fund's ledger: money in (income, transfer in) or out (expense, transfer out). */
export type LedgerEntry = {
  id: string;
  fundId: string;
  type: LedgerType;
  source: LedgerSource;
  amount: string;
  transactionDate: string;
  description: string | null;
  category: string | null;
  createdAt: string;
  fund: NameRef;
};

export type Ledger = {
  items: LedgerEntry[];
  meta: Meta;
  summary: { totalIn: string; totalOut: string; net: string; byType: Partial<Record<LedgerType, string>> };
};

export type LedgerQuery = { fundId?: string; type?: LedgerType; source?: LedgerSource; from?: string; to?: string; page: number; limit: number };

export type Expense = LedgerEntry & { reversedBy: { id: string; description: string | null; createdAt: string } | null };

export type ExpenseList = {
  items: Expense[];
  meta: Meta;
  summary: { totalExpense: string; byCategory: { category: string | null; count: number; amount: string }[] };
};

export type ExpenseQuery = { fundId?: string; category?: string; from?: string; to?: string; includeVoided?: "true"; page: number; limit: number };

export type CollectionReport = {
  from: string;
  to: string;
  collected: { total: string; count: number };
  cancelled: { total: string; count: number };
  expenses: { total: string; byCategory: { category: string | null; count: number; amount: string }[] };
  net: string;
  byDay: { day: string; amount: string }[];
  byMethod: { method: PaymentMethod; amount: string }[];
  byFeeType: { feeType: NameRef; amount: string }[];
  byFund: { fund: NameRef; amount: string }[];
};

export type ClassDues = {
  academicYear: { id: string; name: string };
  total: string;
  // still unpaid from earlier years, for the students of this year
  previousTotal: string;
  studentsWithDues: number;
  classes: { class: { id: string; name: string }; students: number; studentsWithDues: number; amount: string; previous: string }[];
};

export type StudentDues = {
  academicYear: { id: string; name: string };
  class: { id: string; name: string };
  total: string;
  previousTotal: string;
  students: {
    student: { id: string; nameEn: string; nameBn: string; admissionNo: string; phone: string | null; guardianPhone: string | null; status: string };
    rollNumber: string | null;
    section: { name: string; isDefault: boolean };
    fees: number;
    amount: string;
    // still unpaid from earlier years
    previous: string;
    oldestMonth: { year: number; month: number } | null;
  }[];
};

/** A money entry's date for the server: today = now; an earlier day = midday of that day in Bangladesh. */
export const entryDate = (day: string) => (day === bangladeshDay(new Date().toISOString()) ? undefined : `${day}T12:00:00+06:00`);

type MoneyBody = { amount: number; description?: string; transactionDate?: string };

// --------------------------------------------------------------------- api

export const ledgerApi = {
  deposit: async ({ fundId, ...body }: MoneyBody & { fundId: string }) =>
    (await httpClient.post<ApiResponse<{ balance: string }>>(`/fund/${fundId}/deposit`, body)).data.data,
  transfer: async (body: MoneyBody & { fromFundId: string; toFundId: string }) =>
    (await httpClient.post<ApiResponse<{ fromBalance: string }>>("/fund/transfer", body)).data.data,
  ledger: async (query: LedgerQuery) => (await httpClient.get<ApiResponse<Ledger>>("/fund/ledger", { params: query })).data.data,

  expenses: async (query: ExpenseQuery) => (await httpClient.get<ApiResponse<ExpenseList>>("/expense", { params: query })).data.data,
  categories: async () => (await httpClient.get<ApiResponse<string[]>>("/expense/categories")).data.data,
  addExpense: async (body: MoneyBody & { fundId: string; category: string }) =>
    (await httpClient.post<ApiResponse<{ balance: string }>>("/expense", body)).data.data,
  voidExpense: async ({ expenseId, reason }: { expenseId: string; reason: string }) =>
    (await httpClient.post<ApiResponse<unknown>>(`/expense/${expenseId}/void`, { reason })).data.data,

  collection: async (query: { from?: string; to?: string }) =>
    (await httpClient.get<ApiResponse<CollectionReport>>("/finance/reports/collection", { params: query })).data.data,
  classDues: async (academicYearId?: string) =>
    (await httpClient.get<ApiResponse<ClassDues>>("/finance/reports/dues", { params: { academicYearId } })).data.data,
  studentDues: async (query: { academicYearId?: string; classId: string }) =>
    (await httpClient.get<ApiResponse<StudentDues>>("/finance/reports/dues", { params: query })).data.data,
};

// ------------------------------------------------------------------- hooks

export const useLedger = (query: LedgerQuery) =>
  useQuery({ queryKey: [...financeKey, "ledger", query], queryFn: () => ledgerApi.ledger(query), placeholderData: keepPreviousData });
export const useExpenses = (query: ExpenseQuery) =>
  useQuery({ queryKey: [...financeKey, "expenses", query], queryFn: () => ledgerApi.expenses(query), placeholderData: keepPreviousData });
export const useExpenseCategories = () => useQuery({ queryKey: [...financeKey, "expense-categories"], queryFn: ledgerApi.categories });
export const useCollectionReport = (query: { from?: string; to?: string }) =>
  useQuery({ queryKey: [...financeKey, "report-collection", query], queryFn: () => ledgerApi.collection(query), placeholderData: keepPreviousData });
export const useClassDues = (academicYearId?: string) =>
  useQuery({ queryKey: [...financeKey, "report-dues", academicYearId], queryFn: () => ledgerApi.classDues(academicYearId) });
export const useStudentDues = (query: { academicYearId?: string; classId: string } | null) =>
  useQuery({ queryKey: [...financeKey, "report-dues", query], queryFn: () => ledgerApi.studentDues(query!), enabled: !!query });

export const useDeposit = () => useFinanceMutation(ledgerApi.deposit);
export const useTransfer = () => useFinanceMutation(ledgerApi.transfer);
export const useAddExpense = () => useFinanceMutation(ledgerApi.addExpense);
export const useVoidExpense = () => useFinanceMutation(ledgerApi.voidExpense);
