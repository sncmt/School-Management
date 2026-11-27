"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { AcademicTrack } from "@/lib/school/academicYears";
import { useInstitutionTracks } from "@/lib/school/tracks";

type Props = {
  value: AcademicTrack;
  onChange: (track: AcademicTrack) => void;
  className?: string;
};

/**
 * School | College, for an institution with both (each has its own academic years).
 * Renders nothing for an ordinary school or college.
 */
export function TrackSwitch({ value, onChange, className }: Props) {
  const t = useTranslations("school.tracks");
  const { tracks, hasBoth } = useInstitutionTracks();
  if (!hasBoth) return null;

  return (
    <div role="radiogroup" aria-label={t("label")} className={cn("inline-flex rounded-md border bg-muted/50 p-0.5", className)}>
      {tracks.map((track) => {
        const active = track === value;
        return (
          <button
            key={track}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(track)}
            className={cn(
              "rounded-[5px] px-3 py-1 text-sm font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(track)}
          </button>
        );
      })}
    </div>
  );
}

/** "2026 (School)" style label for a year, with the track only for an institution with both. */
export function useYearLabel() {
  const t = useTranslations("school.tracks");
  const { hasBoth } = useInstitutionTracks();
  return (year: { name: string; track: AcademicTrack }) => (hasBoth ? `${year.name} · ${t(year.track)}` : year.name);
}
