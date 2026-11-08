import type { PublicPackage } from "./packages";

const API_URL = process.env.API_URL ?? "http://localhost:5000";

// the last list the API gave, for a moment when it can't be reached
let lastGood: PublicPackage[] = [];

/**
 * Server only: the packages on offer, in order. Asked for afresh on every visit (a failed answer
 * is never kept), so the prices show as soon as the API answers. When it can't be reached, the
 * last list it gave is used; with none yet, the packages section asks visitors to get in touch.
 */
export const getPublicPackages = async (): Promise<PublicPackage[]> => {
  try {
    const res = await fetch(`${API_URL}/api/v1/package`, { cache: "no-store" });
    if (!res.ok) throw new Error(`the API answered ${res.status}`);
    lastGood = ((await res.json()) as { data: PublicPackage[] }).data;
  } catch (error) {
    console.warn(`[packages] couldn't load the packages from ${API_URL}: ${(error as Error).message}`);
  }
  return lastGood;
};
