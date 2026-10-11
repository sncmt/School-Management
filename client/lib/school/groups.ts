"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import type { NamesOutput } from "@/zod/names";

export type Group = {
  id: string;
  nameEn: string | null;
  nameBn: string | null;
  // in the listed year; null when the school has no current year
  yearInfo: { activeStudents: number; subjects: number } | null;
};

export type GroupList = {
  academicYear: { id: string; name: string } | null;
  items: Group[];
};

export const groupsApi = {
  list: async () => (await httpClient.get<ApiResponse<GroupList>>("/group")).data.data,

  create: async (body: NamesOutput) => (await httpClient.post<ApiResponse<Group>>("/group", body)).data.data,

  // null clears a name (not the school's language: the server refuses that)
  update: async ({ groupId, body }: { groupId: string; body: NamesOutput }) =>
    (await httpClient.patch<ApiResponse<Group>>(`/group/${groupId}`, body)).data.data,

  remove: async (groupId: string) => {
    await httpClient.delete(`/group/${groupId}`);
  },
};

const groupsKey = ["school", "groups"] as const;

export const useGroups = () => useQuery({ queryKey: groupsKey, queryFn: groupsApi.list });

const useGroupMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupsKey }),
  });
};

export const useCreateGroup = () => useGroupMutation(groupsApi.create);
export const useUpdateGroup = () => useGroupMutation(groupsApi.update);
export const useDeleteGroup = () => useGroupMutation(groupsApi.remove);
