"use client";

import { ArrowRight, GraduationCap, TriangleAlert, Undo2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
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
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useClasses } from "@/lib/school/classes";
import { usePromote, usePromotionPreview, useUndoPromotion, type PromotionAction, type PromotionPreview } from "@/lib/school/promotion";
import { cn } from "@/lib/utils";

type Row = PromotionPreview["students"][number];

const hasLeft = (s: Row) => s.student.status === "INACTIVE" || s.student.status === "GRADUATED";
// a student's choice: what happens, the section next year, and whether they are in this batch
type Choice = { action?: PromotionAction; sectionId?: string; skip?: boolean };

/** End of year: each student of a class moves up, repeats, graduates or leaves. */
export function PromotionPage() {
  const t = useTranslations("school.promotion");
  const describeError = useErrorMessage();
  const classes = useClasses();
  const [classId, setClassId] = useState<string | undefined>();
  const [formulaId, setFormulaId] = useState<string | undefined>();
  const schoolClass = classes.data?.items.find((c) => c.id === classId) ?? classes.data?.items[0];
  const preview = usePromotionPreview(schoolClass ? { classId: schoolClass.id, ...(formulaId ? { formulaId } : {}) } : null);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={schoolClass?.id ?? ""}
          onValueChange={(v) => {
            setClassId(v);
            setFormulaId(undefined);
          }}
        >
          <SelectTrigger className="w-44" aria-label={t("class")}>
            <SelectValue placeholder={t("class")} />
          </SelectTrigger>
          <SelectContent>
            {classes.data?.items.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {preview.isPending || !preview.data ? (
        preview.isError ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{describeError(preview.error)}</p>
        ) : (
          <Skeleton className="h-64" />
        )
      ) : (
        // a fresh form for each class, result and reload
        <Promotion key={`${preview.data.class.id}:${preview.data.formulaId}:${preview.dataUpdatedAt}`} data={preview.data} onFormula={setFormulaId} />
      )}
    </div>
  );
}

function Promotion({ data, onFormula }: { data: PromotionPreview; onFormula: (id: string) => void }) {
  const t = useTranslations("school.promotion");
  const format = useFormatter();
  const name = useLocalizedName();
  const describeError = useErrorMessage();
  const promote = usePromote();
  const pending = data.students.filter((s) => s.status === "ACTIVE");
  const done = data.students.filter((s) => s.status !== "ACTIVE");
  const next = data.nextClass;
  const nextSections = (next?.sections ?? []).filter((s) => !s.isDefault);
  const thisSections = data.class.sections.filter((s) => !s.isDefault);
  // what failed students do by default; the school decides each time
  const [failedGo, setFailedGo] = useState<"REPEAT" | "MOVE">("REPEAT");
  const [sectionId, setSectionId] = useState<string | undefined>(nextSections.length === 1 ? nextSections[0].id : undefined);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [confirming, setConfirming] = useState(false);

  const moveUp: PromotionAction = next ? "PROMOTE" : "GRADUATE";
  // left the school during the year: their enrollment is only closed
  const actionOf = (s: Row): PromotionAction =>
    hasLeft(s) ? "LEAVE" : (choices[s.enrollmentId]?.action ?? (s.result && !s.result.passed && failedGo === "REPEAT" ? "REPEAT" : moveUp));
  const set = (id: string, change: Choice) => setChoices((c) => ({ ...c, [id]: { ...c[id], ...change } }));
  const chosen = pending.filter((s) => !choices[s.enrollmentId]?.skip);
  const count = (a: PromotionAction) => chosen.filter((s) => actionOf(s) === a).length;
  // students moving up need a section of the next class (when it has sections)
  const missingSection =
    nextSections.length > 0 && chosen.some((s) => actionOf(s) === "PROMOTE" && !(choices[s.enrollmentId]?.sectionId ?? sectionId));

  const submit = () =>
    promote.mutate(
      {
        classId: data.class.id,
        ...(sectionId ? { sectionId } : {}),
        students: chosen.map((s) => ({
          enrollmentId: s.enrollmentId,
          action: actionOf(s),
          ...(choices[s.enrollmentId]?.sectionId ? { sectionId: choices[s.enrollmentId].sectionId } : {}),
        })),
      },
      {
        onSuccess: (r) => {
          toast.success(t("done", { promoted: r.promoted, repeated: r.repeated, graduated: r.graduated, left: r.left, year: r.toYear.name }));
          setConfirming(false);
        },
        onError: (e) => {
          toast.error(describeError(e));
          setConfirming(false);
        },
      },
    );

  if (!data.toYear) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 py-6 text-sm">
          <TriangleAlert className="size-5 text-amber-600" />
          <span className="flex-1">{t("noNextYear", { year: data.fromYear.name })}</span>
          <Button asChild variant="outline" size="sm">
            <Link href="/academic-years">{t("goToYears")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 py-4 text-sm">
          <span className="font-medium">
            {data.class.name} · {data.fromYear.name}
          </span>
          <ArrowRight className="size-4 text-muted-foreground" />
          <span className="font-medium">
            {next ? `${next.name} · ${data.toYear.name}` : t("graduation")}
          </span>
          {!next && <GraduationCap className="size-4 text-muted-foreground" />}
          <span className="ml-auto text-xs text-muted-foreground">{t("newYearNote")}</span>
        </CardContent>
      </Card>

      {pending.length > 0 && (
        <>
          <div className="flex flex-wrap items-end gap-4">
            {data.formulas.length > 0 ? (
              <div className="space-y-1">
                <Label>{t("result")}</Label>
                <Select value={data.formulaId ?? ""} onValueChange={onFormula}>
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {data.formulas.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {name(f)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("noResult")}</p>
            )}
            {data.formulaId && (
              <div className="space-y-1">
                <Label>{t("failedGo")}</Label>
                <div className="flex gap-3 text-sm">
                  {(["REPEAT", "MOVE"] as const).map((v) => (
                    <label key={v} className="flex h-9 cursor-pointer items-center gap-2">
                      <input type="radio" className="size-4 accent-primary" checked={failedGo === v} onChange={() => setFailedGo(v)} />
                      {t(v === "REPEAT" ? "failedRepeat" : next ? "failedMoveUp" : "failedGraduate")}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {next && nextSections.length > 0 && (
              <div className="space-y-1">
                <Label required>{t("sectionFor", { class: next.name })}</Label>
                <Select value={sectionId ?? ""} onValueChange={setSectionId}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder={t("chooseSection")} />
                  </SelectTrigger>
                  <SelectContent>
                    {nextSections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {t("sectionName", { name: s.name })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>{t("columns.roll")}</TableHead>
                  <TableHead>{t("columns.student")}</TableHead>
                  <TableHead>{t("columns.result")}</TableHead>
                  <TableHead>{t("columns.action")}</TableHead>
                  <TableHead>{t("columns.section")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((s) => {
                  const c = choices[s.enrollmentId];
                  const action = actionOf(s);
                  const sections = action === "PROMOTE" ? nextSections : action === "REPEAT" ? thisSections : [];
                  return (
                    <TableRow key={s.enrollmentId} className={cn(c?.skip && "opacity-50")}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="size-4 cursor-pointer accent-primary"
                          checked={!c?.skip}
                          onChange={(e) => set(s.enrollmentId, { skip: !e.target.checked })}
                          aria-label={name(s.student)}
                        />
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {s.section.isDefault ? "" : `${s.section.name} · `}
                        {s.rollNumber ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{name(s.student)}</div>
                        <div className="text-xs text-muted-foreground">{s.student.admissionNo}</div>
                        {hasLeft(s) && (
                          <Badge variant="outline" className="mt-1 text-muted-foreground">
                            {t("leftSchool")}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {s.result ? (
                          <>
                            <Badge variant={s.result.passed ? "secondary" : "outline"} className={cn(!s.result.passed && "border-rose-300 text-rose-700 dark:text-rose-400")}>
                              {t(s.result.passed ? "passed" : "failed")}
                            </Badge>
                            <span className="ml-2 text-xs text-muted-foreground">
                              {s.result.gpa !== null && `${t("gpa")} ${format.number(Number(s.result.gpa), { minimumFractionDigits: 2 })} · `}
                              {t("position", { n: format.number(s.result.classPosition) })}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">{data.formulaId ? t("noResultFor") : "—"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select value={action} onValueChange={(v) => set(s.enrollmentId, { action: v as PromotionAction, sectionId: undefined })} disabled={c?.skip || hasLeft(s)}>
                          <SelectTrigger className="h-8 w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(next ? (["PROMOTE", "REPEAT", "LEAVE"] as const) : (["GRADUATE", "REPEAT", "LEAVE"] as const)).map((a) => (
                              <SelectItem key={a} value={a}>
                                {t(`actions.${a}`, { class: next?.name ?? "" })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {sections.length > 0 && (
                          <Select
                            value={c?.sectionId ?? (action === "REPEAT" ? s.section.id : (sectionId ?? ""))}
                            onValueChange={(v) => set(s.enrollmentId, { sectionId: v })}
                            disabled={c?.skip}
                          >
                            <SelectTrigger className="h-8 w-28">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              {sections.map((sec) => (
                                <SelectItem key={sec.id} value={sec.id}>
                                  {sec.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            {missingSection && <span className="text-sm text-amber-700 dark:text-amber-400">{t("needSection")}</span>}
            <Button onClick={() => setConfirming(true)} disabled={chosen.length === 0 || missingSection || promote.isPending}>
              {t("submit", { count: chosen.length })}
            </Button>
          </div>
        </>
      )}

      {pending.length === 0 && done.length === 0 && (
        <p className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">{t("empty")}</p>
      )}
      {pending.length === 0 && done.length > 0 && (
        <p className="text-sm text-muted-foreground">{t("allDone", { year: data.toYear.name })}</p>
      )}

      {done.length > 0 && <DoneTable rows={done} />}

      <AlertDialog open={confirming} onOpenChange={(open) => !open && !promote.isPending && setConfirming(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmTitle", { count: chosen.length, year: data.toYear.name })}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-1">
                {count("PROMOTE") > 0 && <p>{t("summary.PROMOTE", { count: count("PROMOTE"), class: next?.name ?? "" })}</p>}
                {count("REPEAT") > 0 && <p>{t("summary.REPEAT", { count: count("REPEAT"), class: data.class.name })}</p>}
                {count("GRADUATE") > 0 && <p>{t("summary.GRADUATE", { count: count("GRADUATE") })}</p>}
                {count("LEAVE") > 0 && <p>{t("summary.LEAVE", { count: count("LEAVE") })}</p>}
                <p className="pt-2">{t("confirmNote")}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={promote.isPending}>{t("cancel")}</AlertDialogCancel>
            <Button onClick={submit} disabled={promote.isPending}>
              {promote.isPending ? t("working") : t("confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* Students already moved on, with where they went; each move can be taken back. */
function DoneTable({ rows }: { rows: Row[] }) {
  const t = useTranslations("school.promotion");
  const tStatus = useTranslations("school.students.detail.enrollmentStatuses");
  const name = useLocalizedName();
  const describeError = useErrorMessage();
  const undo = useUndoPromotion();

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium">{t("doneTitle")}</h2>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.student")}</TableHead>
              <TableHead>{t("columns.outcome")}</TableHead>
              <TableHead>{t("columns.nextYear")}</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.enrollmentId}>
                <TableCell>
                  <div className="font-medium">{name(s.student)}</div>
                  <div className="text-xs text-muted-foreground">{s.student.admissionNo}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{tStatus(s.status)}</Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {s.next ? `${s.next.className}${s.next.section.isDefault ? "" : ` · ${s.next.section.name}`}` : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={undo.isPending}
                    onClick={() =>
                      undo.mutate(s.enrollmentId, {
                        onSuccess: () => toast.success(t("undone", { name: name(s.student) })),
                        onError: (e) => toast.error(describeError(e)),
                      })
                    }
                  >
                    <Undo2 /> {t("undo")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
