"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";

// Mirrors server/src/app/modules/exam/examMarks. A subject's marks open on its exam day; a
// subject teacher enters their own sections, exam:enter_marks any section. Decimals are strings.

type NameRef = { id: string; nameEn: string | null; nameBn: string | null };
type SubjectRef = NameRef & { code: string | null };
export type MarkPart = { name: string; fullMarks: string; passMarks: string };

/** What is sent for one mark: absent, or the total, or each part's marks. */
export type MarkInput = { isAbsent: boolean; total?: number; parts?: Record<string, number> };

type StudentBrief = { id: string; nameEn: string; nameBn: string; admissionNo: string };

export type MarksSheet = {
  exam: NameRef;
  class: { id: string; name: string };
  section: { id: string; name: string; isDefault: boolean };
  subject: SubjectRef;
  date: string;
  fullMarks: string;
  passMarks: string;
  parts: MarkPart[];
  canEdit: boolean;
  // in English from the server
  cannotEditReason: string | null;
  progress: { students: number; entered: number; absent: number };
  items: {
    enrollmentId: string;
    rollNumber: string | null;
    student: StudentBrief;
    group: NameRef | null;
    entered: boolean;
    isAbsent: boolean;
    parts: Record<string, number> | null;
    total: string | null;
  }[];
};

export type GridSubject = {
  examSubjectId: string;
  subject: SubjectRef;
  type: "COMPULSORY" | "OPTIONAL";
  date: string;
  // marks open from the exam day
  open: boolean;
  fullMarks: string;
  passMarks: string;
  parts: MarkPart[];
};

export type GridCell =
  | { sits: false }
  | { sits: true; entered: boolean; isAbsent: boolean; parts: Record<string, number> | null; total: string | null };

export type MarksGrid = {
  exam: NameRef;
  class: { id: string; name: string };
  section: { id: string; name: string; isDefault: boolean };
  status: "ROUTINE" | "MARKS_ENTRY" | "PUBLISHED";
  canEdit: boolean;
  cannotEditReason: string | null;
  subjects: GridSubject[];
  students: {
    enrollmentId: string;
    rollNumber: string | null;
    student: StudentBrief;
    group: NameRef | null;
    marks: Record<string, GridCell>;
  }[];
  progress: { cells: number; entered: number };
};

export type MarksProgress = {
  exam: NameRef;
  class: { id: string; name: string };
  status: "ROUTINE" | "MARKS_ENTRY" | "PUBLISHED";
  missing: number;
  complete: boolean;
  items: {
    examSubjectId: string;
    subject: SubjectRef;
    date: string;
    section: { id: string; name: string; isDefault: boolean };
    students: number;
    entered: number;
    absent: number;
    complete: boolean;
  }[];
};

export type MySheets = {
  items: {
    examSubjectId: string;
    exam: NameRef;
    class: { id: string; name: string };
    section: { id: string; name: string; isDefault: boolean };
    subject: SubjectRef;
    date: string;
    open: boolean;
  }[];
};

export const marksApi = {
  mine: async () => (await httpClient.get<ApiResponse<MySheets>>("/exam-marks/mine")).data.data,

  sheet: async (query: { examSubjectId: string; sectionId: string }) =>
    (await httpClient.get<ApiResponse<MarksSheet>>("/exam-marks/sheet", { params: query })).data.data,

  saveSheet: async (body: { examSubjectId: string; sectionId: string; marks: (MarkInput & { enrollmentId: string })[] }) =>
    (await httpClient.put<ApiResponse<MarksSheet>>("/exam-marks/sheet", body)).data.data,

  grid: async (query: { examId: string; classId: string; sectionId: string }) =>
    (await httpClient.get<ApiResponse<MarksGrid>>("/exam-marks/grid", { params: query })).data.data,

  saveGrid: async (body: {
    examId: string;
    classId: string;
    sectionId: string;
    marks: (MarkInput & { enrollmentId: string; examSubjectId: string })[];
  }) => (await httpClient.put<ApiResponse<MarksGrid>>("/exam-marks/grid", body)).data.data,

  progress: async (query: { examId: string; classId: string }) =>
    (await httpClient.get<ApiResponse<MarksProgress>>("/exam-marks/progress", { params: query })).data.data,
};

const marksKey = ["school", "marks"] as const;

export const useMySheets = () => useQuery({ queryKey: [...marksKey, "mine"], queryFn: marksApi.mine });

export const useMarksSheet = (query: { examSubjectId: string; sectionId: string } | null) =>
  useQuery({ queryKey: [...marksKey, "sheet", query], queryFn: () => marksApi.sheet(query!), enabled: !!query });

export const useMarksGrid = (query: { examId: string; classId: string; sectionId: string } | null) =>
  useQuery({ queryKey: [...marksKey, "grid", query], queryFn: () => marksApi.grid(query!), enabled: !!query });

export const useMarksProgress = (query: { examId: string; classId: string } | null) =>
  useQuery({ queryKey: [...marksKey, "progress", query], queryFn: () => marksApi.progress(query!), enabled: !!query });

const useMarksMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marksKey });
      // a class with marks can't go back to the routine stage
      queryClient.invalidateQueries({ queryKey: ["school", "exams"] });
    },
  });
};

export const useSaveMarksSheet = () => useMarksMutation(marksApi.saveSheet);
export const useSaveMarksGrid = () => useMarksMutation(marksApi.saveGrid);
