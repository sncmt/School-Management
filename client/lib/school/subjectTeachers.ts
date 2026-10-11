"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";

export type SubjectTeacherAssignment = {
  id: string;
  section: { id: string; name: string; isDefault: boolean; class: { id: string; name: string; numericLevel: number } };
  classSubject: { id: string; type: string; sortOrder: number };
  teacher: {
    id: string;
    nameEn: string;
    nameBn: string;
    designation: string | null;
    status: "ACTIVE" | "ON_LEAVE" | "RESIGNED" | "RETIRED";
    membership: { user: { id: string; fullname: string; phone: string | null } };
  };
};

export type SubjectTeacherList = {
  academicYear: { id: string; name: string };
  items: SubjectTeacherAssignment[];
};

export const subjectTeachersApi = {
  // every assignment of one class in the current year
  list: async (classId: string) =>
    (await httpClient.get<ApiResponse<SubjectTeacherList>>("/subject-teacher", { params: { classId } })).data.data,

  // replaces the teachers of one subject in one section (an empty list removes them)
  set: async (body: { sectionId: string; classSubjectId: string; teacherIds: string[] }) =>
    (await httpClient.put<ApiResponse<SubjectTeacherAssignment[]>>("/subject-teacher", body)).data.data,
};

const subjectTeachersKey = ["school", "subject-teachers"] as const;

export const useSubjectTeachers = (classId: string | null) =>
  useQuery({
    queryKey: [...subjectTeachersKey, classId],
    queryFn: () => subjectTeachersApi.list(classId!),
    enabled: !!classId,
  });

export const useSetSubjectTeachers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subjectTeachersApi.set,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subjectTeachersKey });
      // a teacher's page lists what they teach
      queryClient.invalidateQueries({ queryKey: ["school", "teachers"] });
    },
  });
};
