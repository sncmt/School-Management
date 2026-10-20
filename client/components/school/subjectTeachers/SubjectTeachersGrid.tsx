"use client";

import { Pencil, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getErrorStatus } from "@/lib/api/errors";
import { useCan } from "@/lib/auth/hooks";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useClassSubjects, type ClassSubject } from "@/lib/school/classSubjects";
import { useClasses } from "@/lib/school/classes";
import { useWorkingTeachers, type TeacherOption } from "@/lib/school/pickers";
import { useSections, type Section } from "@/lib/school/sections";
import { useSetSubjectTeachers, useSubjectTeachers } from "@/lib/school/subjectTeachers";
import { cn } from "@/lib/utils";

type Cell = { classSubject: ClassSubject; section: Section; teacherIds: string[] };

/** One class at a time: its subjects down the side, its sections across, teachers in the cells. */
export function SubjectTeachersGrid() {
  const t = useTranslations("school.subjectTeachers");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const can = useCan();
  const name = useLocalizedName();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: classList, isPending: classesPending } = useClasses();
  const classes = classList?.items ?? [];
  // the chosen class is kept in the URL (?class=...); the first class by default
  const classId = classes.find((c) => c.id === searchParams.get("class"))?.id ?? classes[0]?.id ?? null;

  const subjects = useClassSubjects(classId);
  const assignments = useSubjectTeachers(classId);
  const { data: sectionList } = useSections();
  const sections = (sectionList?.items ?? []).filter((s) => s.class.id === classId);

  const [editing, setEditing] = useState<Cell | null>(null);
  const canAssign = can("teacher:assign");

  // teacher ids by "classSubjectId:sectionId", and each teacher's name
  const { byCell, teacherName } = useMemo(() => {
    const byCell = new Map<string, string[]>();
    const teacherName = new Map<string, string>();
    for (const a of assignments.data?.items ?? []) {
      const key = `${a.classSubject.id}:${a.section.id}`;
      byCell.set(key, [...(byCell.get(key) ?? []), a.teacher.id]);
      teacherName.set(a.teacher.id, name(a.teacher));
    }
    return { byCell, teacherName };
  }, [assignments.data, name]);

  const chooseClass = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("class", id);
    router.replace(`${window.location.pathname}?${next}`, { scroll: false });
  };

  const loading = classesPending || (!!classId && (subjects.isPending || assignments.isPending));
  const error = subjects.error ?? assignments.error;
  // no current academic year: the server answers 400
  const noYear = !!error && getErrorStatus(error) === 400;
  const rows = subjects.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={classId ?? ""} onValueChange={chooseClass} disabled={classes.length === 0}>
          <SelectTrigger className="w-48" aria-label={t("class")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {assignments.data && (
          <span className="text-sm text-muted-foreground">{t("forYear", { year: assignments.data.academicYear.name })}</span>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : classes.length === 0 ? (
        <Message>{t("noClasses")}</Message>
      ) : noYear ? (
        <Message>{t("noYear")}</Message>
      ) : error ? (
        <Message>
          <p>{t("loadFailed")}</p>
          <p className="text-xs">{describeError(error)}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              subjects.refetch();
              assignments.refetch();
            }}
          >
            {tCommon("tryAgain")}
          </Button>
        </Message>
      ) : rows.length === 0 ? (
        <Message>{t("noSubjects")}</Message>
      ) : (
        <div className={cn("overflow-x-auto rounded-md border", (subjects.isFetching || assignments.isFetching) && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-48">{t("subject")}</TableHead>
                {sections.map((section) => (
                  <TableHead key={section.id} className="min-w-44">
                    {section.isDefault ? t("wholeClass") : section.name}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((classSubject) => (
                <TableRow key={classSubject.id}>
                  <TableCell>
                    <div className="font-medium">{name(classSubject.subject)}</div>
                    {classSubject.group && <div className="text-xs text-muted-foreground">{name(classSubject.group)}</div>}
                  </TableCell>
                  {sections.map((section) => {
                    const teacherIds = byCell.get(`${classSubject.id}:${section.id}`) ?? [];
                    return (
                      <TableCell key={section.id} className="align-top">
                        <div className="group flex items-start gap-1">
                          <div className="flex flex-1 flex-wrap gap-1">
                            {teacherIds.length === 0 ? (
                              <span className="text-sm text-muted-foreground">{t("notAssigned")}</span>
                            ) : (
                              teacherIds.map((id) => (
                                <Badge key={id} variant="secondary">
                                  {teacherName.get(id)}
                                </Badge>
                              ))
                            )}
                          </div>
                          {canAssign && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 shrink-0 opacity-60 group-hover:opacity-100"
                              onClick={() => setEditing({ classSubject, section, teacherIds })}
                              aria-label={t("edit")}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AssignDialog cell={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border py-16 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function AssignDialog({ cell, onClose }: { cell: Cell | null; onClose: () => void }) {
  const t = useTranslations("school.subjectTeachers");
  const name = useLocalizedName();
  return (
    <Dialog open={!!cell} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {cell
              ? t("dialog.title", {
                  subject: name(cell.classSubject.subject),
                  section: cell.section.isDefault ? cell.section.class.name : `${cell.section.class.name} ${cell.section.name}`,
                })
              : null}
          </DialogTitle>
          <DialogDescription>{t("dialog.description")}</DialogDescription>
        </DialogHeader>
        {cell && <AssignForm key={`${cell.classSubject.id}:${cell.section.id}`} cell={cell} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function AssignForm({ cell, onDone }: { cell: Cell; onDone: () => void }) {
  const t = useTranslations("school.subjectTeachers");
  const name = useLocalizedName();
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const teachers = useWorkingTeachers();
  const save = useSetSubjectTeachers();
  const [selected, setSelected] = useState<string[]>(cell.teacherIds);
  const [search, setSearch] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const shown = (teachers.data ?? []).filter((teacher: TeacherOption) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      teacher.nameEn.toLowerCase().includes(q) ||
      teacher.nameBn.includes(q) ||
      teacher.designation?.toLowerCase().includes(q)
    );
  });

  const submit = () => {
    setFormError(null);
    save.mutate(
      { sectionId: cell.section.id, classSubjectId: cell.classSubject.id, teacherIds: selected },
      {
        onSuccess: () => {
          toast.success(t("dialog.saved"));
          onDone();
        },
        onError: (e) => setFormError(describeError(e)),
      },
    );
  };

  return (
    <div className="space-y-4">
      <FormError message={formError} />
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("dialog.searchPlaceholder")} className="pl-8" />
      </div>
      <div className="max-h-72 space-y-0.5 overflow-y-auto rounded-md border p-1">
        {teachers.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : (teachers.data ?? []).length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">{t("noTeachersYet")}</p>
        ) : (
          shown.map((teacher) => (
            <label key={teacher.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={selected.includes(teacher.id)}
                onChange={(e) =>
                  setSelected((prev) => (e.target.checked ? [...prev, teacher.id] : prev.filter((id) => id !== teacher.id)))
                }
              />
              <span className="flex-1">
                {name(teacher)}
                {teacher.designation && <span className="text-muted-foreground"> · {teacher.designation}</span>}
              </span>
              {teacher.status === "ON_LEAVE" && <Badge variant="outline">{t("dialog.onLeave")}</Badge>}
            </label>
          ))
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t("dialog.selected", { count: selected.length })}</p>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={save.isPending}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={submit} disabled={save.isPending}>
          {save.isPending ? t("dialog.saving") : t("dialog.save")}
        </Button>
      </DialogFooter>
    </div>
  );
}
