"use client";

import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/api/httpClient";
import type { ApiResponse } from "@/lib/api/types";
import type { UpcomingHoliday } from "@/components/school/dashboard/panels";
import { useSchoolMe } from "@/lib/auth/hooks";
import type { FamilyHomeworkItem } from "./homework";

// Mirrors server/src/app/modules/family: the family login's own children. Money is "1234.50".

export type AttendanceMark = "PRESENT" | "LATE" | "ABSENT" | "LEAVE";

export type FamilyChild = {
  id: string;
  nameEn: string;
  nameBn: string;
  admissionNo: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  photo: string | null;
  status: "ACTIVE" | "INACTIVE" | "GRADUATED" | "SUSPENDED";
  // this year's class (else next year's, else the latest); null before any
  enrollment: {
    id: string;
    status: string;
    rollNumber: string | null;
    academicYear: { id: string; name: string; isCurrent: boolean };
    class: { id: string; name: string };
    section: { id: string; name: string; isDefault: boolean };
    group: { id: string; nameEn: string | null; nameBn: string | null } | null;
  } | null;
  attendance: {
    // null: no roll call for the child today (yet)
    today: { status: AttendanceMark; checkInAt: string | null } | null;
    month: { present: number; late: number; absent: number; leave: number };
  };
  // homework due from today, soonest first (the first few) and how many in all
  homework: { total: number; items: FamilyHomeworkItem[] };
  // owed now: one-time fees and started months, earlier years too
  dues: {
    total: string;
    fees: {
      id: string;
      month: number | null;
      year: number | null;
      description: string | null;
      due: string;
      feeType: { nameEn: string | null; nameBn: string | null };
      academicYear: { id: string; name: string };
    }[];
  };
};

export type FamilyHome = {
  today: string;
  academicYear: { id: string; name: string } | null;
  children: FamilyChild[];
  upcoming: UpcomingHoliday[];
};

// the family login's role (a built-in role: schools can't make one with this name)
const GUARDIAN_ROLE = "GUARDIAN";

/**
 * Whether this login is a family's, staff's, or both (a teacher who is also a parent here).
 * Someone with no school role at all (the platform owner) counts as staff.
 */
export const useFamilyRole = () => {
  const me = useSchoolMe();
  const isFamily = !!me?.roles.some((r) => r.name === GUARDIAN_ROLE);
  const isStaff = !!me && (me.isSuperAdmin || me.roles.some((r) => r.name !== GUARDIAN_ROLE) || !isFamily);
  return { ready: !!me, isFamily, isStaff, familyOnly: isFamily && !isStaff };
};

export const useFamilyHome = (enabled = true) =>
  useQuery({
    queryKey: ["school", "family"],
    queryFn: async () => (await httpClient.get<ApiResponse<FamilyHome>>("/family")).data.data,
    enabled,
    refetchInterval: 5 * 60_000,
  });
