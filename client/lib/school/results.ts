"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import type { ComponentLine } from "./finalResults";

// Mirrors server/src/app/modules/exam (examResult, resultCard). Decimals arrive as strings.

type NameRef = { id: string; nameEn: string | null; nameBn: string | null };

export type ResultSummary = {
  appeared: number;
  passed: number;
  failed: number;
  passRate: number;
  grades: Record<string, number>;
  highestTotal: number | null;
  highestGpa: number | null;
};

export type ExamResultSummary = {
  exam: NameRef;
  classes: {
    class: { id: string; name: string; numericLevel: number };
    status: "ROUTINE" | "MARKS_ENTRY" | "PUBLISHED";
    publishedAt: string | null;
    summary: ResultSummary | null;
  }[];
};

export type PublishOutcome = { published: number; passed: number; failed: number; passRate: number };

export type SubjectLine = {
  subjectId: string;
  nameEn: string | null;
  nameBn: string | null;
  code: string | null;
  isOptional: boolean;
  isAbsent: boolean;
  // absent under the "left out" rule: not in the totals or GPA
  excluded: boolean;
  fullMarks: string;
  passMarks: string;
  marks: string | null;
  percentage: string;
  passed: boolean;
  grade: string | null;
  point: string | null;
  parts: { name: string; fullMarks: number; passMarks: number; marks: number | null; passed: boolean }[] | null;
  papers: { subjectId: string; nameEn: string | null; nameBn: string | null; fullMarks: number; marks: number | null; isAbsent: boolean }[] | null;
  sortOrder: number;
};

type StudentBrief = { id: string; nameEn: string; nameBn: string; admissionNo: string; photo: string | null; fatherName: string; motherName: string };

export type Tabulation = {
  exam: NameRef;
  academicYear: { id: string; name: string };
  class: { id: string; name: string };
  publishedAt: string | null;
  subjects: { subjectId: string; nameEn: string | null; nameBn: string | null; code: string | null; isOptional: boolean; sortOrder: number }[];
  summary: ResultSummary;
  students: {
    enrollmentId: string;
    student: StudentBrief;
    rollNumber: string | null;
    section: { id: string; name: string; isDefault: boolean };
    group: NameRef | null;
    totalMarks: string;
    fullMarks: string;
    percentage: string;
    gpa: string | null;
    grade: string | null;
    passed: boolean;
    failedSubjects: number;
    sectionPosition: number;
    classPosition: number;
    attendancePercent: number | null;
    subjects: Record<string, SubjectLine>;
  }[];
};

// ---------------------------------------------------------------- result cards

export type CardLayout = "CLASSIC" | "MODERN" | "COMPACT";

export type CardSettings = {
  layout: CardLayout;
  accentColor: string;
  title: string;
  showLogo: boolean;
  showAddress: boolean;
  showPhoto: boolean;
  showParents: boolean;
  showAdmissionNo: boolean;
  showCode: boolean;
  showFullMarks: boolean;
  showPassMarks: boolean;
  showParts: boolean;
  highestMarks: "NONE" | "SECTION" | "CLASS";
  showGrade: boolean;
  showPoint: boolean;
  // final result cards: a column per component (Half-yearly 30%, Annual 70%)
  showComponents: boolean;
  position: "NONE" | "SECTION" | "CLASS" | "BOTH";
  showAttendance: boolean;
  showRemarks: boolean;
  showGradingTable: boolean;
  signatures: string[];
  footerNote: string;
};

type ScaleReference = {
  id: string;
  name: string;
  maxGpa: number;
  failGrade: string;
  markBands: { minPercent: number; grade: string; point: number }[];
  gpaBands: { minGpa: number; grade: string }[];
};

export type ResultCard = {
  enrollmentId: string;
  student: StudentBrief;
  rollNumber: string | null;
  section: { id: string; name: string; isDefault: boolean };
  group: NameRef | null;
  totalMarks: string;
  fullMarks: string;
  percentage: string;
  gpa: string | null;
  grade: string | null;
  passed: boolean;
  failedSubjects: number;
  position: { section: number; sectionOutOf: number; class: number; classOutOf: number };
  attendance: { workingDays: number; present: number; absent: number; leave: number; percentage: number | null };
  remark: string | null;
  // final result cards: each component behind the subject
  subjects: (SubjectLine & { highestInSection: number | null; highestInClass: number | null; components?: ComponentLine[] })[];
};

export type ResultCards = {
  settings: CardSettings;
  school: {
    nameEn: string;
    nameBn: string;
    logo: string | null;
    address: string | null;
    phone: string | null;
    email: string;
    website: string | null;
    language: "EN" | "BN";
  } | null;
  exam: NameRef;
  academicYear: { id: string; name: string };
  class: { id: string; name: string };
  publishedAt: string | null;
  attendancePeriod: { from: string; to: string } | null;
  gradingReference: { resultSystem: "GRADED" | "MARKS_ONLY"; classScale: ScaleReference | null; subjectScales: ScaleReference[] } | null;
  // final result cards only: the formula's components, the extra columns
  components?: { id: string; nameEn: string | null; nameBn: string | null; weight: string }[];
  cards: ResultCard[];
};

export type RemarksSheet = {
  exam: NameRef;
  class: { id: string; name: string };
  section: { id: string; name: string; isDefault: boolean };
  status: "ROUTINE" | "MARKS_ENTRY" | "PUBLISHED";
  canEdit: boolean;
  students: {
    enrollmentId: string;
    rollNumber: string | null;
    student: { id: string; nameEn: string; nameBn: string; admissionNo: string };
    remark: string | null;
    result: { gpa: string | null; grade: string | null; passed: boolean; totalMarks: string; sectionPosition: number } | null;
  }[];
};

// --------------------------------------------------------------------- api

export const resultsApi = {
  summary: async (examId: string) =>
    (await httpClient.get<ApiResponse<ExamResultSummary>>("/exam-results/summary", { params: { examId } })).data.data,

  publish: async (body: { examId: string; classId: string }) =>
    (await httpClient.post<ApiResponse<PublishOutcome>>("/exam-results/publish", body)).data.data,

  unlock: async (body: { examId: string; classId: string }) =>
    (await httpClient.post<ApiResponse<unknown>>("/exam-results/unlock", body)).data.data,

  tabulation: async (query: { examId: string; classId: string; sectionId?: string; sort: "roll" | "merit" }) =>
    (await httpClient.get<ApiResponse<Tabulation>>("/exam-results/tabulation", { params: query })).data.data,

  cardSettings: async () => (await httpClient.get<ApiResponse<CardSettings>>("/exam-results/card-settings")).data.data,

  saveCardSettings: async (body: CardSettings) =>
    (await httpClient.put<ApiResponse<CardSettings>>("/exam-results/card-settings", body)).data.data,

  cards: async (query: { examId: string; classId: string; sectionId?: string; enrollmentId?: string }) =>
    (await httpClient.get<ApiResponse<ResultCards>>("/exam-results/cards", { params: query })).data.data,

  remarks: async (query: { examId: string; classId: string; sectionId: string }) =>
    (await httpClient.get<ApiResponse<RemarksSheet>>("/exam-results/remarks", { params: query })).data.data,

  saveRemarks: async (body: { examId: string; classId: string; sectionId: string; remarks: { enrollmentId: string; remark: string | null }[] }) =>
    (await httpClient.put<ApiResponse<RemarksSheet>>("/exam-results/remarks", body)).data.data,
};

// ------------------------------------------------------------------- hooks

const resultsKey = ["school", "results"] as const;

export const useResultSummary = (examId: string | undefined) =>
  useQuery({
    queryKey: [...resultsKey, "summary", examId],
    queryFn: () => resultsApi.summary(examId!),
    enabled: !!examId,
    placeholderData: keepPreviousData,
  });

export const useTabulation = (query: { examId: string; classId: string; sectionId?: string; sort: "roll" | "merit" } | null) =>
  useQuery({
    queryKey: [...resultsKey, "tabulation", query],
    queryFn: () => resultsApi.tabulation(query!),
    enabled: !!query,
    placeholderData: keepPreviousData,
  });

export const useCardSettings = () => useQuery({ queryKey: [...resultsKey, "card-settings"], queryFn: resultsApi.cardSettings });

export const useResultCards = (query: { examId: string; classId: string; sectionId?: string; enrollmentId?: string } | null) =>
  useQuery({ queryKey: [...resultsKey, "cards", query], queryFn: () => resultsApi.cards(query!), enabled: !!query });

export const useRemarks = (query: { examId: string; classId: string; sectionId: string } | null) =>
  useQuery({ queryKey: [...resultsKey, "remarks", query], queryFn: () => resultsApi.remarks(query!), enabled: !!query });

const useResultsMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resultsKey });
      // a class's stage, its marks lock and the scales' lock all change
      queryClient.invalidateQueries({ queryKey: ["school", "exams"] });
      queryClient.invalidateQueries({ queryKey: ["school", "marks"] });
      queryClient.invalidateQueries({ queryKey: ["school", "grading"] });
    },
  });
};

export const usePublishResult = () => useResultsMutation(resultsApi.publish);
export const useUnlockResult = () => useResultsMutation(resultsApi.unlock);
export const useSaveCardSettings = () => useResultsMutation(resultsApi.saveCardSettings);
export const useSaveRemarks = () => useResultsMutation(resultsApi.saveRemarks);
