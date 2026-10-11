import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentSchoolSite } from "@/lib/site.server";

// the school's own favicon in the browser tab, when it has one
export async function generateMetadata(): Promise<Metadata> {
  const site = await getCurrentSchoolSite();
  return site?.favicon ? { icons: { icon: { url: site.favicon, type: "image/png" } } } : {};
}

// Every page of a school's site: an unknown or inactive school is a 404.
export default async function SchoolSiteLayout({ children }: { children: ReactNode }) {
  if (!(await getCurrentSchoolSite())) notFound();
  return children;
}
