"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/lib/auth/hooks";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useClasses } from "@/lib/school/classes";
import { useExamRoutine, useExams } from "@/lib/school/exams";
import { useMarksGrid, useMarksSheet, useMySheets } from "@/lib/school/marks";
import { cn } from "@/lib/utils";
import { MarksGridEditor } from "./MarksGridEditor";
import { MarksProgressView } from "./MarksProgressView";
import { MarksSheetEditor } from "./MarksSheetEditor";

type Mode = "subject" | "grid" | "progress";
type Pick = { examId?: string; classId?: string; sectionId?: string; examSubjectId?: string };

/** Marks entry: a teacher's own sheets, one subject at a time, a whole section, and progress. */
export function MarksTab({ start }: { start?: { examId: string; classId: string } }) {
  const t = useTranslations("school.exams.marks");
  const tStage = useTranslations("school.exams.stages");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const name = useLocalizedName();
  const can = useCan();
  const canGrid = can("exam:enter_marks");

  const exams = useExams();
  const classes = useClasses();
  const mine = useMySheets();
  const [pick, setPick] = useState<Pick>(start ?? {});
  const [mode, setMode] = useState<Mode>("subject");

  // exams with a class past the routine stage
  const examList = (exams.data?.items ?? []).filter((e) => e.classes.some((c) => c.status !== "ROUTINE"));
  const exam = examList.find((e) => e.id === pick.examId) ?? examList[0];
  const examClasses = exam?.classes.filter((c) => c.status !== "ROUTINE") ?? [];
  const examClass = examClasses.find((c) => c.class.id === pick.classId) ?? examClasses[0];
  const sections = classes.data?.items.find((c) => c.id === examClass?.class.id)?.sections ?? [];
  const realSections = sections.filter((s) => !s.isDefault);
  const sectionId = pick.sectionId && sections.some((s) => s.id === pick.sectionId) ? pick.sectionId : (realSections[0] ?? sections[0])?.id;

  const routine = useExamRoutine(exam && examClass ? { examId: exam.id, classId: examClass.class.id } : null);
  const subjects = routine.data?.subjects ?? [];
  const examSubjectId = pick.examSubjectId && subjects.some((s) => s.id === pick.examSubjectId) ? pick.examSubjectId : subjects[0]?.id;

  const sheet = useMarksSheet(mode === "subject" && examSubjectId && sectionId ? { examSubjectId, sectionId } : null);
  const grid = useMarksGrid(mode === "grid" && exam && examClass && sectionId ? { examId: exam.id, classId: examClass.class.id, sectionId } : null);

  const openSheet = (next: Pick) => {
    setPick(next);
    setMode("subject");
  };

  return (
    <div className="space-y-5">
      {/* the logged-in teacher's own subjects */}
      {mine.data && mine.data.items.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t("mySheets")}</h3>
          <div className="flex flex-wrap gap-2">
            {mine.data.items.map((s) => (
              <button
                key={`${s.examSubjectId}-${s.section.id}`}
                type="button"
                onClick={() => openSheet({ examId: s.exam.id, classId: s.class.id, sectionId: s.section.id, examSubjectId: s.examSubjectId })}
                className="cursor-pointer rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                <div className="font-medium">
                  {name(s.subject)} · {s.class.name}
                  {!s.section.isDefault && ` ${s.section.name}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {name(s.exam)} · {s.open ? t("open") : t("opensOn", { date: format.dateTime(new Date(`${s.date}T00:00:00Z`), { dateStyle: "medium", timeZone: "UTC" }) })}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {exams.isPending ? (
        <Skeleton className="h-10 w-96" />
      ) : examList.length === 0 ? (
        <p className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">{t("noneOpen")}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={exam?.id ?? ""} onValueChange={(id) => setPick({ examId: id })}>
              <SelectTrigger className="w-52" aria-label={t("exam")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {examList.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {name(e)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={examClass?.class.id ?? ""} onValueChange={(id) => setPick({ examId: exam?.id, classId: id })}>
              <SelectTrigger className="w-40" aria-label={t("class")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {examClasses.map((c) => (
                  <SelectItem key={c.id} value={c.class.id}>
                    {c.class.name} · {tStage(c.status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {realSections.length > 0 && mode !== "progress" && (
              <Select value={sectionId ?? ""} onValueChange={(id) => setPick((p) => ({ ...p, examId: exam?.id, classId: examClass?.class.id, sectionId: id }))}>
                <SelectTrigger className="w-32" aria-label={t("section")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {realSections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {t("sectionName", { name: s.name })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {mode === "subject" && subjects.length > 0 && (
              <Select value={examSubjectId ?? ""} onValueChange={(id) => setPick((p) => ({ ...p, examId: exam?.id, classId: examClass?.class.id, sectionId, examSubjectId: id }))}>
                <SelectTrigger className="w-52" aria-label={t("subject")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {name(s.classSubject.subject)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="inline-flex overflow-hidden rounded-md border text-sm">
            {(["subject", ...(canGrid ? ["grid"] : []), "progress"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn("cursor-pointer border-l px-3 py-1.5 first:border-l-0", mode === m ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
              >
                {t(`modes.${m}`)}
              </button>
            ))}
          </div>

          {mode === "progress" && exam && examClass ? (
            <MarksProgressView
              examId={exam.id}
              classId={examClass.class.id}
              onOpen={(id, section) => openSheet({ examId: exam.id, classId: examClass.class.id, sectionId: section, examSubjectId: id })}
            />
          ) : mode === "grid" ? (
            grid.isPending ? (
              <Skeleton className="h-64" />
            ) : grid.isError ? (
              <ErrorBox message={describeError(grid.error)} retry={() => grid.refetch()} label={tCommon("tryAgain")} />
            ) : grid.data && exam ? (
              <MarksGridEditor key={grid.dataUpdatedAt} examId={exam.id} grid={grid.data} />
            ) : null
          ) : !examSubjectId ? (
            <p className="text-sm text-muted-foreground">{t("noSubjects")}</p>
          ) : sheet.isPending ? (
            <Skeleton className="h-64" />
          ) : sheet.isError ? (
            <ErrorBox message={describeError(sheet.error)} retry={() => sheet.refetch()} label={tCommon("tryAgain")} />
          ) : sheet.data ? (
            <MarksSheetEditor key={sheet.dataUpdatedAt} examSubjectId={examSubjectId} sheet={sheet.data} />
          ) : null}
        </>
      )}
    </div>
  );
}

function ErrorBox({ message, retry, label }: { message: string; retry: () => void; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
      <p>{message}</p>
      <Button variant="outline" size="sm" onClick={retry}>
        {label}
      </Button>
    </div>
  );
}

