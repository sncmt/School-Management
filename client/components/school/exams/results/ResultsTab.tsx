"use client";

import { CheckCircle2, CircleDashed, IdCard, Lock, MessageSquareText, Send, Table2, Unlock } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCan } from "@/lib/auth/hooks";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useExams } from "@/lib/school/exams";
import { useMarksProgress } from "@/lib/school/marks";
import { usePublishResult, useResultSummary, useUnlockResult, type ExamResultSummary } from "@/lib/school/results";
import { CardsView } from "./CardsView";
import { RemarksView } from "./RemarksView";
import { TabulationView } from "./TabulationView";

type ClassRow = ExamResultSummary["classes"][number];
type View = { kind: "sheet" | "cards" | "remarks"; classId: string };

/** Each class's result for an exam: publish, unlock, the summary and the tabulation sheet. */
export function ResultsTab() {
  const t = useTranslations("school.exams.results");
  const tStage = useTranslations("school.exams.stages");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const name = useLocalizedName();
  const can = useCan();
  const exams = useExams();
  const [examId, setExamId] = useState<string | undefined>();
  const exam = exams.data?.items.find((e) => e.id === examId) ?? exams.data?.items[0];
  const summary = useResultSummary(exam?.id);
  const [publishing, setPublishing] = useState<ClassRow | null>(null);
  const [unlocking, setUnlocking] = useState<ClassRow | null>(null);
  // what opens under the table: a class's result sheet, its cards or its remarks
  const [view, setView] = useState<View | null>(null);

  if (exams.isPending) return <Skeleton className="h-40" />;
  if (!exam) return <p className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">{t("noExams")}</p>;

  const viewClass = view && summary.data?.classes.find((c) => c.class.id === view.classId);
  // sheets and cards exist only for a published result; remarks from marks entry on
  const shown =
    viewClass && (view.kind === "remarks" ? viewClass.status !== "ROUTINE" : viewClass.status === "PUBLISHED") ? view : null;
  const toggle = (next: View) => setView((v) => (v?.kind === next.kind && v.classId === next.classId ? null : next));

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-end gap-2">
        <Select
          value={exam.id}
          onValueChange={(id) => {
            setExamId(id);
            setView(null);
          }}
        >
          <SelectTrigger className="w-60" label={t("exam")} required>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {exams.data?.items.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {name(e)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {summary.isPending ? (
        <Skeleton className="h-40" />
      ) : summary.isError ? (
        <div className="no-print flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
          <p>{describeError(summary.error)}</p>
          <Button variant="outline" size="sm" onClick={() => summary.refetch()}>
            {tCommon("tryAgain")}
          </Button>
        </div>
      ) : (
        <div className="no-print rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.class")}</TableHead>
                <TableHead>{t("columns.stage")}</TableHead>
                <TableHead>{t("columns.result")}</TableHead>
                <TableHead className="w-72" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.data.classes.map((c) => (
                <TableRow key={c.class.id}>
                  <TableCell className="font-medium">{c.class.name}</TableCell>
                  <TableCell>
                    <Badge variant={c.status === "PUBLISHED" ? "default" : c.status === "MARKS_ENTRY" ? "secondary" : "outline"}>
                      {tStage(c.status)}
                    </Badge>
                    {c.publishedAt && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {format.dateTime(new Date(c.publishedAt), { dateStyle: "medium" })}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.summary ? (
                      <div className="space-y-0.5">
                        <div>
                          {t("passed", {
                            passed: format.number(c.summary.passed),
                            appeared: format.number(c.summary.appeared),
                            rate: format.number(c.summary.passRate / 100, { style: "percent", maximumFractionDigits: 1 }),
                          })}
                        </div>
                        {Object.keys(c.summary.grades).length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {Object.entries(c.summary.grades)
                              .map(([g, n]) => `${g} ${format.number(n)}`)
                              .join(" · ")}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1">
                      {c.status === "PUBLISHED" && (
                        <>
                          <Button
                            variant={shown?.kind === "sheet" && shown.classId === c.class.id ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => toggle({ kind: "sheet", classId: c.class.id })}
                          >
                            <Table2 /> {t("tabulation")}
                          </Button>
                          <Button
                            variant={shown?.kind === "cards" && shown.classId === c.class.id ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => toggle({ kind: "cards", classId: c.class.id })}
                          >
                            <IdCard /> {t("cardsButton")}
                          </Button>
                        </>
                      )}
                      {c.status !== "ROUTINE" && (
                        <Button
                          variant={shown?.kind === "remarks" && shown.classId === c.class.id ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => toggle({ kind: "remarks", classId: c.class.id })}
                        >
                          <MessageSquareText /> {t("remarksButton")}
                        </Button>
                      )}
                      {c.status === "MARKS_ENTRY" && can("exam:publish_result") && (
                        <Button size="sm" onClick={() => setPublishing(c)}>
                          <Send /> {t("publish")}
                        </Button>
                      )}
                      {c.status === "PUBLISHED" && can("exam:unlock") && (
                        <Button variant="ghost" size="sm" onClick={() => setUnlocking(c)}>
                          <Unlock /> {t("unlock")}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {shown?.kind === "sheet" && <TabulationView examId={exam.id} classId={shown.classId} />}
      {shown?.kind === "cards" && <CardsView examId={exam.id} classId={shown.classId} />}
      {shown?.kind === "remarks" && <RemarksView examId={exam.id} classId={shown.classId} />}

      <PublishDialog examId={exam.id} row={publishing} onClose={() => setPublishing(null)} />
      <UnlockDialog examId={exam.id} row={unlocking} onClose={() => setUnlocking(null)} />
    </div>
  );
}

function PublishDialog({ examId, row, onClose }: { examId: string; row: ClassRow | null; onClose: () => void }) {
  const t = useTranslations("school.exams.results.publishDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const progress = useMarksProgress(row ? { examId, classId: row.class.id } : null);
  const publish = usePublishResult();

  const confirm = () =>
    row &&
    publish.mutate(
      { examId, classId: row.class.id },
      {
        onSuccess: (r) => {
          toast.success(t("done", { class: row.class.name, passed: format.number(r.passed), total: format.number(r.published) }));
          onClose();
        },
        onError: (e) => toast.error(describeError(e)),
      },
    );

  return (
    <AlertDialog open={!!row} onOpenChange={(open) => !open && !publish.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { class: row?.class.name ?? "" })}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        {progress.isPending ? (
          <Skeleton className="h-8" />
        ) : progress.data?.complete ? (
          <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-4" /> {t("allIn")}
          </p>
        ) : progress.data ? (
          <p className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <CircleDashed className="size-4" /> {t("missing", { count: progress.data.missing })}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={publish.isPending}>{tCommon("cancel")}</AlertDialogCancel>
          <Button onClick={confirm} disabled={publish.isPending || (progress.data && !progress.data.complete)}>
            <Send /> {publish.isPending ? t("working") : t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function UnlockDialog({ examId, row, onClose }: { examId: string; row: ClassRow | null; onClose: () => void }) {
  const t = useTranslations("school.exams.results.unlockDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const unlock = useUnlockResult();

  const confirm = () =>
    row &&
    unlock.mutate(
      { examId, classId: row.class.id },
      {
        onSuccess: () => {
          toast.success(t("done", { class: row.class.name }));
          onClose();
        },
        onError: (e) => toast.error(describeError(e)),
      },
    );

  return (
    <AlertDialog open={!!row} onOpenChange={(open) => !open && !unlock.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { class: row?.class.name ?? "" })}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={unlock.isPending}>{tCommon("cancel")}</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={unlock.isPending}>
            <Lock /> {unlock.isPending ? t("working") : t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
