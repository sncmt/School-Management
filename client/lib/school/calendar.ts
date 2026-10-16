"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";

// Mirrors server/src/app/modules/calendar. Calendar dates are "YYYY-MM-DD" in requests and
// midnight UTC ("2027-03-26T00:00:00.000Z") in stored records.

export const HOLIDAY_TYPES = ["PUBLIC", "SCHOOL", "VACATION"] as const;
export type HolidayType = (typeof HOLIDAY_TYPES)[number];
export type EntryKind = "HOLIDAY" | "WORKING_DAY";

// 0 = Sunday … 5 = Friday, 6 = Saturday
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// ------------------------------------------------------------------- weekly

export type WeeklyRule = { id: string; effectiveFrom: string; weekdays: Weekday[]; createdAt: string };

export type WeeklyRules = {
  rules: WeeklyRule[]; // oldest first
  current: (WeeklyRule & { weekdayNames: string[] }) | null; // the one in force today
};

// ----------------------------------------------------------------- national

export type SchoolNationalHoliday = {
  id: string;
  nameEn: string;
  nameBn: string;
  description: string | null;
  fromDate: string;
  toDate: string;
  // false: this school stays open that day
  isOff: boolean;
};

// ------------------------------------------------------------------ entries

export type CalendarEntry = {
  id: string;
  academicYearId: string;
  kind: EntryKind;
  type: HolidayType | null; // null for a working day
  nameEn: string | null;
  nameBn: string | null;
  description: string | null;
  fromDate: string;
  toDate: string;
  allClasses: boolean;
  classes: { class: { id: string; name: string; numericLevel: number } }[];
  teachersOff: boolean;
  academicYear: { id: string; name: string };
};

export type EntryBody = {
  academicYearId: string;
  kind: EntryKind;
  type?: HolidayType;
  nameEn: string | null;
  nameBn: string | null;
  description?: string;
  fromDate: string;
  toDate: string;
  allClasses: boolean;
  classIds: string[];
  teachersOff: boolean;
};

// --------------------------------------------------------------- month view

export type DayReason = "SCHOOL_DAY" | "WORKING_DAY" | "HOLIDAY" | "NATIONAL_HOLIDAY" | "WEEKLY_HOLIDAY";

export type DayStatus = {
  isSchoolDay: boolean;
  reason: DayReason;
  source: { id: string; nameEn: string | null; nameBn: string | null; type: HolidayType | null } | null;
};

export type DayEvent = {
  source: "NATIONAL" | "SCHOOL";
  id: string;
  nameEn: string | null;
  nameBn: string | null;
  kind: EntryKind;
  type: HolidayType | null;
  allClasses: boolean;
  classIds: string[];
  teachersOff: boolean;
};

export type CalendarDay = {
  date: string; // YYYY-MM-DD
  weekday: string;
  isWeeklyHoliday: boolean;
  teachers: DayStatus;
  // only when a class was asked for
  students: DayStatus | null;
  events: DayEvent[];
};

export type CalendarView = { from: string; to: string; classId: string | null; days: CalendarDay[] };

// --------------------------------------------------------------------- api

export const calendarApi = {
  month: async (query: { from: string; to: string; classId?: string }) =>
    (await httpClient.get<ApiResponse<CalendarView>>("/calendar", { params: query })).data.data,

  weeklyRules: async () => (await httpClient.get<ApiResponse<WeeklyRules>>("/calendar/weekly-holidays")).data.data,

  // a rule from a date that has already started can't change: add one from a later date
  setWeeklyRule: async (body: { effectiveFrom: string; weekdays: Weekday[] }) =>
    (await httpClient.put<ApiResponse<WeeklyRule>>("/calendar/weekly-holidays", body)).data.data,

  deleteWeeklyRule: async (ruleId: string) => {
    await httpClient.delete(`/calendar/weekly-holidays/${ruleId}`);
  },

  nationalHolidays: async (year: number) =>
    (
      await httpClient.get<ApiResponse<SchoolNationalHoliday[]>>("/calendar/national-holidays", { params: { year } })
    ).data.data,

  // off = true: a day off as usual; false: the school stays open
  setNationalHolidayOff: async ({ holidayId, off }: { holidayId: string; off: boolean }) => {
    const url = `/calendar/national-holidays/${holidayId}/exclude`;
    await (off ? httpClient.delete(url) : httpClient.post(url));
  },

  entries: async (academicYearId: string) =>
    (await httpClient.get<ApiResponse<CalendarEntry[]>>("/calendar/entries", { params: { academicYearId } })).data
      .data,

  createEntry: async (body: EntryBody) =>
    (await httpClient.post<ApiResponse<CalendarEntry>>("/calendar/entries", body)).data.data,

  // replaces the whole entry, its classes included
  updateEntry: async ({ entryId, body }: { entryId: string; body: EntryBody }) =>
    (await httpClient.put<ApiResponse<CalendarEntry>>(`/calendar/entries/${entryId}`, body)).data.data,

  deleteEntry: async (entryId: string) => {
    await httpClient.delete(`/calendar/entries/${entryId}`);
  },
};

// ------------------------------------------------------------------- hooks

const calendarKey = ["school", "calendar"] as const;

export const useCalendarMonth = (query: { from: string; to: string; classId?: string }) =>
  useQuery({
    queryKey: [...calendarKey, "month", query],
    queryFn: () => calendarApi.month(query),
    placeholderData: keepPreviousData,
  });

export const useWeeklyRules = () =>
  useQuery({ queryKey: [...calendarKey, "weekly"], queryFn: calendarApi.weeklyRules });

export const useSchoolNationalHolidays = (year: number) =>
  useQuery({
    queryKey: [...calendarKey, "national", year],
    queryFn: () => calendarApi.nationalHolidays(year),
    placeholderData: keepPreviousData,
  });

export const useCalendarEntries = (academicYearId: string | undefined) =>
  useQuery({
    queryKey: [...calendarKey, "entries", academicYearId],
    queryFn: () => calendarApi.entries(academicYearId!),
    enabled: !!academicYearId,
  });

// any change can move days in the month view, so everything calendar reloads
const useCalendarMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarKey }),
  });
};

export const useSetWeeklyRule = () => useCalendarMutation(calendarApi.setWeeklyRule);
export const useDeleteWeeklyRule = () => useCalendarMutation(calendarApi.deleteWeeklyRule);
export const useSetNationalHolidayOff = () => useCalendarMutation(calendarApi.setNationalHolidayOff);
export const useCreateCalendarEntry = () => useCalendarMutation(calendarApi.createEntry);
export const useUpdateCalendarEntry = () => useCalendarMutation(calendarApi.updateEntry);
export const useDeleteCalendarEntry = () => useCalendarMutation(calendarApi.deleteEntry);

// ----------------------------------------------------------------- helpers

/** Today in Bangladesh as YYYY-MM-DD. */
export const todayKey = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );

/** First and last day of a month (month 1–12) as YYYY-MM-DD. */
export const monthRange = (year: number, month: number) => {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const mm = String(month).padStart(2, "0");
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(last).padStart(2, "0")}` };
};

/** A YYYY-MM-DD key as a Date at midnight UTC (for formatting with timeZone: "UTC"). */
export const keyToDate = (key: string) => new Date(`${key.slice(0, 10)}T00:00:00Z`);

/** Days between two calendar dates, both ends included. */
export const daysInRange = (from: string, to: string) =>
  Math.round((keyToDate(to).getTime() - keyToDate(from).getTime()) / 86_400_000) + 1;
