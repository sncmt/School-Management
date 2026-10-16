"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";

// Mirrors server/src/app/modules/exam. Each class of an exam moves through
// ROUTINE -> MARKS_ENTRY -> PUBLISHED on its own. Prisma Decimals arrive as strings.

export type ExamType = "SINGLE" | "MULTIPLE";
export type ExamClassStatus = "ROUTINE" | "MARKS_ENTRY" | "PUBLISHED";

type NameRef = { id: string; nameEn: string | null; nameBn: string | null };

export type ExamClass = {
  id: string;
  status: ExamClassStatus;
  date: string | null; // one-day exams: the exam day
  publishedAt: string | null;
  class: { id: string; name: string; numericLevel: number };
  _count: { subjects: number };
  // from the detail endpoint only: the first and last exam day ("YYYY-MM-DD")
  firstDay?: string | null;
  lastDay?: string | null;
};

export type Exam = {
  id: string;
  academicYearId: string;
  nameEn: string | null;
  nameBn: string | null;
  // SINGLE: every subject on one day (a monthly test); MULTIPLE: a day per subject
  type: ExamType;
  // the attendance shown on the result sheet; null = year start to the last exam day
  attendanceFrom: string | null;
  attendanceTo: string | null;
  academicYear: { id: string; name: string };
  classes: ExamClass[];
};

export type ExamList = { academicYear: { id: string; name: string }; items: Exam[] };

export type CreateExamBody = {
  nameEn: string | null;
  nameBn: string | null;
  type: ExamType;
  allClasses: boolean;
  classIds: string[];
  attendanceFrom?: string;
  attendanceTo?: string;
};

export type UpdateExamBody = {
  nameEn?: string | null;
  nameBn?: string | null;
  attendanceFrom?: string | null;
  attendanceTo?: string | null;
};

type MarksPart = { name: string; fullMarks: string; passMarks: string };

export type RoutineSubject = {
  id: string;
  classSubjectId: string;
  date: string; // YYYY-MM-DD
  startTime: string | null;
  endTime: string | null;
  fullMarks: string;
  passMarks: string;
  parts: MarksPart[];
  classSubject: {
    id: string;
    type: "COMPULSORY" | "OPTIONAL";
    sortOrder: number;
    group: NameRef | null;
    subject: NameRef & { code: string | null; religion: string | null; parentId: string | null };
  };
};

export type ClassSubjectOption = {
  id: string;
  type: "COMPULSORY" | "OPTIONAL";
  // its marks setup; null = not set yet
  fullMarks: string | null;
  passMarks: string | null;
  parts: MarksPart[];
  group: NameRef | null;
  subject: NameRef & { code: string | null; religion: string | null };
};

export type ExamRoutine = {
  exam: { id: string; type: ExamType; nameEn: string | null; nameBn: string | null; academicYearId: string };
  class: { id: string; name: string; numericLevel: number };
  status: ExamClassStatus;
  date: string | null;
  subjects: RoutineSubject[];
  // class subjects not in the routine yet
  notInRoutine: ClassSubjectOption[];
};

export type RoutineBody = {
  // one-day exams only
  date?: string;
  subjects: {
    classSubjectId: string;
    // multi-day exams only
    date?: string;
    startTime?: string;
    endTime?: string;
    // left out: the subject's marks setup (or what the routine already has)
    fullMarks?: number;
    passMarks?: number;
    parts?: { name: string; fullMarks: number; passMarks: number }[];
  }[];
};

export type OptionalChoices = {
  academicYear: { id: string; name: string };
  class: { id: string; name: string };
  options: { id: string; groupId: string | null; group: NameRef | null; subject: NameRef & { code: string | null } }[];
  hasOptionalSubjects: boolean;
  missingChoices: number;
  students: {
    enrollmentId: string;
    student: { id: string; nameEn: string; nameBn: string; admissionNo: string };
    section: { id: string; name: string; isDefault: boolean };
    group: NameRef | null;
    rollNumber: string | null;
    choice: string | null;
    // the optional subjects open to this student's group
    available: string[];
  }[];
};

// --------------------------------------------------------------------- api

export const examsApi = {
  list: async (academicYearId?: string) =>
    (await httpClient.get<ApiResponse<ExamList>>("/exam", { params: { academicYearId } })).data.data,

  get: async (examId: string) => (await httpClient.get<ApiResponse<Exam>>(`/exam/${examId}`)).data.data,

  create: async (body: CreateExamBody) => (await httpClient.post<ApiResponse<Exam>>("/exam", body)).data.data,

  update: async ({ examId, body }: { examId: string; body: UpdateExamBody }) =>
    (await httpClient.patch<ApiResponse<Exam>>(`/exam/${examId}`, body)).data.data,

  remove: async (examId: string) => {
    await httpClient.delete(`/exam/${examId}`);
  },

  addClasses: async ({ examId, classIds }: { examId: string; classIds: string[] }) =>
    (await httpClient.post<ApiResponse<Exam>>(`/exam/${examId}/classes`, { classIds })).data.data,

  removeClass: async ({ examId, classId }: { examId: string; classId: string }) => {
    await httpClient.delete(`/exam/${examId}/classes/${classId}`);
  },

  routine: async ({ examId, classId }: { examId: string; classId: string }) =>
    (await httpClient.get<ApiResponse<ExamRoutine>>(`/exam/${examId}/classes/${classId}/routine`)).data.data,

  // the subjects listed become the routine
  setRoutine: async ({ examId, classId, body }: { examId: string; classId: string; body: RoutineBody }) =>
    (await httpClient.put<ApiResponse<ExamRoutine>>(`/exam/${examId}/classes/${classId}/routine`, body)).data.data,

  setStatus: async ({ examId, classId, status }: { examId: string; classId: string; status: "ROUTINE" | "MARKS_ENTRY" }) =>
    (await httpClient.post<ApiResponse<ExamRoutine>>(`/exam/${examId}/classes/${classId}/status`, { status })).data.data,

  optionalChoices: async (query: { classId: string; sectionId?: string }) =>
    (await httpClient.get<ApiResponse<OptionalChoices>>("/optional-subject", { params: query })).data.data,

  // null removes a student's choice
  setOptionalChoices: async (choices: { enrollmentId: string; classSubjectId: string | null }[]) =>
    (await httpClient.put<ApiResponse<{ saved: number }>>("/optional-subject", { choices })).data.data,
};

// ------------------------------------------------------------------- hooks

const examsKey = ["school", "exams"] as const;

export const useExams = (academicYearId?: string) =>
  useQuery({
    queryKey: [...examsKey, "list", academicYearId],
    queryFn: () => examsApi.list(academicYearId),
    placeholderData: keepPreviousData,
  });

export const useExam = (examId: string | undefined) =>
  useQuery({ queryKey: [...examsKey, "detail", examId], queryFn: () => examsApi.get(examId!), enabled: !!examId });

export const useExamRoutine = (query: { examId: string; classId: string } | null) =>
  useQuery({
    queryKey: [...examsKey, "routine", query],
    queryFn: () => examsApi.routine(query!),
    enabled: !!query,
  });

export const useOptionalChoices = (query: { classId: string | undefined; sectionId?: string }) =>
  useQuery({
    queryKey: [...examsKey, "optional", query],
    queryFn: () => examsApi.optionalChoices({ classId: query.classId!, sectionId: query.sectionId }),
    enabled: !!query.classId,
  });

const useExamMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: examsKey }) });
};

export const useCreateExam = () => useExamMutation(examsApi.create);
export const useUpdateExam = () => useExamMutation(examsApi.update);
export const useDeleteExam = () => useExamMutation(examsApi.remove);
export const useAddExamClasses = () => useExamMutation(examsApi.addClasses);
export const useRemoveExamClass = () => useExamMutation(examsApi.removeClass);
export const useSetExamRoutine = () => useExamMutation(examsApi.setRoutine);
export const useSetExamClassStatus = () => useExamMutation(examsApi.setStatus);
export const useSetOptionalChoices = () => useExamMutation(examsApi.setOptionalChoices);
