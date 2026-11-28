"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import type { AcademicTrack } from "@/lib/school/academicYears";

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
  // the class's own name for the exam ("Test exam" for class 10); both null = the exam's name
  nameEn: string | null;
  nameBn: string | null;
  // the class's final exam of the year: its result is the year's result (promotion reads it)
  isFinal: boolean;
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
  // track: school or college (its classes are that track's)
  academicYear: { id: string; name: string; track?: AcademicTrack };
  classes: ExamClass[];
};

// no year and no track asked: the exams of every track's current year (academicYear: the main track's)
export type ExamList = { academicYear: { id: string; name: string; track?: AcademicTrack }; items: Exam[] };

export type CreateExamBody = {
  // left out: the current year (of the classes' track)
  academicYearId?: string;
  nameEn: string | null;
  nameBn: string | null;
  type: ExamType;
  allClasses: boolean;
  classIds: string[];
  attendanceFrom?: string;
  attendanceTo?: string;
  // the final exam of the year for all its classes
  isFinal?: boolean;
};

export type UpdateExamBody = {
  nameEn?: string | null;
  nameBn?: string | null;
  attendanceFrom?: string | null;
  attendanceTo?: string | null;
  // the final exam (or not) for all its classes
  isFinal?: boolean;
};

// one class of an exam: both names together (null both = the exam's name), and the final mark
export type UpdateExamClassBody = { nameEn?: string | null; nameBn?: string | null; isFinal?: boolean };

// a class whose final mark moved to this exam, from its other exam of the year
export type FinalMoved = { classId: string; className: string; exam: NameRef }[];

/** The exam's name in one class: the class's own pair if it has one, else the exam's. */
export const classExamName = (exam: { nameEn: string | null; nameBn: string | null }, c: { nameEn: string | null; nameBn: string | null }) =>
  c.nameEn || c.nameBn ? { nameEn: c.nameEn, nameBn: c.nameBn } : { nameEn: exam.nameEn, nameBn: exam.nameBn };

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

type ChoiceSubject = {
  id: string;
  type: "OPTIONAL" | "ELECTIVE";
  groupId: string | null;
  sortOrder: number;
  group: NameRef | null;
  subject: NameRef & { code: string | null };
};

export type OptionalChoices = {
  academicYear: { id: string; name: string };
  class: { id: string; name: string };
  // the fixed 4th subjects, and the "main or 4th" ones (Biology / Higher Math)
  options: ChoiceSubject[];
  electives: ChoiceSubject[];
  // how many "main or 4th" subjects a group takes as main (none listed: 1)
  electiveRules: { groupId: string | null; mainCount: number }[];
  hasOptionalSubjects: boolean;
  missingChoices: number;
  missingMains: number;
  students: {
    enrollmentId: string;
    student: { id: string; nameEn: string; nameBn: string; admissionNo: string };
    section: { id: string; name: string; isDefault: boolean };
    group: NameRef | null;
    rollNumber: string | null;
    // the 4th subject
    choice: string | null;
    // the 4th list as the saved mains are (the client works it out again as mains change)
    available: string[];
    // the main subjects among the "main or 4th" ones, what they pick from, and how many
    mains: string[];
    availableMains: string[];
    mainCount: number;
  }[];
};

// mainIds: the whole set ([] clears); left out = as it is. classSubjectId: the 4th; left out = as it is
export type SubjectChoiceBody = { enrollmentId: string; classSubjectId?: string | null; mainIds?: string[] };

// --------------------------------------------------------------------- api

export const examsApi = {
  list: async (academicYearId?: string, track?: AcademicTrack) =>
    (await httpClient.get<ApiResponse<ExamList>>("/exam", { params: { academicYearId, track } })).data.data,

  get: async (examId: string) => (await httpClient.get<ApiResponse<Exam>>(`/exam/${examId}`)).data.data,

  create: async (body: CreateExamBody) =>
    (await httpClient.post<ApiResponse<Exam & { movedFrom: FinalMoved }>>("/exam", body)).data.data,

  update: async ({ examId, body }: { examId: string; body: UpdateExamBody }) =>
    (await httpClient.patch<ApiResponse<Exam & { movedFrom: FinalMoved }>>(`/exam/${examId}`, body)).data.data,

  updateClass: async ({ examId, classId, body }: { examId: string; classId: string; body: UpdateExamClassBody }) =>
    (
      await httpClient.patch<
        ApiResponse<{ id: string; nameEn: string | null; nameBn: string | null; isFinal: boolean; name: { nameEn: string | null; nameBn: string | null }; movedFrom: FinalMoved }>
      >(`/exam/${examId}/classes/${classId}`, body)
    ).data.data,

  // an exam with marks also needs the reason and its name typed (the super admin only)
  remove: async ({ examId, reason, confirmName }: { examId: string } & ExamDeleteInput) => {
    await httpClient.delete(`/exam/${examId}`, { params: { reason, confirmName } });
  },

  addClasses: async ({ examId, classIds }: { examId: string; classIds: string[] }) =>
    (await httpClient.post<ApiResponse<Exam>>(`/exam/${examId}/classes`, { classIds })).data.data,

  removeClass: async ({ examId, classId, reason, confirmName }: { examId: string; classId: string } & ExamDeleteInput) => {
    await httpClient.delete(`/exam/${examId}/classes/${classId}`, { params: { reason, confirmName } });
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
  setOptionalChoices: async (choices: SubjectChoiceBody[]) =>
    (await httpClient.put<ApiResponse<{ saved: number; clearedFourths: number }>>("/optional-subject", { choices })).data.data,
};

// ------------------------------------------------------------------- hooks

export type ExamDeleteInput = { reason?: string; confirmName?: string };

const examsKey = ["school", "exams"] as const;

export const useExams = (academicYearId?: string, options?: { enabled?: boolean; track?: AcademicTrack }) =>
  useQuery({
    queryKey: [...examsKey, "list", academicYearId, options?.track],
    queryFn: () => examsApi.list(academicYearId, options?.track),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
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

/* A class's exam name or final mark shows on results, marks, cards and promotion too: all school data is refreshed. */
const useExamNameMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["school"] }) });
};

export const useCreateExam = () => useExamMutation(examsApi.create);
export const useUpdateExam = () => useExamNameMutation(examsApi.update);
export const useUpdateExamClass = () => useExamNameMutation(examsApi.updateClass);
export const useDeleteExam = () => useExamMutation(examsApi.remove);
export const useAddExamClasses = () => useExamMutation(examsApi.addClasses);
export const useRemoveExamClass = () => useExamMutation(examsApi.removeClass);
export const useSetExamRoutine = () => useExamMutation(examsApi.setRoutine);
export const useSetExamClassStatus = () => useExamMutation(examsApi.setStatus);
export const useSetOptionalChoices = () => useExamMutation(examsApi.setOptionalChoices);
