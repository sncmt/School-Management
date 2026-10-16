"use client";

import { ArrowLeft, CalendarRange, MoreHorizontal, PencilLine, Pencil, Plus, Trash2, Undo2, Unlock } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useAcademicYears } from "@/lib/school/academicYears";
import { useClasses } from "@/lib/school/classes";
import {
  useAddExamClasses,
  useDeleteExam,
  useExam,
  useExams,
  useRemoveExamClass,
  useSetExamClassStatus,
  type Exam,
  type ExamClass,
  type ExamClassStatus,
} from "@/lib/school/exams";
import { useDateRange } from "../calendar/shared";
import { ExamFormDialog } from "./ExamFormDialog";
import { ExamRoutineDialog, type RoutineTarget } from "./ExamRoutineDialog";

const STATUS_VARIANT: Record<ExamClassStatus, "outline" | "secondary" | "default"> = {
  ROUTINE: "outline",
  MARKS_ENTRY: "secondary",
  PUBLISHED: "default",
};

/** The year's exams; one opens on its own page with its classes. */
export function ExamsTab({
  canManage,
  onEnterMarks,
}: {
  canManage: boolean;
  // jump to the Marks tab with this exam and class chosen
  onEnterMarks: (examId: string, classId: string) => void;
}) {
  const [openExamId, setOpenExamId] = useState<string | null>(null);
  return openExamId ? (
    <ExamDetail examId={openExamId} canManage={canManage} onBack={() => setOpenExamId(null)} onEnterMarks={onEnterMarks} />
  ) : (
    <ExamList canManage={canManage} onOpen={setOpenExamId} />
  );
}

function ExamList({ canManage, onOpen }: { canManage: boolean; onOpen: (id: string) => void }) {
  const t = useTranslations("school.exams.list");
  const tStage = useTranslations("school.exams.stages");
  const tType = useTranslations("school.exams.examForm.types");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const years = useAcademicYears();
  const [yearId, setYearId] = useState<string | undefined>();
  const { data, isPending, isError, error, refetch } = useExams(yearId);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {(years.data?.length ?? 0) > 1 && (
            <Select value={yearId ?? data?.academicYear.id} onValueChange={setYearId}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.data?.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {canManage && (
          <Button onClick={() => setAdding(true)}>
            <Plus /> {t("add")}
          </Button>
        )}
      </div>

      {isPending ? (
        <Skeleton className="h-40" />
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
          <p>{t("loadFailed")}</p>
          <p className="text-xs">{describeError(error)}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {tCommon("tryAgain")}
          </Button>
        </div>
      ) : data.items.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
          {t("empty", { year: data.academicYear.name })}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.items.map((exam) => (
            <Card key={exam.id} className="cursor-pointer transition-shadow hover:ring-2 hover:ring-ring/30" onClick={() => onOpen(exam.id)}>
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  {name(exam)}
                  <Badge variant="outline">{tType(exam.type)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {exam.classes.map((c) => (
                  <Badge key={c.id} variant={STATUS_VARIANT[c.status]} title={tStage(c.status)}>
                    {c.class.name} · {tStage(c.status)}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ExamFormDialog open={adding} exam={null} onClose={() => setAdding(false)} onCreated={(exam) => onOpen(exam.id)} />
    </div>
  );
}

function ExamDetail({
  examId,
  canManage,
  onBack,
  onEnterMarks,
}: {
  examId: string;
  canManage: boolean;
  onBack: () => void;
  onEnterMarks: (examId: string, classId: string) => void;
}) {
  const t = useTranslations("school.exams.detail");
  const tStage = useTranslations("school.exams.stages");
  const tType = useTranslations("school.exams.examForm.types");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const dateRange = useDateRange();
  const { data: exam, isPending, isError, error, refetch } = useExam(examId);
  const setStatus = useSetExamClassStatus();
  const removeClass = useRemoveExamClass();
  const [editing, setEditing] = useState(false);
  const [addingClasses, setAddingClasses] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [routine, setRoutine] = useState<RoutineTarget | null>(null);

  if (isPending) return <Skeleton className="h-64" />;
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
        <p>{describeError(error)}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft /> {t("back")}
          </Button>
          <Button size="sm" onClick={() => refetch()}>
            {tCommon("tryAgain")}
          </Button>
        </div>
      </div>
    );
  }

  const changeStage = (c: ExamClass, status: "ROUTINE" | "MARKS_ENTRY") =>
    setStatus.mutate(
      { examId, classId: c.class.id, status },
      {
        onSuccess: () => toast.success(t(status === "MARKS_ENTRY" ? "marksOpened" : "backToRoutine", { class: c.class.name })),
        onError: (e) => toast.error(describeError(e)),
      },
    );

  const remove = (c: ExamClass) =>
    removeClass.mutate(
      { examId, classId: c.class.id },
      { onSuccess: () => toast.success(t("classRemoved", { class: c.class.name })), onError: (e) => toast.error(describeError(e)) },
    );

  const canDelete = exam.classes.every((c) => c.status === "ROUTINE");

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
        <ArrowLeft /> {t("back")}
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            {name(exam)} <Badge variant="outline">{tType(exam.type)}</Badge>
          </h2>
          <p className="text-sm text-muted-foreground">
            {exam.academicYear.name} ·{" "}
            {exam.attendanceFrom && exam.attendanceTo
              ? t("attendancePeriod", { range: dateRange(exam.attendanceFrom, exam.attendanceTo) })
              : t("attendanceDefault")}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAddingClasses(true)}>
              <Plus /> {t("addClasses")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label={t("actions")}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={() => setEditing(true)}>
                  <Pencil /> {t("edit")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" disabled={!canDelete} onSelect={() => setDeleting(true)}>
                  <Trash2 /> {canDelete ? t("delete") : t("deleteLocked")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.class")}</TableHead>
              <TableHead>{t("columns.stage")}</TableHead>
              <TableHead>{t("columns.subjects")}</TableHead>
              <TableHead>{t("columns.days")}</TableHead>
              <TableHead className="w-56" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {exam.classes.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.class.name}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[c.status]}>{tStage(c.status)}</Badge>
                </TableCell>
                <TableCell className="tabular-nums">{c._count.subjects || <span className="text-muted-foreground">{t("noRoutine")}</span>}</TableCell>
                <TableCell className="whitespace-nowrap text-sm">
                  {c.date ? dateRange(c.date, c.date) : c.firstDay && c.lastDay ? dateRange(c.firstDay, c.lastDay) : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button variant="outline" size="sm" onClick={() => setRoutine({ examId, classId: c.class.id, className: c.class.name })}>
                      <CalendarRange /> {t("routine")}
                    </Button>
                    {c.status === "MARKS_ENTRY" && (
                      <Button size="sm" onClick={() => onEnterMarks(examId, c.class.id)}>
                        <PencilLine /> {t("enterMarks")}
                      </Button>
                    )}
                    {canManage && c.status === "ROUTINE" && c._count.subjects > 0 && (
                      <Button size="sm" onClick={() => changeStage(c, "MARKS_ENTRY")} disabled={setStatus.isPending}>
                        <Unlock /> {t("openMarks")}
                      </Button>
                    )}
                    {canManage && (c.status !== "PUBLISHED") && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8" aria-label={t("actions")}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          {c.status === "MARKS_ENTRY" && (
                            <DropdownMenuItem onSelect={() => changeStage(c, "ROUTINE")}>
                              <Undo2 /> {t("toRoutine")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem variant="destructive" disabled={c.status !== "ROUTINE"} onSelect={() => remove(c)}>
                            <Trash2 /> {t("removeClass")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{t("stagesHint")}</p>

      <ExamFormDialog open={editing} exam={exam} onClose={() => setEditing(false)} />
      <AddClassesDialog exam={addingClasses ? exam : null} onClose={() => setAddingClasses(false)} />
      <ExamRoutineDialog target={routine} canEdit={canManage} onClose={() => setRoutine(null)} />
      <DeleteExamDialog exam={deleting ? exam : null} onClose={() => setDeleting(false)} onDeleted={onBack} />
    </div>
  );
}

function AddClassesDialog({ exam, onClose }: { exam: Exam | null; onClose: () => void }) {
  const t = useTranslations("school.exams.detail.addDialog");
  const describeError = useErrorMessage();
  const classes = useClasses();
  const add = useAddExamClasses();
  const [chosen, setChosen] = useState<string[]>([]);
  const inExam = new Set(exam?.classes.map((c) => c.class.id));
  const available = (classes.data?.items ?? []).filter((c) => !inExam.has(c.id));

  const close = () => {
    setChosen([]);
    onClose();
  };
  const submit = () =>
    exam &&
    add.mutate(
      { examId: exam.id, classIds: chosen },
      { onSuccess: () => { toast.success(t("done", { count: chosen.length })); close(); }, onError: (e) => toast.error(describeError(e)) },
    );

  return (
    <Dialog open={!!exam} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("none")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
            {available.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={chosen.includes(c.id)}
                  onChange={(e) => setChosen((ids) => (e.target.checked ? [...ids, c.id] : ids.filter((id) => id !== c.id)))}
                />
                {c.name}
              </label>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={add.isPending}>
            {t("cancel")}
          </Button>
          <Button onClick={submit} disabled={add.isPending || chosen.length === 0}>
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteExamDialog({ exam, onClose, onDeleted }: { exam: Exam | null; onClose: () => void; onDeleted: () => void }) {
  const t = useTranslations("school.exams.detail.deleteDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const remove = useDeleteExam();

  const confirm = () =>
    exam &&
    remove.mutate(exam.id, {
      onSuccess: () => {
        toast.success(t("done", { name: name(exam) }));
        onClose();
        onDeleted();
      },
      onError: (e) => toast.error(describeError(e)),
    });

  return (
    <AlertDialog open={!!exam} onOpenChange={(open) => !open && !remove.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name: exam ? name(exam) : "" })}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>{tCommon("cancel")}</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={remove.isPending}>
            {remove.isPending ? t("working") : t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
