import { headers } from "next/headers";
import { getSchoolSite } from "@/lib/site";
import { getSiteFromHost } from "@/lib/tenant";

/** Server only: the school this request's host belongs to, or null (unknown or inactive). */
export const getCurrentSchoolSite = async () => {
  const site = getSiteFromHost((await headers()).get("host"));
  return site.type === "SCHOOL" ? getSchoolSite(site.subdomain) : null;
};
