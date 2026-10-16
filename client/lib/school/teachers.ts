"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import { uploadFile } from "@/lib/api/upload";

export const TEACHER_STATUSES = ["ACTIVE", "ON_LEAVE", "RESIGNED", "RETIRED"] as const;
export type TeacherStatus = (typeof TEACHER_STATUSES)[number];
export type Gender = "MALE" | "FEMALE" | "OTHER";

export type Teacher = {
  id: string;
  membershipId: string;
  // both required; shown in the current language
  nameEn: string;
  nameBn: string;
  designation: string | null;
  mpoIndex: string | null;
  joiningDate: string | null; // midnight UTC of the calendar date
  qualification: string | null;
  specialization: string | null;
  gender: Gender | null;
  photo: string | null; // a signed link to the stored photo
  nid: string | null;
  status: TeacherStatus;
  leftAt: string | null;
  membership: {
    id: string;
    status: string;
    user: { id: string; fullname: string; phone: string | null; isActive: boolean };
  };
};

export type SectionRef = { id: string; name: string; isDefault: boolean; class: { id: string; name: string; numericLevel: number } };
type NameRef = { id: string; nameEn: string | null; nameBn: string | null };

export type TeacherDetail = Teacher & {
  academicYear: { id: string; name: string } | null;
  // null when the school has no current year
  assignments: {
    classTeacherOf: SectionRef[];
    subjects: {
      id: string;
      section: SectionRef;
      classSubject: { id: string; type: string; group: NameRef | null; subject: NameRef & { code: string | null } };
    }[];
  } | null;
};

export type TeacherListQuery = { page: number; limit: number; search?: string; status?: TeacherStatus };

export type TeacherList = {
  items: Teacher[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

/** The form's fields; "" means "not given" when adding and "clear it" when editing. */
export type TeacherBody = {
  nameEn: string;
  nameBn: string;
  phone: string;
  designation: string;
  mpoIndex: string;
  joiningDate: string; // YYYY-MM-DD
  qualification: string;
  specialization: string;
  gender: Gender | "";
  nid: string;
};

export type CreateTeacherResult = {
  teacher: Teacher;
  // CREATED: a new login with a generated password (shown once); LINKED: an existing account, its password unchanged
  account: { status: "CREATED" | "LINKED"; loginPhone: string; password: string | null };
  rejoined: boolean;
};

export const teachersApi = {
  list: async (query: TeacherListQuery) =>
    (await httpClient.get<ApiResponse<TeacherList>>("/teacher", { params: query })).data.data,

  get: async (teacherId: string) =>
    (await httpClient.get<ApiResponse<TeacherDetail>>(`/teacher/${teacherId}`)).data.data,

  create: async (body: TeacherBody) =>
    (await httpClient.post<ApiResponse<CreateTeacherResult>>("/teacher", body)).data.data,

  update: async ({ teacherId, body }: { teacherId: string; body: Partial<TeacherBody> & { status?: "ACTIVE" | "ON_LEAVE" } }) =>
    (await httpClient.patch<ApiResponse<Teacher>>(`/teacher/${teacherId}`, body)).data.data,

  leave: async ({ teacherId, body }: { teacherId: string; body: { status: "RESIGNED" | "RETIRED"; leftAt?: string } }) =>
    (
      await httpClient.post<
        ApiResponse<{ teacher: Teacher; removedAsClassTeacher: number; removedSubjectAssignments: number }>
      >(`/teacher/${teacherId}/deactivate`, body)
    ).data.data,


  // the server crops it to a 400 px square
  setPhoto: ({ teacherId, file, onProgress }: { teacherId: string; file: File; onProgress?: (percent: number) => void }) =>
    uploadFile<Teacher>(`/teacher/${teacherId}/photo`, file, onProgress),

  removePhoto: async (teacherId: string) =>
    (await httpClient.delete<ApiResponse<Teacher>>(`/teacher/${teacherId}/photo`)).data.data,
};

const teachersKey = ["school", "teachers"] as const;

export const useTeachers = (query: TeacherListQuery) =>
  useQuery({
    queryKey: [...teachersKey, "list", query],
    queryFn: () => teachersApi.list(query),
    placeholderData: keepPreviousData,
  });

export const useTeacher = (teacherId: string) =>
  useQuery({ queryKey: [...teachersKey, "detail", teacherId], queryFn: () => teachersApi.get(teacherId) });

const useTeacherMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teachersKey });
      // the class-teacher picker and the sections' class teachers
      queryClient.invalidateQueries({ queryKey: ["school", "pickers", "teachers"] });
      queryClient.invalidateQueries({ queryKey: ["school", "sections"] });
    },
  });
};

export const useCreateTeacher = () => useTeacherMutation(teachersApi.create);
export const useUpdateTeacher = () => useTeacherMutation(teachersApi.update);
export const useTeacherLeaves = () => useTeacherMutation(teachersApi.leave);
export const useSetTeacherPhoto = () => useTeacherMutation(teachersApi.setPhoto);
export const useRemoveTeacherPhoto = () => useTeacherMutation(teachersApi.removePhoto);
