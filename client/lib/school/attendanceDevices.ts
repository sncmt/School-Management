"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";

// Mirrors server/src/app/modules/attendanceDevice (the school's side; devices talk to /iclock).

export type AttendanceDevice = {
  id: string;
  serialNumber: string;
  name: string;
  location: string | null;
  isActive: boolean;
  model: string | null;
  firmware: string | null;
  lastSeenAt: string | null;
  lastIp: string | null;
  // heard from in the last two minutes
  online: boolean;
  punchesToday: number;
  // commands (people, cards, fingerprints) the device has still to take
  pending: number;
  createdAt: string;
};

export type PersonKind = "student" | "teacher";

export type DevicePersonRow = {
  kind: PersonKind;
  // the student's or teacher's id
  id: string;
  nameEn: string;
  nameBn: string;
  // class · section · #roll, or the teacher's post
  info: string | null;
  admissionNo?: string;
  // null until the person has a device number
  person: { pin: string; cardNumber: string | null; fingerprints: number } | null;
};

export type PeopleQuery = { kind: PersonKind; classId?: string; sectionId?: string; search?: string };

// what the school types into the device's "cloud server" settings; null until the server is set up
export type DeviceServer = { host: string | null; port: number | null };

export type DeviceList = { server: DeviceServer; items: AttendanceDevice[] };

export type DevicePunch = {
  id: string;
  // the person's number on the device
  pin: string;
  punchedAt: string;
  status: number | null;
  // how the person was verified: 0 password, 1 finger, 4 card, 15 face (device codes)
  verifyType: number | null;
  processedAt: string | null;
  // what it became: STUDENT_IN / _LATE / _OUT / _REPEAT, TEACHER_…, UNKNOWN_PERSON, DAY_OFF, NOT_ON_ROLL…
  outcome: string | null;
  device: { id: string; name: string };
  person: { kind: PersonKind; id: string; nameEn: string; nameBn: string; info: string | null } | null;
};

export type PunchesToday = { studentsIn: number; studentsLate: number; studentsAbsent: number; teachersIn: number; teachersLate: number };

export type DeviceRules = {
  lateAfterMinutes: number;
  // "HH:mm"; null: never marked absent by the device
  studentAbsentAt: string | null;
  teacherStartTime: string;
  teacherLateAfterMinutes: number;
  teacherAbsentAt: string | null;
  checkoutGapMinutes: number;
};

export type DeviceBody = { serialNumber: string; name: string; location: string | null };

export const devicesApi = {
  list: async () => (await httpClient.get<ApiResponse<DeviceList>>("/attendance-device")).data.data,
  punches: async (params: { deviceId?: string; limit?: number }) =>
    (await httpClient.get<ApiResponse<{ today: PunchesToday; items: DevicePunch[] }>>("/attendance-device/punches", { params })).data.data,
  rules: async () => (await httpClient.get<ApiResponse<DeviceRules>>("/attendance-device/rules")).data.data,
  saveRules: async (body: DeviceRules) => (await httpClient.put<ApiResponse<DeviceRules>>("/attendance-device/rules", body)).data.data,
  create: async (body: DeviceBody) => (await httpClient.post<ApiResponse<AttendanceDevice>>("/attendance-device", body)).data.data,
  update: async ({ deviceId, body }: { deviceId: string; body: Partial<Omit<DeviceBody, "serialNumber">> & { isActive?: boolean } }) =>
    (await httpClient.patch<ApiResponse<AttendanceDevice>>(`/attendance-device/${deviceId}`, body)).data.data,
  remove: async (deviceId: string) => {
    await httpClient.delete(`/attendance-device/${deviceId}`);
  },
  people: async (params: PeopleQuery) => (await httpClient.get<ApiResponse<{ items: DevicePersonRow[] }>>("/attendance-device/people", { params })).data.data,
  assign: async () => (await httpClient.post<ApiResponse<{ assigned: number; queued: number }>>("/attendance-device/people/assign")).data.data,
  setCard: async ({ kind, id, cardNumber }: { kind: PersonKind; id: string; cardNumber: string | null }) =>
    (await httpClient.put<ApiResponse<{ pin: string; cardNumber: string | null }>>(`/attendance-device/people/${kind}/${id}/card`, { cardNumber })).data.data,
  sync: async (deviceId: string) => (await httpClient.post<ApiResponse<{ queued: number }>>(`/attendance-device/${deviceId}/sync`)).data.data,
};

const key = ["school", "attendanceDevices"] as const;

// devices report every few seconds: keep the page fresh while it is open
export const useDevices = () => useQuery({ queryKey: [...key, "list"], queryFn: devicesApi.list, refetchInterval: 30_000 });
export const useDevicePunches = (deviceId?: string) =>
  useQuery({ queryKey: [...key, "punches", deviceId], queryFn: () => devicesApi.punches({ deviceId, limit: 50 }), refetchInterval: 15_000 });

const useDeviceMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: key }) });
};

export const useDevicePeople = (query: PeopleQuery, enabled = true) =>
  useQuery({ queryKey: [...key, "people", query], queryFn: () => devicesApi.people(query), enabled });

export const useDeviceRules = () => useQuery({ queryKey: [...key, "rules"], queryFn: devicesApi.rules });
export const useSaveDeviceRules = () => useDeviceMutation(devicesApi.saveRules);
export const useAssignNumbers = () => useDeviceMutation(devicesApi.assign);
export const useSetCard = () => useDeviceMutation(devicesApi.setCard);
export const useSyncDevice = () => useDeviceMutation(devicesApi.sync);
export const useCreateDevice = () => useDeviceMutation(devicesApi.create);
export const useUpdateDevice = () => useDeviceMutation(devicesApi.update);
export const useDeleteDevice = () => useDeviceMutation(devicesApi.remove);

export const VERIFY_KINDS: Record<number, "password" | "finger" | "card" | "face" | "palm"> = { 0: "password", 1: "finger", 4: "card", 15: "face", 25: "palm" };
