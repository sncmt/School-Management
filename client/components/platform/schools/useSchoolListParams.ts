"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { SCHOOL_STATUSES, type SchoolListQuery, type SchoolStatus } from "@/lib/platform/schools";

export const SCHOOL_SORTS = {
  newest: { sortBy: "createdAt", sortOrder: "desc" },
  oldest: { sortBy: "createdAt", sortOrder: "asc" },
  nameAsc: { sortBy: "nameEn", sortOrder: "asc" },
  nameDesc: { sortBy: "nameEn", sortOrder: "desc" },
} as const satisfies Record<string, Pick<SchoolListQuery, "sortBy" | "sortOrder">>;

export type SchoolSort = keyof typeof SCHOOL_SORTS;

export const PAGE_SIZES = [10, 20, 50];

const DEFAULTS = { page: 1, limit: 10, sort: "newest" as SchoolSort };

type ParamChanges = Partial<{
  page: number;
  limit: number;
  search: string;
  status: SchoolStatus | undefined;
  sort: SchoolSort;
}>;

/*
 * The school list's page, filters and sort, kept in the URL
 * (?page=2&status=ACTIVE&search=abc) so they survive a refresh and the back
 * button. Defaults are left out of the URL; anything invalid falls back to them.
 */
export function useSchoolListParams() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const values = useMemo(() => {
    const page = Number(searchParams.get("page"));
    const limit = Number(searchParams.get("limit"));
    const status = searchParams.get("status") as SchoolStatus | null;
    const sort = searchParams.get("sort") as SchoolSort | null;

    return {
      page: Number.isInteger(page) && page > 0 ? page : DEFAULTS.page,
      limit: PAGE_SIZES.includes(limit) ? limit : DEFAULTS.limit,
      search: searchParams.get("search")?.trim() ?? "",
      status: status && SCHOOL_STATUSES.includes(status) ? status : undefined,
      sort: sort && sort in SCHOOL_SORTS ? sort : DEFAULTS.sort,
    };
  }, [searchParams]);

  const query: SchoolListQuery = useMemo(
    () => ({
      page: values.page,
      limit: values.limit,
      search: values.search || undefined,
      status: values.status,
      ...SCHOOL_SORTS[values.sort],
    }),
    [values],
  );

  const update = useCallback(
    (changes: ParamChanges) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(changes)) {
        const isDefault = value === undefined || value === "" || DEFAULTS[key as keyof typeof DEFAULTS] === value;
        if (isDefault) next.delete(key);
        else next.set(key, String(value));
      }
      const qs = next.toString();
      // the browser path (/schools), not the app folder path middleware rewrites to
      router.replace(`${window.location.pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, searchParams],
  );

  const hasFilters = !!values.search || !!values.status;

  return { ...values, query, update, hasFilters };
}
