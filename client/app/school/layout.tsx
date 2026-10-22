import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ACCENT_STYLE_ID, accentCss, asAccent } from "@/lib/theme/accents";
import { getCurrentSchoolSite } from "@/lib/site.server";

// the school's own favicon in the browser tab, when it has one
export async function generateMetadata(): Promise<Metadata> {
  const site = await getCurrentSchoolSite();
  return site?.favicon ? { icons: { icon: { url: site.favicon, type: "image/png" } } } : {};
}

// Every page of a school's site: an unknown or inactive school is a 404. The school's accent
// colour is part of the first HTML, so the page never flashes the default colour first.
export default async function SchoolSiteLayout({ children }: { children: ReactNode }) {
  const site = await getCurrentSchoolSite();
  if (!site) notFound();
  const css = accentCss(asAccent(site.accentColor));
  return (
    <>
      {css && <style id={ACCENT_STYLE_ID} dangerouslySetInnerHTML={{ __html: css }} />}
      {children}
    </>
  );
}
