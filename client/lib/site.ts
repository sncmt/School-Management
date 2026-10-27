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
  // the school's accent and sidebar colours (lib/theme/accents.ts); null = the defaults
  accentColor: string | null;
  sidebarColor: string | null;
  // for the public homepage's contacts: the school's public email, or else its super admin's email
  publicEmail: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  // the homepage's image slider, in order (signed links)
  slides: { id: string; image: string; caption: string | null }[];
  // the homepage's admission section; all empty = no section
  admission: Admission;
};

export type Admission = {
  requirements: string[];
  dates: { label: string; value: string }[];
  // whole taka
  fees: { label: string; amount: number }[];
};

export const hasAdmission = (a: Admission) => a.requirements.length + a.dates.length + a.fees.length > 0;

const API_URL = process.env.API_URL ?? "http://localhost:5000";

/** The active school on this subdomain, or null if there is none. */
export const getSchoolSite = cache(async (subdomain: string): Promise<SchoolSite | null> => {
  // never cached: its picture links are signed and expire within two hours, and a cached copy is
  // served however old it is (refreshed only behind it), so a quiet site would show dead pictures
  const res = await fetch(`${API_URL}/api/v1/school/site/${encodeURIComponent(subdomain)}`, { cache: "no-store" });

  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`Loading school "${subdomain}" failed with ${res.status}`);

  return ((await res.json()) as { data: SchoolSite }).data;
});
