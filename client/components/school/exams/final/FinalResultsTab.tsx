"use client";

import { IdCard, Lock, Pencil, Plus, Send, Table2, Trash2, Unlock } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCan } from "@/lib/auth/hooks";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useExams } from "@/lib/school/exams";
import {
  useDeleteFormula,
  useFinalFormulas,
  usePublishFinal,
  useUnlockFinal,
  type FinalFormula,
} from "@/lib/school/finalResults";
import { CardsView } from "../results/CardsView";
import { FinalTabulationView } from "./FinalTabulationView";
import { FormulaFormDialog } from "./FormulaFormDialog";

type View = { kind: "sheet" | "cards"; formulaId: string };
type Dialog = { kind: "publish" | "unlock" | "delete"; formula: FinalFormula } | null;

/** Each class's final results: which exams count and how much, publish, the sheet and the cards. */
export function FinalResultsTab() {
  const t = useTranslations("school.exams.final");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const name = useLocalizedName();
  const can = useCan();
  const formulas = useFinalFormulas();
  const exams = useExams();
  const [editing, setEditing] = useState<FinalFormula | null | undefined>();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [view, setView] = useState<View | null>(null);

  // each exam of a formula and whether its result is published for the class
  const examsOf = (f: FinalFormula) =>
    f.components.flatMap((c) =>
      c.exams.map(({ exam }) => ({
        exam,
        published:
          exams.data?.items.find((e) => e.id === exam.id)?.classes.find((ec) => ec.class.id === f.classId)?.status === "PUBLISHED",
      })),
    );

  const shownFormula = view && formulas.data?.items.find((f) => f.id === view.formulaId && f.status === "PUBLISHED");
  const toggle = (next: View) => setView((v) => (v?.kind === next.kind && v.formulaId === next.formulaId ? null : next));

  if (formulas.isPending) return <Skeleton className="h-40" />;
  if (formulas.isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
        <p>{describeError(formulas.error)}</p>
        <Button variant="outline" size="sm" onClick={() => formulas.refetch()}>
          {tCommon("tryAgain")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-3xl text-sm text-muted-foreground">{t("description", { year: formulas.data.academicYear.name })}</p>
        {can("grading:manage") && (
          <Button onClick={() => setEditing(null)}>
            <Plus /> {t("add")}
          </Button>
        )}
      </div>

      {formulas.data.items.length === 0 ? (
        <p className="no-print rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="no-print rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.class")}</TableHead>
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="w-72" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {formulas.data.items.map((f) => {
                const list = examsOf(f);
                const ready = list.filter((e) => e.published).length;
                const published = f.status === "PUBLISHED";
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.class.name}</TableCell>
                    <TableCell>
                      <div className="font-medium">{name(f)}</div>
                      <div className="text-xs text-muted-foreground">
                        {f.components
                          .map((c) => `${name(c)} ${format.number(Number(c.weight), { maximumFractionDigits: 2 })}%`)
                          .join(" + ")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={published ? "default" : "outline"}>{t(`status.${f.status}`)}</Badge>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {published && f.publishedAt
                          ? format.dateTime(new Date(f.publishedAt), { dateStyle: "medium" })
                          : t("examsReady", { ready: format.number(ready), total: format.number(list.length) })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1">
                        {published ? (
                          <>
                            <Button
                              variant={view?.kind === "sheet" && view.formulaId === f.id ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => toggle({ kind: "sheet", formulaId: f.id })}
                            >
                              <Table2 /> {t("tabulation")}
                            </Button>
                            <Button
                              variant={view?.kind === "cards" && view.formulaId === f.id ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => toggle({ kind: "cards", formulaId: f.id })}
                            >
                              <IdCard /> {t("cards")}
                            </Button>
                            {can("exam:unlock") && (
                              <Button variant="ghost" size="sm" onClick={() => setDialog({ kind: "unlock", formula: f })}>
                                <Unlock /> {t("unlock")}
                              </Button>
                            )}
                          </>
                        ) : (
                          <>
                            {can("grading:manage") && (
                              <>
                                <Button variant="ghost" size="icon" onClick={() => setEditing(f)} aria-label={t("edit")}>
                                  <Pencil />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setDialog({ kind: "delete", formula: f })} aria-label={t("delete")}>
                                  <Trash2 />
                                </Button>
                              </>
                            )}
                            {can("exam:publish_result") && (
                              <Button size="sm" onClick={() => setDialog({ kind: "publish", formula: f })}>
                                <Send /> {t("publish")}
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {shownFormula && view.kind === "sheet" && <FinalTabulationView formulaId={shownFormula.id} classId={shownFormula.classId} />}
      {shownFormula && view.kind === "cards" && <CardsView formulaId={shownFormula.id} classId={shownFormula.classId} />}

      <FormulaFormDialog open={editing !== undefined} formula={editing ?? null} onClose={() => setEditing(undefined)} />
      <PublishDialog formula={dialog?.kind === "publish" ? dialog.formula : null} pending={dialog ? examsOf(dialog.formula).filter((e) => !e.published).map((e) => name(e.exam)) : []} onClose={() => setDialog(null)} />
      <UnlockDialog formula={dialog?.kind === "unlock" ? dialog.formula : null} onClose={() => setDialog(null)} />
      <DeleteDialog formula={dialog?.kind === "delete" ? dialog.formula : null} onClose={() => setDialog(null)} />
    </div>
  );
}

function PublishDialog({ formula, pending, onClose }: { formula: FinalFormula | null; pending: string[]; onClose: () => void }) {
  const t = useTranslations("school.exams.final.publishDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const name = useLocalizedName();
  const publish = usePublishFinal();

  const confirm = () =>
    formula &&
    publish.mutate(formula.id, {
      onSuccess: (r) => {
        toast.success(t("done", { class: formula.class.name, passed: format.number(r.passed), total: format.number(r.published) }));
        onClose();
      },
      onError: (e) => toast.error(describeError(e)),
    });

  return (
    <AlertDialog open={!!formula} onOpenChange={(open) => !open && !publish.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name: formula ? name(formula) : "", class: formula?.class.name ?? "" })}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        {pending.length > 0 && (
          <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            {t("notReady", { exams: pending.join(", ") })}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={publish.isPending}>{tCommon("cancel")}</AlertDialogCancel>
          <Button onClick={confirm} disabled={publish.isPending || pending.length > 0}>
            <Send /> {publish.isPending ? t("working") : t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function UnlockDialog({ formula, onClose }: { formula: FinalFormula | null; onClose: () => void }) {
  const t = useTranslations("school.exams.final.unlockDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const unlock = useUnlockFinal();

  const confirm = () =>
    formula &&
    unlock.mutate(formula.id, {
      onSuccess: () => {
        toast.success(t("done", { name: name(formula), class: formula.class.name }));
        onClose();
      },
      onError: (e) => toast.error(describeError(e)),
    });

  return (
    <AlertDialog open={!!formula} onOpenChange={(open) => !open && !unlock.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name: formula ? name(formula) : "", class: formula?.class.name ?? "" })}</AlertDialogTitle>
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

function DeleteDialog({ formula, onClose }: { formula: FinalFormula | null; onClose: () => void }) {
  const t = useTranslations("school.exams.final.deleteDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const remove = useDeleteFormula();

  const confirm = () =>
    formula &&
    remove.mutate(formula.id, {
      onSuccess: () => {
        toast.success(t("done", { name: name(formula) }));
        onClose();
      },
      onError: (e) => toast.error(describeError(e)),
    });

  return (
    <AlertDialog open={!!formula} onOpenChange={(open) => !open && !remove.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name: formula ? name(formula) : "", class: formula?.class.name ?? "" })}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>{tCommon("cancel")}</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={remove.isPending}>
            <Trash2 /> {remove.isPending ? t("working") : t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
