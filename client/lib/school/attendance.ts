"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import type { DayStatus } from "./calendar";

// Mirrors server/src/app/modules/attendance. Dates are "YYYY-MM-DD"; a roll call can be
// changed for 7 days, older ones need attendance:edit_past.

export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "LEAVE"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export type Tally = Record<AttendanceStatus, number> & {
  total: number;
  // (present + late) / total, e.g. 93.33; null when nobody is counted
  percentage: number | null;
};

type StudentBrief = { id: string; nameEn: string; nameBn: string; admissionNo: string; photo: string | null };

// ------------------------------------------------------------- roll call

export type SheetEntry = {
  enrollmentId: string;
  rollNumber: string | null;
  student: StudentBrief;
  // saved status, or PRESENT as the suggestion before the first save
  status: AttendanceStatus;
  note: string | null;
  saved: boolean;
  source: "MANUAL" | "DEVICE" | null;
};

export type StudentSheet = {
  date: string;
  weekday: string;
  academicYear: { id: string; name: string };
  section: { id: string; name: string; isDefault: boolean; classId: string };
  day: DayStatus;
  taken: boolean;
  canTake: boolean;
  // in English from the server, e.g. "This is not a school day for this class"
  cannotTakeReason: string | null;
  session: { startTime: string | null; endTime: string | null; scheduleNote: string | null; updatedAt: string } | null;
  summary: Tally;
  items: SheetEntry[];
};

export type SaveSheetBody = {
  sectionId: string;
  date: string;
  // students left out keep their status, or become PRESENT on the first save
  records: { studentId: string; status: AttendanceStatus; note?: string }[];
};

// --------------------------------------------------------------- reports

export type DaySummary = {
  date: string;
  weekday: string;
  academicYear: { id: string; name: string };
  students: Record<AttendanceStatus, number> & {
    onRoll: number;
    sectionsTaken: number;
    sectionsPending: number;
    percentage: number | null;
    sections: {
      section: { id: string; name: string; isDefault: boolean };
      class: { id: string; name: string };
      day: DayStatus;
      onRoll: number;
      taken: boolean;
      counts: Record<AttendanceStatus, number> | null;
      percentage: number | null;
    }[];
  };
  teachers: Record<AttendanceStatus, number> & { day: DayStatus; onRoll: number; taken: boolean };
};

export type Absentees = {
  date: string;
  total: number;
  items: {
    student: StudentBrief & { guardianName: string | null; guardianPhone: string | null; phone: string | null; fatherName: string };
    rollNumber: string | null;
    note: string | null;
    class: { id: string; name: string; numericLevel: number };
    section: { id: string; name: string; isDefault: boolean };
    contactPhone: string | null;
  }[];
};

export type SectionRegister = {
  month: string; // YYYY-MM
  section: { id: string; name: string; isDefault: boolean; classId: string };
  daysTaken: number;
  days: { date: string; weekday: string; day: DayStatus; taken: boolean }[];
  students: {
    rollNumber: string | null;
    student: StudentBrief;
    // by date; null = no roll call that day
    statuses: Record<string, AttendanceStatus | null>;
    summary: Tally;
  }[];
};

// -------------------------------------------------------------- teachers

export type TeacherSheet = {
  date: string;
  weekday: string;
  day: DayStatus;
  taken: boolean;
  canTake: boolean;
  cannotTakeReason: string | null;
  summary: Tally;
  items: {
    teacher: {
      id: string;
      nameEn: string;
      nameBn: string;
      designation: string | null;
      status: string;
      photo: string | null;
    };
    status: AttendanceStatus;
    note: string | null;
    saved: boolean;
    source: "MANUAL" | "DEVICE" | null;
  }[];
};

export type AttendanceReport = {
  from: string;
  to: string;
  summary: Tally;
  days: { date: string; status: AttendanceStatus; note: string | null }[];
};

// --------------------------------------------------------------------- api

export const attendanceApi = {
  studentSheet: async (query: { sectionId: string; date: string }) =>
    (await httpClient.get<ApiResponse<StudentSheet>>("/attendance/students/sheet", { params: query })).data.data,

  saveStudentSheet: async (body: SaveSheetBody) =>
    (await httpClient.put<ApiResponse<StudentSheet>>("/attendance/students/sheet", body)).data.data,

  summary: async (date: string) =>
    (await httpClient.get<ApiResponse<DaySummary>>("/attendance/summary", { params: { date } })).data.data,

  absentees: async (query: { date: string; classId?: string }) =>
    (await httpClient.get<ApiResponse<Absentees>>("/attendance/students/absent", { params: query })).data.data,

  register: async ({ sectionId, month }: { sectionId: string; month: string }) =>
    (await httpClient.get<ApiResponse<SectionRegister>>(`/attendance/sections/${sectionId}/register`, { params: { month } }))
      .data.data,

  studentReport: async ({ studentId, from, to }: { studentId: string; from: string; to: string }) =>
    (await httpClient.get<ApiResponse<AttendanceReport>>(`/attendance/students/${studentId}`, { params: { from, to } })).data
      .data,

  teacherSheet: async (date: string) =>
    (await httpClient.get<ApiResponse<TeacherSheet>>("/attendance/teachers/sheet", { params: { date } })).data.data,

  saveTeacherSheet: async (body: { date: string; records: { teacherId: string; status: AttendanceStatus; note?: string }[] }) =>
    (await httpClient.put<ApiResponse<TeacherSheet>>("/attendance/teachers/sheet", body)).data.data,
};

// ------------------------------------------------------------------- hooks

const attendanceKey = ["school", "attendance"] as const;

export const useStudentSheet = (query: { sectionId: string | undefined; date: string }) =>
  useQuery({
    queryKey: [...attendanceKey, "sheet", query],
    queryFn: () => attendanceApi.studentSheet({ sectionId: query.sectionId!, date: query.date }),
    enabled: !!query.sectionId,
  });

export const useDaySummary = (date: string, enabled = true) =>
  useQuery({
    queryKey: [...attendanceKey, "summary", date],
    queryFn: () => attendanceApi.summary(date),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useAbsentees = (query: { date: string; classId?: string }) =>
  useQuery({ queryKey: [...attendanceKey, "absent", query], queryFn: () => attendanceApi.absentees(query) });

export const useSectionRegister = (query: { sectionId: string | undefined; month: string }) =>
  useQuery({
    queryKey: [...attendanceKey, "register", query],
    queryFn: () => attendanceApi.register({ sectionId: query.sectionId!, month: query.month }),
    enabled: !!query.sectionId,
    placeholderData: keepPreviousData,
  });

export const useStudentAttendance = (query: { studentId: string; from: string; to: string }) =>
  useQuery({ queryKey: [...attendanceKey, "student", query], queryFn: () => attendanceApi.studentReport(query) });

export const useTeacherSheet = (date: string, enabled = true) =>
  useQuery({ queryKey: [...attendanceKey, "teachers", date], queryFn: () => attendanceApi.teacherSheet(date), enabled });

// a saved roll call changes the day's summary, absentees and the month register
const useAttendanceMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKey });
      // substitutes leave out teachers marked absent or on leave
      queryClient.invalidateQueries({ queryKey: ["school", "routine"] });
    },
  });
};

export const useSaveStudentSheet = () => useAttendanceMutation(attendanceApi.saveStudentSheet);
export const useSaveTeacherSheet = () => useAttendanceMutation(attendanceApi.saveTeacherSheet);
