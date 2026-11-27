"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useSchoolMe } from "@/lib/auth/hooks";
import { tracksOf, type AcademicTrack } from "@/lib/school/academicYears";

/*
 * School / college year tracks on the client. Mirrors server/src/app/shared/academicYears.ts.
 * An ordinary school has one track and never sees any of this; an institution with both
 * (SCHOOL_AND_COLLEGE) gets a School | College switch on its year-based pages.
 */

/** The institution's tracks (main first), and whether it has both. */
export const useInstitutionTracks = () => {
  const me = useSchoolMe();
  const tracks = tracksOf(me?.school.institutionType);
  return { tracks, hasBoth: tracks.length > 1, main: tracks[0]! };
};

/**
 * The track a page is showing: `?track=` when it is one the institution has, else the main
 * track. setTrack writes it to the address (so a reload or a shared link keeps it).
 */
export const useTrack = () => {
  const { tracks, hasBoth, main } = useInstitutionTracks();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const asked = params.get("track") as AcademicTrack | null;
  const track = asked && tracks.includes(asked) ? asked : main;

  const setTrack = useCallback(
    (next: AcademicTrack) => {
      const query = new URLSearchParams(params.toString());
      if (next === main) query.delete("track");
      else query.set("track", next);
      const qs = query.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, router, pathname, main],
  );

  return { track, setTrack, tracks, hasBoth };
};
