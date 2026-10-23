import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { asAccent, asSidebar, SCHOOL_COLORS_STYLE_ID, schoolColorsCss } from "@/lib/theme/accents";
import { getCurrentSchoolSite } from "@/lib/site.server";

// the school's own favicon in the browser tab, when it has one
export async function generateMetadata(): Promise<Metadata> {
  const site = await getCurrentSchoolSite();
  return site?.favicon ? { icons: { icon: { url: site.favicon, type: "image/png" } } } : {};
}

// Every page of a school's site: an unknown or inactive school is a 404. The school's accent and
// sidebar colours are part of the first HTML, so the page never flashes the defaults first. (The
// CSS is built only from the app's own colour list, never from what was saved as such.)
export default async function SchoolSiteLayout({ children }: { children: ReactNode }) {
  const site = await getCurrentSchoolSite();
  if (!site) notFound();
  const css = schoolColorsCss({ accent: asAccent(site.accentColor), sidebar: asSidebar(site.sidebarColor) });
  return (
    <>
      {css && <style id={SCHOOL_COLORS_STYLE_ID} dangerouslySetInnerHTML={{ __html: css }} />}
      {children}
    </>
  );
}
