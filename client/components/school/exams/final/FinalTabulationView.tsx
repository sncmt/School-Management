"use client";

import { Printer } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useClasses } from "@/lib/school/classes";
import { useFinalTabulation, type FinalSubjectLine } from "@/lib/school/finalResults";
import { cn } from "@/lib/utils";

const ALL = "all";

/** The class's (or a section's) final result sheet: every student against every subject. Prints landscape. */
export function FinalTabulationView({ formulaId, classId }: { formulaId: string; classId: string }) {
  const t = useTranslations("school.exams.results.sheet");
  const tFinal = useTranslations("school.exams.final");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const name = useLocalizedName();
  const classes = useClasses();
  const sections = classes.data?.items.find((c) => c.id === classId)?.sections.filter((s) => !s.isDefault) ?? [];
  const [sectionId, setSectionId] = useState<string | undefined>();
  const [sort, setSort] = useState<"roll" | "merit">("roll");
  const { data, isPending, isError, error, refetch, isFetching } = useFinalTabulation(formulaId, { sectionId, sort });

  const num = (v: string | number | null, digits = 2) =>
    v === null ? "—" : format.number(Number(v), { maximumFractionDigits: digits });
  // how a subject's final percentage was made up, for the cell's tooltip
  const breakdown = (line: FinalSubjectLine) =>
    line.components
      .filter((c) => c.percentage !== null)
      .map((c) => `${name(c)}: ${num(c.percentage)}%`)
      .join("\n");

  return (
    <div className="space-y-3">
      <div className="no-print flex flex-wrap items-end gap-2">
        {sections.length > 0 && (
          <Select value={sectionId ?? ALL} onValueChange={(v) => setSectionId(v === ALL ? undefined : v)}>
            <SelectTrigger className="w-40" label={t("section")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("allSections")}</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {t("sectionName", { name: s.name })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={sort} onValueChange={(v) => setSort(v as "roll" | "merit")}>
          <SelectTrigger className="w-40" label={t("order")} required>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="roll">{t("byRoll")}</SelectItem>
            <SelectItem value="merit">{t("byMerit")}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!data}>
          <Printer /> {t("print")}
        </Button>
        <span className="text-xs text-muted-foreground">{tFinal("sheetHint")}</span>
      </div>

      {isPending ? (
        <Skeleton className="h-64" />
      ) : isError ? (
        <div className="no-print flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
          <p>{describeError(error)}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {tCommon("tryAgain")}
          </Button>
        </div>
      ) : (
        <div className={cn("print-area print-landscape space-y-2", isFetching && "opacity-60")}>
          <div className="text-center">
            <h3 className="text-lg font-semibold">{t("title", { exam: name(data.formula), class: data.class.name })}</h3>
            <p className="text-xs text-muted-foreground">
              {data.academicYear.name} ·{" "}
              {t("summary", {
                appeared: format.number(data.summary.appeared),
                passed: format.number(data.summary.passed),
                rate: format.number(data.summary.passRate / 100, { style: "percent", maximumFractionDigits: 1 }),
              })}
              {Object.keys(data.summary.grades).length > 0 &&
                ` · ${Object.entries(data.summary.grades)
                  .map(([g, n]) => `${g} ${format.number(n)}`)
                  .join(", ")}`}
            </p>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full border-collapse text-xs">
              <thead className="bg-muted/60">
                <tr>
                  <th className="border p-1.5 text-left">{t("roll")}</th>
                  <th className="border p-1.5 text-left">{t("student")}</th>
                  {!sectionId && sections.length > 0 && <th className="border p-1.5">{t("section")}</th>}
                  {data.subjects.map((s) => (
                    <th key={s.subjectId} className="border p-1.5 text-center">
                      {name(s)}
                      {s.isOptional && <span className="block font-normal text-muted-foreground">{t("optional")}</span>}
                    </th>
                  ))}
                  <th className="border p-1.5 text-center">{t("total")}</th>
                  <th className="border p-1.5 text-center">{tFinal("percentage")}</th>
                  <th className="border p-1.5 text-center">{t("gpa")}</th>
                  <th className="border p-1.5 text-center">{t("grade")}</th>
                  <th className="border p-1.5 text-center">{t("result")}</th>
                  <th className="border p-1.5 text-center">{t("position")}</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((st) => (
                  <tr key={st.enrollmentId} className={cn(!st.passed && "bg-rose-50/60 dark:bg-rose-950/20")}>
                    <td className="border p-1.5 tabular-nums">{st.rollNumber ?? "—"}</td>
                    <td className="border p-1.5 font-medium">{name(st.student)}</td>
                    {!sectionId && sections.length > 0 && <td className="border p-1.5 text-center">{st.section.name}</td>}
                    {data.subjects.map((s) => {
                      const line = st.subjects[s.subjectId];
                      return (
                        <td
                          key={s.subjectId}
                          title={line ? breakdown(line) : undefined}
                          className={cn(
                            "border p-1.5 text-center tabular-nums",
                            line && !line.passed && !line.excluded && "font-semibold text-rose-700 dark:text-rose-400",
                          )}
                        >
                          {!line ? (
                            ""
                          ) : line.excluded ? (
                            "—"
                          ) : (
                            <>
                              {num(line.marks)}
                              {line.grade && <span className="block text-[12px] text-muted-foreground">{line.grade}</span>}
                            </>
                          )}
                        </td>
                      );
                    })}
                    <td className="border p-1.5 text-center font-medium tabular-nums">{num(st.totalMarks)}</td>
                    <td className="border p-1.5 text-center tabular-nums">{num(st.percentage)}%</td>
                    <td className="border p-1.5 text-center tabular-nums">{st.gpa !== null ? format.number(Number(st.gpa), { minimumFractionDigits: 2 }) : "—"}</td>
                    <td className="border p-1.5 text-center font-semibold">{st.grade ?? "—"}</td>
                    <td className="border p-1.5 text-center">{st.passed ? t("pass") : t("fail", { count: st.failedSubjects })}</td>
                    <td className="border p-1.5 text-center tabular-nums">
                      {format.number(sectionId ? st.sectionPosition : st.classPosition)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
