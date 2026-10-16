"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFormatter } from "next-intl";
import { useCallback } from "react";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import type { DayStatus } from "./calendar";

// Mirrors server/src/app/modules/routine. Times are 24-hour "HH:mm"; weekdays 0 = Sunday … 6 = Saturday.

// ---------------------------------------------------------- bell schedules

export type Period = {
  number: number;
  nameEn: string | null;
  nameBn: string | null;
  startTime: string;
  endTime: string;
  // tiffin, prayer: no class can be placed in it
  isBreak: boolean;
};

export type PeriodTemplate = {
  id: string;
  nameEn: string | null;
  nameBn: string | null;
  periods: (Period & { id: string })[];
  // sections using it in any year, and schedule changes that switch to it
  _count: { sectionConfigs: number; overrideRules: number };
};

export type TemplateBody = {
  nameEn: string | null;
  nameBn: string | null;
  periods: Period[];
};

// --------------------------------------------------------------- routine

export type TeacherBrief = {
  id: string;
  nameEn: string;
  nameBn: string;
  designation: string | null;
  membership: { user: { id: string; fullname: string; phone: string | null } };
};

export type RoutineEntry = {
  id: string;
  weekday: number;
  weekdayName: string;
  periodNumber: number;
  // null when the section's bell schedule has no such period
  startTime: string | null;
  endTime: string | null;
  class: { id: string; name: string; numericLevel: number };
  classSubjectId: string;
  sections: { id: string; name: string; isDefault: boolean }[];
  // taught to several sections together
  combined: boolean;
  subject: { id: string; nameEn: string | null; nameBn: string | null; code: string | null; religion: string | null };
  group: { id: string; nameEn: string | null; nameBn: string | null } | null;
  isOptional: boolean;
  teacher: TeacherBrief | null;
};

export type WeekDay = { weekday: number; name: string; isWeeklyHoliday: boolean };

export type SectionWeek = {
  academicYear: { id: string; name: string };
  section: { id: string; name: string; isDefault: boolean; class: { id: string; name: string } };
  // the section's bell schedule this year; null until set in the section's settings
  template: { id: string; nameEn: string | null; nameBn: string | null } | null;
  periods: Period[];
  days: WeekDay[];
  entries: RoutineEntry[];
};

export type EntryBody = {
  classId: string;
  sectionIds: string[];
  weekday: number;
  periodNumber: number;
  classSubjectId: string;
  teacherId: string | null;
};

export type TeacherWeek = {
  academicYear: { id: string; name: string };
  teacher: TeacherBrief;
  periodsPerWeek: number;
  perDay: { weekday: number; name: string; periods: number }[];
  entries: RoutineEntry[];
};

export type Workload = {
  academicYear: { id: string; name: string };
  // routine classes that still have no teacher
  unassigned: number;
  items: {
    teacher: TeacherBrief & { status: string };
    periodsPerWeek: number;
    perDay: { weekday: number; name: string; periods: number }[];
  }[];
};

// ------------------------------------------------------------- one date

export type DayEntry = RoutineEntry & {
  // false: no class that day (a holiday, or the day's bell schedule lacks the period)
  held: boolean;
  substitution: { id: string; teacher: TeacherBrief; note: string | null } | null;
};

export type SectionDay = {
  date: string;
  weekday: string;
  section: { id: string; name: string; isDefault: boolean; classId: string; class: { id: string; name: string } };
  day: DayStatus;
  template: { id: string; nameEn: string | null; nameBn: string | null } | null;
  periods: Period[];
  entries: DayEntry[];
};

export type FreeTeachers = {
  date: string;
  period: { number: number; nameEn: string | null; startTime: string; endTime: string };
  // least busy first
  free: { teacher: TeacherBrief; periodsToday: number }[];
};

export type Substitutions = { date: string; items: DayEntry[] };

// --------------------------------------------------------------------- api

export const routineApi = {
  templates: async () => (await httpClient.get<ApiResponse<PeriodTemplate[]>>("/routine/templates")).data.data,

  createTemplate: async (body: TemplateBody) =>
    (await httpClient.post<ApiResponse<PeriodTemplate>>("/routine/templates", body)).data.data,

  // replaces the name and every period
  updateTemplate: async ({ templateId, body }: { templateId: string; body: TemplateBody }) =>
    (await httpClient.put<ApiResponse<PeriodTemplate>>(`/routine/templates/${templateId}`, body)).data.data,

  deleteTemplate: async (templateId: string) => {
    await httpClient.delete(`/routine/templates/${templateId}`);
  },

  sectionWeek: async (sectionId: string) =>
    (await httpClient.get<ApiResponse<SectionWeek>>("/routine/section", { params: { sectionId } })).data.data,

  teacherWeek: async (teacherId: string) =>
    (await httpClient.get<ApiResponse<TeacherWeek>>("/routine/teacher", { params: { teacherId } })).data.data,

  workload: async () => (await httpClient.get<ApiResponse<Workload>>("/routine/workload")).data.data,

  createEntry: async (body: EntryBody) =>
    (await httpClient.post<ApiResponse<RoutineEntry>>("/routine/entries", body)).data.data,

  updateEntry: async ({ entryId, body }: { entryId: string; body: EntryBody }) =>
    (await httpClient.put<ApiResponse<RoutineEntry>>(`/routine/entries/${entryId}`, body)).data.data,

  deleteEntry: async (entryId: string) => {
    await httpClient.delete(`/routine/entries/${entryId}`);
  },

  sectionDay: async ({ sectionId, date }: { sectionId: string; date: string }) =>
    (await httpClient.get<ApiResponse<SectionDay>>("/routine/day", { params: { sectionId, date } })).data.data,

  substitutions: async (date: string) =>
    (await httpClient.get<ApiResponse<Substitutions>>("/routine/substitutions", { params: { date } })).data.data,

  freeTeachers: async (query: { date: string; sectionId: string; periodNumber: number }) =>
    (await httpClient.get<ApiResponse<FreeTeachers>>("/routine/free-teachers", { params: query })).data.data,

  // saving again for the same class and date replaces the substitute
  createSubstitution: async (body: { entryId: string; date: string; teacherId: string; note?: string }) =>
    (await httpClient.post<ApiResponse<unknown>>("/routine/substitutions", body)).data.data,

  deleteSubstitution: async (substitutionId: string) => {
    await httpClient.delete(`/routine/substitutions/${substitutionId}`);
  },
};

// ------------------------------------------------------------------- hooks

const routineKey = ["school", "routine"] as const;

export const usePeriodTemplateList = () =>
  useQuery({ queryKey: [...routineKey, "templates"], queryFn: routineApi.templates });

export const useSectionWeek = (sectionId: string | undefined) =>
  useQuery({
    queryKey: [...routineKey, "section", sectionId],
    queryFn: () => routineApi.sectionWeek(sectionId!),
    enabled: !!sectionId,
    placeholderData: keepPreviousData,
  });

export const useTeacherWeek = (teacherId: string | undefined) =>
  useQuery({
    queryKey: [...routineKey, "teacher", teacherId],
    queryFn: () => routineApi.teacherWeek(teacherId!),
    enabled: !!teacherId,
    placeholderData: keepPreviousData,
  });

export const useWorkload = (enabled = true) =>
  useQuery({ queryKey: [...routineKey, "workload"], queryFn: routineApi.workload, enabled });

export const useSectionDay = (query: { sectionId: string | undefined; date: string }) =>
  useQuery({
    queryKey: [...routineKey, "day", query],
    queryFn: () => routineApi.sectionDay({ sectionId: query.sectionId!, date: query.date }),
    enabled: !!query.sectionId,
    placeholderData: keepPreviousData,
  });

export const useSubstitutions = (date: string) =>
  useQuery({ queryKey: [...routineKey, "substitutions", date], queryFn: () => routineApi.substitutions(date) });

export const useFreeTeachers = (query: { date: string; sectionId: string; periodNumber: number } | null) =>
  useQuery({
    queryKey: [...routineKey, "free", query],
    queryFn: () => routineApi.freeTeachers(query!),
    enabled: !!query,
  });

// every routine change can move other views (a teacher's week, workload, a day)
const useRoutineMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routineKey });
      // the bell schedule picker in section settings
      queryClient.invalidateQueries({ queryKey: ["school", "pickers", "period-templates"] });
      queryClient.invalidateQueries({ queryKey: ["school", "sections"] });
    },
  });
};

export const useCreatePeriodTemplate = () => useRoutineMutation(routineApi.createTemplate);
export const useUpdatePeriodTemplate = () => useRoutineMutation(routineApi.updateTemplate);
export const useDeletePeriodTemplate = () => useRoutineMutation(routineApi.deleteTemplate);
export const useCreateRoutineEntry = () => useRoutineMutation(routineApi.createEntry);
export const useUpdateRoutineEntry = () => useRoutineMutation(routineApi.updateEntry);
export const useDeleteRoutineEntry = () => useRoutineMutation(routineApi.deleteEntry);
export const useCreateSubstitution = () => useRoutineMutation(routineApi.createSubstitution);
export const useDeleteSubstitution = () => useRoutineMutation(routineApi.deleteSubstitution);

// ----------------------------------------------------------------- helpers

/** "08:00" -> "8:00 AM" / "সকাল ৮:০০", in the current language. */
export const useTimeLabel = () => {
  const format = useFormatter();
  return useCallback(
    (time: string | null) =>
      time ? format.dateTime(new Date(`1970-01-01T${time}:00Z`), { hour: "numeric", minute: "2-digit", timeZone: "UTC" }) : "",
    [format],
  );
};

/** "08:00" + 45 -> "08:45" (stays within the day). */
export const addMinutes = (time: string, minutes: number) => {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};
