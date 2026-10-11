"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";

// ------------------------------------------------------------------- types

export type NationalHoliday = {
  id: string;
  nameEn: string;
  nameBn: string;
  description: string | null;
  // calendar dates; the server sends them as midnight UTC ("2027-03-26T00:00:00.000Z")
  fromDate: string;
  toDate: string;
  // how many schools switched it off (stay open that day)
  _count: { exclusions: number };
};

export type NationalHolidayBody = {
  nameEn: string;
  nameBn: string;
  description?: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string;
};

export { dayKey } from "@/lib/dates";

/** Days a holiday covers, both ends included. */
export const holidayDays = (holiday: Pick<NationalHoliday, "fromDate" | "toDate">) =>
  Math.round((Date.parse(holiday.toDate) - Date.parse(holiday.fromDate)) / 86_400_000) + 1;

/** This year in Bangladesh. */
export const currentYear = () =>
  Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric" }).format(new Date()));

// --------------------------------------------------------------------- api

export const nationalHolidaysApi = {
  // holidays that touch the given calendar year
  list: async (year: number) =>
    (
      await httpClient.get<ApiResponse<NationalHoliday[]>>("/platform/national-holiday", { params: { year } })
    ).data.data,

  create: async (body: NationalHolidayBody) =>
    (await httpClient.post<ApiResponse<NationalHoliday>>("/platform/national-holiday", body)).data.data,

  // an update replaces every field
  update: async ({ holidayId, body }: { holidayId: string; body: NationalHolidayBody }) =>
    (await httpClient.put<ApiResponse<NationalHoliday>>(`/platform/national-holiday/${holidayId}`, body)).data
      .data,

  remove: async (holidayId: string) => {
    await httpClient.delete(`/platform/national-holiday/${holidayId}`);
  },
};

// ------------------------------------------------------------------- hooks

const holidaysKey = ["platform", "national-holidays"] as const;

export const useNationalHolidays = (year: number) =>
  useQuery({
    queryKey: [...holidaysKey, year],
    queryFn: () => nationalHolidaysApi.list(year),
    placeholderData: keepPreviousData,
  });

const useHolidayMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: holidaysKey }),
  });
};

export const useCreateNationalHoliday = () => useHolidayMutation(nationalHolidaysApi.create);
export const useUpdateNationalHoliday = () => useHolidayMutation(nationalHolidaysApi.update);
export const useDeleteNationalHoliday = () => useHolidayMutation(nationalHolidaysApi.remove);
