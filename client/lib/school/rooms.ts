"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";

// Mirrors server/src/app/modules/room: the school's rooms, by number, with their seats.

export type Room = {
  id: string;
  number: string;
  building: string | null;
  capacity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// sorted by number ("2" before "10"); the totals count active rooms only
export type RoomList = { items: Room[]; activeRooms: number; activeSeats: number };

export type RoomBody = { number: string; building: string | null; capacity: number };
export type RoomsBody = { prefix: string; from: number; to: number; building: string | null; capacity: number };

export const roomsApi = {
  list: async (includeInactive: boolean) =>
    (await httpClient.get<ApiResponse<RoomList>>("/room", { params: includeInactive ? { includeInactive: "true" } : {} })).data.data,
  create: async (body: RoomBody) => (await httpClient.post<ApiResponse<Room>>("/room", body)).data.data,
  createMany: async (body: RoomsBody) =>
    (await httpClient.post<ApiResponse<{ created: string[]; skipped: string[] }>>("/room/bulk", body)).data.data,
  update: async ({ roomId, body }: { roomId: string; body: Partial<RoomBody> & { isActive?: boolean } }) =>
    (await httpClient.patch<ApiResponse<Room>>(`/room/${roomId}`, body)).data.data,
  remove: async (roomId: string) => {
    await httpClient.delete(`/room/${roomId}`);
  },
};

const roomsKey = ["school", "rooms"] as const;

export const useRooms = (includeInactive = false) =>
  useQuery({ queryKey: [...roomsKey, { includeInactive }], queryFn: () => roomsApi.list(includeInactive) });

const useRoomMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: roomsKey }) });
};

export const useCreateRoom = () => useRoomMutation(roomsApi.create);
export const useCreateRooms = () => useRoomMutation(roomsApi.createMany);
export const useUpdateRoom = () => useRoomMutation(roomsApi.update);
export const useDeleteRoom = () => useRoomMutation(roomsApi.remove);
