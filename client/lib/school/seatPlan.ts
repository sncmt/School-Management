"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";

// Mirrors server/src/app/modules/seatPlan: an exam's seat plan, one seat per student for the whole exam.

export type SeatPlanStudent = {
  enrollmentId: string;
  studentId: string;
  nameEn: string;
  nameBn: string;
  admissionNo: string;
  rollNumber: string | null;
  classId: string;
  section: { id: string; name: string; isDefault: boolean };
  // false: seated, but no longer on roll (left the school): clear the seat
  onRoll: boolean;
};

export type SeatPlanRoom = {
  roomId: string;
  // the room's seats when it joined the plan
  seats: number;
  sortOrder: number;
  number: string;
  building: string | null;
  // the room as it is now
  capacity: number;
  isActive: boolean;
};

export type Seat = { roomId: string; seatNo: number; enrollmentId: string };

export type SeatPlanView = {
  exam: { id: string; nameEn: string | null; nameBn: string | null; academicYear: { id: string; name: string } };
  // the exam's classes, lowest first, with the students on roll
  classes: { id: string; name: string; numericLevel: number; students: number }[];
  suggestedGroups: string[][];
  students: SeatPlanStudent[];
  plan: {
    groups: string[][];
    generatedAt: string;
    generatedBy: string | null;
    updatedAt: string;
    rooms: SeatPlanRoom[];
    seats: Seat[];
  } | null;
};

export const seatPlanApi = {
  get: async (examId: string) => (await httpClient.get<ApiResponse<SeatPlanView>>(`/seat-plan/exams/${examId}`)).data.data,
  generate: async ({ examId, roomIds, groups }: { examId: string; roomIds: string[]; groups: string[][] }) =>
    (await httpClient.post<ApiResponse<SeatPlanView>>(`/seat-plan/exams/${examId}/generate`, { roomIds, groups })).data.data,
  remove: async (examId: string) => (await httpClient.delete<ApiResponse<SeatPlanView>>(`/seat-plan/exams/${examId}`)).data.data,
  move: async ({ examId, ...body }: { examId: string; enrollmentId: string; roomId: string; seatNo: number }) =>
    (await httpClient.post<ApiResponse<SeatPlanView>>(`/seat-plan/exams/${examId}/move`, body)).data.data,
  clear: async ({ examId, enrollmentId }: { examId: string; enrollmentId: string }) =>
    (await httpClient.delete<ApiResponse<SeatPlanView>>(`/seat-plan/exams/${examId}/seats/${enrollmentId}`)).data.data,
  fill: async (examId: string) =>
    (await httpClient.post<ApiResponse<SeatPlanView & { placed: number; left: number }>>(`/seat-plan/exams/${examId}/fill`)).data.data,
  addRoom: async ({ examId, roomId }: { examId: string; roomId: string }) =>
    (await httpClient.post<ApiResponse<SeatPlanView>>(`/seat-plan/exams/${examId}/rooms`, { roomId })).data.data,
  removeRoom: async ({ examId, roomId }: { examId: string; roomId: string }) =>
    (await httpClient.delete<ApiResponse<SeatPlanView>>(`/seat-plan/exams/${examId}/rooms/${roomId}`)).data.data,
};

const key = (examId: string | undefined) => ["school", "seatPlan", examId] as const;

export const useSeatPlan = (examId: string | undefined) => useQuery({ queryKey: key(examId), queryFn: () => seatPlanApi.get(examId!), enabled: !!examId });

/* Every change returns the whole plan: put it straight in the cache. */
const usePlanMutation = <TArgs extends { examId: string } | string, TResult extends SeatPlanView>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data) => queryClient.setQueryData(key(data.exam.id), data),
  });
};

export const useGenerateSeatPlan = () => usePlanMutation(seatPlanApi.generate);
export const useDeleteSeatPlan = () => usePlanMutation(seatPlanApi.remove);
export const useMoveSeat = () => usePlanMutation(seatPlanApi.move);
export const useClearSeat = () => usePlanMutation(seatPlanApi.clear);
export const useFillSeats = () => usePlanMutation(seatPlanApi.fill);
export const useAddPlanRoom = () => usePlanMutation(seatPlanApi.addRoom);
export const useRemovePlanRoom = () => usePlanMutation(seatPlanApi.removeRoom);
