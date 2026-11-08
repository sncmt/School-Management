import type { PublicPackage } from "./packages";

const API_URL = process.env.API_URL ?? "http://localhost:5000";

/**
 * Server only: the packages on offer, in order (cached for a minute). None when they can't be
 * had, so the page still shows; the packages section then asks visitors to get in touch.
 */
export const getPublicPackages = async (): Promise<PublicPackage[]> => {
  try {
    const res = await fetch(`${API_URL}/api/v1/package`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return ((await res.json()) as { data: PublicPackage[] }).data;
  } catch {
    return [];
  }
};
