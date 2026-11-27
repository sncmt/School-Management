"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toAsciiDigits } from "@/lib/i18n/digits";
import { useLocalizedName } from "@/lib/i18n/names";
import { currentYearOf, useAcademicYears } from "@/lib/school/academicYears";
import { classesOfTrack, useClasses } from "@/lib/school/classes";
import { useInstitutionTracks } from "@/lib/school/tracks";
import { useYearLabel } from "@/components/school/years/TrackSwitch";
import { useStudents } from "@/lib/school/students";
import { cn } from "@/lib/utils";

const ALL = "all";

/*
 * Find a student by name or admission number, or by class and section in a year. The year
 * starts at the current one; a name search alone looks at every year (so students who
 * left can still pay old dues) unless another year is chosen.
 */
export function StudentPicker({ onPick }: { onPick: (studentId: string) => void }) {
  const t = useTranslations("school.finance.collect.picker");
  const tCommon = useTranslations("common");
  const name = useLocalizedName();
  const classes = useClasses();
  const years = useAcademicYears();
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState<string>(ALL);
  const [sectionId, setSectionId] = useState<string>(ALL);
  const [chosenYear, setChosenYear] = useState<string | undefined>();

  const yearList = years.data ?? [];
  const { main } = useInstitutionTracks();
  const yearLabel = useYearLabel();
  // nothing chosen: the current year (each class in the current year of its own track)
  const currentYearId = currentYearOf(yearList, main)?.id ?? currentYearOf(yearList)?.id;
  const yearId = chosenYear ?? currentYearId;
  const chosen = chosenYear ? yearList.find((y) => y.id === chosenYear) : undefined;
  // a chosen year lists only its own track's classes (school or college)
  const classList = classesOfTrack(classes.data?.items, chosen?.track);
  // a class without sections of its own has one hidden section: nothing to choose
  const sections = classList.find((c) => c.id === classId)?.sections.filter((s) => !s.isDefault) ?? [];

  // wait for a pause in typing before searching
  useEffect(() => {
    const timer = setTimeout(() => setSearch(toAsciiDigits(text.trim())), 300);
    return () => clearTimeout(timer);
  }, [text]);

  const byPlace = classId !== ALL;
  const otherYear = !!chosen && !chosen.isCurrent;
  const active = search.length > 0 || byPlace || otherYear;
  const students = useStudents({
    page: 1,
    limit: 12,
    ...(search ? { search } : {}),
    ...(byPlace ? { classId } : {}),
    ...(byPlace && sectionId !== ALL ? { sectionId } : {}),
    // the year narrows a class search, or any search once a year other than the current one is chosen
    // (no year chosen: the server takes the class's own track's current year)
    ...(chosen && (byPlace || otherYear) ? { academicYearId: chosen.id } : {}),
    sortBy: "admissionNo",
    sortOrder: "asc",
  });

  return (
    <div className="space-y-2">
      {/* the narrowing selects on the left, the name search on the right */}
      <div className="flex flex-wrap items-end gap-3">
        {yearList.length > 1 && (
          <Select
            value={yearId}
            onValueChange={(v) => {
              setChosenYear(v);
              // a class of the other track has no place in this year
              const next = yearList.find((y) => y.id === v);
              if (next && classId !== ALL && !classesOfTrack(classes.data?.items, next.track).some((c) => c.id === classId)) {
                setClassId(ALL);
                setSectionId(ALL);
              }
            }}
          >
            <SelectTrigger className="w-36" label={t("year")} required>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearList.map((y) => (
                <SelectItem key={y.id} value={y.id}>
                  {y.isCurrent ? t("currentYear", { name: yearLabel(y) }) : yearLabel(y)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={classId}
          onValueChange={(v) => {
            setClassId(v);
            // the old section belongs to another class
            setSectionId(ALL);
          }}
        >
          <SelectTrigger className="w-40" label={t("class")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{tCommon("all")}</SelectItem>
            {classList.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sections.length > 0 && (
          <Select value={sectionId} onValueChange={setSectionId}>
            <SelectTrigger className="w-36" label={t("section")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{tCommon("all")}</SelectItem>
              {sections.map((sec) => (
                <SelectItem key={sec.id} value={sec.id}>
                  {sec.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="relative w-full sm:ml-auto sm:w-64">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("search")} className="pl-9" autoFocus />
        </div>
      </div>

      {!active ? (
        <p className="text-sm text-muted-foreground">{t("hint")}</p>
      ) : students.isPending ? (
        <Skeleton className="h-24" />
      ) : students.data?.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        <ul className={cn("divide-y rounded-md border", students.isFetching && "opacity-60")}>
          {students.data?.items.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onPick(s.id)}
                className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted/60"
              >
                <span>
                  <span className="font-medium">{name(s)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{s.admissionNo}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {s.enrollment
                    ? `${s.enrollment.class.name}${s.enrollment.section.isDefault ? "" : ` · ${s.enrollment.section.name}`}${s.enrollment.rollNumber ? ` · ${t("roll", { roll: s.enrollment.rollNumber })}` : ""}`
                    : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
