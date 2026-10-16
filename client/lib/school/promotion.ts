"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import type { EnrollmentStatus, StudentStatus } from "./students";

// Mirrors server/src/app/modules/promotion. End of year: each student of a class moves up,
// repeats, graduates (the last class) or leaves.

type Section = { id: string; name: string; isDefault: boolean };

export type PromotionAction = "PROMOTE" | "REPEAT" | "GRADUATE" | "LEAVE";

export type PromotionPreview = {
  fromYear: { id: string; name: string; endDate: string };
  // null: the next academic year hasn't been made yet
  toYear: { id: string; name: string } | null;
  class: { id: string; name: string; sections: Section[] };
  // null: the last class (its students graduate)
  nextClass: { id: string; name: string; sections: Section[] } | null;
  formulas: { id: string; nameEn: string | null; nameBn: string | null; publishedAt: string | null }[];
  formulaId: string | null;
  students: {
    enrollmentId: string;
    // ACTIVE: still to decide; the others: done
    status: EnrollmentStatus;
    student: { id: string; nameEn: string; nameBn: string; admissionNo: string; status: StudentStatus };
    rollNumber: string | null;
    section: Section;
    result: { passed: boolean; gpa: string | null; grade: string | null; classPosition: number; sectionPosition: number } | null;
    next: { className: string; section: Section } | null;
  }[];
};

export type PromoteBody = {
  classId: string;
  sectionId?: string;
  students: { enrollmentId: string; action: PromotionAction; sectionId?: string }[];
};

export const promotionApi = {
  preview: async (query: { classId: string; formulaId?: string }) =>
    (await httpClient.get<ApiResponse<PromotionPreview>>("/promotion", { params: query })).data.data,
  promote: async (body: PromoteBody) =>
    (
      await httpClient.post<
        ApiResponse<{ toYear: { name: string }; promoted: number; repeated: number; graduated: number; left: number }>
      >("/promotion", body)
    ).data.data,
  undo: async (enrollmentId: string) => (await httpClient.post<ApiResponse<unknown>>(`/promotion/${enrollmentId}/undo`)).data.data,
};

const promotionKey = ["school", "promotion"] as const;

export const usePromotionPreview = (query: { classId: string; formulaId?: string } | null) =>
  useQuery({
    queryKey: [...promotionKey, query],
    queryFn: () => promotionApi.preview(query!),
    enabled: !!query,
    placeholderData: keepPreviousData,
  });

/* Moving students changes enrollments, student statuses and next year's fees. */
const usePromotionMutation = <TArgs, TResult>(mutationFn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promotionKey });
      queryClient.invalidateQueries({ queryKey: ["school", "students"] });
      queryClient.invalidateQueries({ queryKey: ["school", "classes"] });
      queryClient.invalidateQueries({ queryKey: ["school", "finance"] });
    },
  });
};

export const usePromote = () => usePromotionMutation(promotionApi.promote);
export const useUndoPromotion = () => usePromotionMutation(promotionApi.undo);
