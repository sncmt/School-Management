"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toAsciiDigits } from "@/lib/i18n/digits";
import { useLocalizedName } from "@/lib/i18n/names";
import { useClasses } from "@/lib/school/classes";
import { useStudents } from "@/lib/school/students";
import { cn } from "@/lib/utils";

const ALL = "all";

/** Find a student by name or admission number, optionally within a class. */
export function StudentPicker({ onPick }: { onPick: (studentId: string) => void }) {
  const t = useTranslations("school.finance.collect.picker");
  const name = useLocalizedName();
  const classes = useClasses();
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [classId, setClassId] = useState<string>(ALL);

  // wait for a pause in typing before searching
  useEffect(() => {
    const timer = setTimeout(() => setSearch(toAsciiDigits(text.trim())), 300);
    return () => clearTimeout(timer);
  }, [text]);

  const active = search.length > 0 || classId !== ALL;
  const students = useStudents({
    page: 1,
    limit: 12,
    ...(search ? { search } : {}),
    ...(classId !== ALL ? { classId } : {}),
    sortBy: "admissionNo",
    sortOrder: "asc",
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={t("search")} className="pl-9" autoFocus />
        </div>
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-40" aria-label={t("class")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allClasses")}</SelectItem>
            {classes.data?.items.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
