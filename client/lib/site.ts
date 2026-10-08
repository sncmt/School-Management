import { cache } from "react";

/*
 * Server only: a school's public details (name, logo, language), for its
 * login page, its default language and "school not found". Cached for a
 * minute, so a language change in the school's settings shows within 60s.
 */

export type SchoolSite = {
  nameEn: string;
  nameBn: string | null;
  subdomain: string;
  language: "EN" | "BN";
  logo: string | null;
  favicon: string | null;
};

const API_URL = process.env.API_URL ?? "http://localhost:5000";

/** The active school on this subdomain, or null if there is none. */
export const getSchoolSite = cache(async (subdomain: string): Promise<SchoolSite | null> => {
  const res = await fetch(`${API_URL}/api/v1/school/site/${encodeURIComponent(subdomain)}`, {
    next: { revalidate: 60 },
  });

  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`Loading school "${subdomain}" failed with ${res.status}`);

  return ((await res.json()) as { data: SchoolSite }).data;
});
