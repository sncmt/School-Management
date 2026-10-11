"use client";

import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";

/*
 * Short read-only lists for pickers in other modules' forms. The full teacher and
 * routine modules come later; these only load what a picker shows.
 */

export type TeacherOption = {
  id: string;
  membershipId: string;
  nameEn: string;
  nameBn: string;
  designation: string | null;
  status: "ACTIVE" | "ON_LEAVE" | "RESIGNED" | "RETIRED";
  membership: { user: { fullname: string; phone: string | null } };
};

export type PeriodTemplateOption = { id: string; nameEn: string | null; nameBn: string | null };

/** Teachers who can take a duty (working or on leave). Needs teacher:view. */
export const useWorkingTeachers = (enabled = true) =>
  useQuery({
    queryKey: ["school", "pickers", "teachers"],
    queryFn: async () => {
      const { data } = await httpClient.get<ApiResponse<{ items: TeacherOption[] }>>("/teacher", {
        params: { limit: 100 },
      });
      return data.data.items.filter((t) => t.status === "ACTIVE" || t.status === "ON_LEAVE");
    },
    enabled,
  });

/** The school's bell schedules. Needs routine:view. */
export const usePeriodTemplates = (enabled = true) =>
  useQuery({
    queryKey: ["school", "pickers", "period-templates"],
    queryFn: async () =>
      (await httpClient.get<ApiResponse<PeriodTemplateOption[]>>("/routine/templates")).data.data,
    enabled,
  });
