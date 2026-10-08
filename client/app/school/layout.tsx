import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentSchoolSite } from "@/lib/site.server";

// Every page of a school's site: an unknown or inactive school is a 404.
export default async function SchoolSiteLayout({ children }: { children: ReactNode }) {
  if (!(await getCurrentSchoolSite())) notFound();
  return children;
}
