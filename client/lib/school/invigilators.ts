"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";

// Mirrors the invigilator part of server/src/app/modules/seatPlan. Days are "YYYY-MM-DD".

type Named = { nameEn: string | null; nameBn: string | null };

export type DutyTeacher = {
  id: string;
  nameEn: string;
  nameBn: string;
  designation: string | null;
  status: "ACTIVE" | "ON_LEAVE";
  // duties in this exam
  duties: number;
};

export type DutyRoom = {
  roomId: string;
  number: string;
  building: string | null;
  // students writing a paper in this room at this sitting
  students: number;
  teacherIds: string[];
  // teachers of a paper written here (kept away by auto-assign)
  ownSubjectTeacherIds: string[];
};

export type Sitting = {
  key: string;
  date: string;
  // "HH:mm"; "" when the routine has no time that day
  startTime: string;
  endTime: string | null;
  papers: { classId: string; className: string; subject: Named }[];
  rooms: DutyRoom[];
};

export type DutiesView = { perRoom: number; sittings: Sitting[]; teachers: DutyTeacher[]; total: number };

export type MyDuty = {
  exam: { id: string } & Named;
  date: string;
  startTime: string | null;
  room: { number: string; building: string | null };
  // the others in the same room
  with: { nameEn: string; nameBn: string }[];
};

export const dutiesApi = {
  get: async (examId: string) => (await httpClient.get<ApiResponse<DutiesView>>(`/seat-plan/exams/${examId}/duties`)).data.data,
  auto: async ({ examId, perRoom }: { examId: string; perRoom: number }) =>
    (await httpClient.post<ApiResponse<DutiesView & { missing: number }>>(`/seat-plan/exams/${examId}/duties/auto`, { perRoom })).data.data,
  set: async ({ examId, ...body }: { examId: string; date: string; startTime: string; roomId: string; teacherIds: string[] }) =>
    (await httpClient.put<ApiResponse<DutiesView>>(`/seat-plan/exams/${examId}/duties`, body)).data.data,
  clear: async (examId: string) => (await httpClient.delete<ApiResponse<DutiesView>>(`/seat-plan/exams/${examId}/duties`)).data.data,
  mine: async () => (await httpClient.get<ApiResponse<{ items: MyDuty[] }>>("/seat-plan/my-duties")).data.data,
};

const key = (examId: string | undefined) => ["school", "duties", examId] as const;

export const useDuties = (examId: string | undefined) => useQuery({ queryKey: key(examId), queryFn: () => dutiesApi.get(examId!), enabled: !!examId, retry: false });

export const useMyDuties = (enabled = true) => useQuery({ queryKey: ["school", "duties", "mine"], queryFn: dutiesApi.mine, enabled });

/* Every change returns the whole duty list: put it straight in the cache. */
const useDutyMutation = <TArgs, TResult extends DutiesView>(examIdOf: (args: TArgs) => string, mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data, args) => {
      queryClient.setQueryData(key(examIdOf(args)), data);
      void queryClient.invalidateQueries({ queryKey: ["school", "duties", "mine"] });
    },
  });
};

export const useAutoAssignDuties = () => useDutyMutation((a: { examId: string; perRoom: number }) => a.examId, dutiesApi.auto);
export const useSetDuty = () =>
  useDutyMutation((a: { examId: string; date: string; startTime: string; roomId: string; teacherIds: string[] }) => a.examId, dutiesApi.set);
export const useClearDuties = () => useDutyMutation((examId: string) => examId, dutiesApi.clear);
