"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDownUp, ClipboardList, GripVertical, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
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
import { getErrorStatus } from "@/lib/api/errors";
import { useCan } from "@/lib/auth/hooks";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  useClassSubjects,
  useRemoveClassSubject,
  useReorderClassSubjects,
  useSetClassSubjectType,
  useSetElectiveRule,
  type ClassSubjectList,
  type ClassSubject,
} from "@/lib/school/classSubjects";
import { useClasses } from "@/lib/school/classes";
import { cn } from "@/lib/utils";
import { AddClassSubjectsDialog } from "./AddClassSubjectsDialog";
import { MarksSetupDialog } from "./MarksSetupDialog";
import { EditClassSubjectDialog } from "./EditClassSubjectDialog";
import { PageHero } from "@/components/layout/PageHero";

const COLUMN_COUNT = 7; // handle, code, subject, for, type, marks, actions

export function ClassSubjectsList() {
  const t = useTranslations("school.classSubjects");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const can = useCan();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data: classList, isPending: classesPending } = useClasses();
  const classes = classList?.items ?? [];
  // the chosen class is kept in the URL (?class=...); the first class by default
  const classId = classes.find((c) => c.id === searchParams.get("class"))?.id ?? classes[0]?.id ?? null;
  const schoolClass = classes.find((c) => c.id === classId) ?? null;

  const { data, isPending, isError, error, isFetching, refetch } = useClassSubjects(classId);
  const reorder = useReorderClassSubjects();

  const [adding, setAdding] = useState(false);
  const [settingMarks, setSettingMarks] = useState<ClassSubject | null>(null);
  const [editing, setEditing] = useState<ClassSubject | null>(null);
  const [removing, setRemoving] = useState<ClassSubject | null>(null);

  const items = data?.items ?? [];
  const canManage = can("class_subject:manage");
  const permissions = { manage: canManage, marks: can("grading:manage") };
  // no current academic year: the server answers 400 and the page explains
  const noYear = isError && getErrorStatus(error) === 400;

  const chooseClass = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("class", id);
    router.replace(`${window.location.pathname}?${next}`, { scroll: false });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || !classId) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    const classSubjectIds = arrayMove(items, from, to).map((i) => i.id);
    reorder.mutate(
      { classId, classSubjectIds },
      {
        onSuccess: () => toast.success(t("orderSaved")),
        onError: (e) => toast.error(describeError(e)),
      },
    );
  };

  return (
    <div className="space-y-2">
      <PageHero
        title={t("title")}
        description={t("description")}
        actions={
          <>
            {canManage && (
              <Button onClick={() => setAdding(true)} disabled={!schoolClass || noYear}>
                <Plus /> {t("add")}
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-end gap-3">
        <Select value={classId ?? ""} onValueChange={chooseClass} disabled={classes.length === 0}>
          <SelectTrigger className="w-48" label={t("class")} required>
            <SelectValue placeholder={t("chooseClass")} />
          </SelectTrigger>
          <SelectContent>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {data && <span className="text-sm text-muted-foreground">{t("forYear", { year: data.academicYear.name })}</span>}
        {canManage && items.length > 1 && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <ArrowDownUp className="size-3.5" /> {t("dragHint")}
          </span>
        )}
      </div>

      {data && classId && <ElectiveRules data={data} classId={classId} canManage={canManage} />}

      <div className={cn("rounded-md border transition-opacity", (isFetching || reorder.isPending) && !isPending && "opacity-60")}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead className="w-20">{t("columns.code")}</TableHead>
                <TableHead>{t("columns.subject")}</TableHead>
                <TableHead>{t("columns.for")}</TableHead>
                <TableHead>{t("columns.type")}</TableHead>
                <TableHead>{t("columns.marks")}</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">{t("columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classesPending || (classId && isPending) ? (
                Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: COLUMN_COUNT }, (_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : classes.length === 0 ? (
                <MessageRow>
                  <p>{t("noClasses")}</p>
                </MessageRow>
              ) : noYear ? (
                <MessageRow>
                  <p>{t("noYear")}</p>
                </MessageRow>
              ) : isError ? (
                <MessageRow>
                  <p>{t("loadFailed")}</p>
                  <p className="text-xs">{describeError(error)}</p>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    {tCommon("tryAgain")}
                  </Button>
                </MessageRow>
              ) : items.length === 0 ? (
                <MessageRow>
                  <p>{t("empty")}</p>
                </MessageRow>
              ) : (
                <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  {items.map((item) => (
                    <ClassSubjectRow
                      key={item.id}
                      item={item}
                      permissions={permissions}
                      onMarks={() => setSettingMarks(item)}
                      onEdit={() => setEditing(item)}
                      onRemove={() => setRemoving(item)}
                    />
                  ))}
                </SortableContext>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      <AddClassSubjectsDialog open={adding} schoolClass={schoolClass} assigned={items} onClose={() => setAdding(false)} />
      <MarksSetupDialog classSubject={settingMarks} onClose={() => setSettingMarks(null)} />
      <EditClassSubjectDialog item={editing} onClose={() => setEditing(null)} />
      <RemoveDialog item={removing} className={schoolClass?.name ?? ""} onClose={() => setRemoving(null)} />
    </div>
  );
}

function MessageRow({ children }: { children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={COLUMN_COUNT} className="h-32">
        <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
          {children}
        </div>
      </TableCell>
    </TableRow>
  );
}

function ClassSubjectRow({
  item,
  permissions,
  onMarks,
  onEdit,
  onRemove,
}: {
  item: ClassSubject;
  permissions: { manage: boolean; marks: boolean };
  onMarks: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations("school.classSubjects");
  const format = useFormatter();
  const name = useLocalizedName();
  const describeError = useErrorMessage();
  const setType = useSetClassSubjectType();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !permissions.manage,
  });

  // the other two kinds it can become
  const otherTypes = (["COMPULSORY", "OPTIONAL", "ELECTIVE"] as const).filter((type) => type !== item.type);
  const changeType = (type: (typeof otherTypes)[number]) =>
    setType.mutate(
      { classSubjectId: item.id, type },
      {
        onSuccess: () => toast.success(t("typeChanged", { subject: name(item.subject), type: t(`types.${type}`) })),
        onError: (e) => toast.error(describeError(e)),
      },
    );

  const marks =
    item.fullMarks != null && item.passMarks != null
      ? t("marksSummary", { full: Number(item.fullMarks), pass: Number(item.passMarks) })
      : null;

  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "relative z-10 bg-muted shadow-md")}
    >
      <TableCell>
        {permissions.manage && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="flex size-7 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
            aria-label={t("dragHandle")}
          >
            <GripVertical className="size-4" />
          </button>
        )}
      </TableCell>
      <TableCell className="font-mono text-xs">{item.subject.code ?? "—"}</TableCell>
      <TableCell>
        <div className="font-medium">{name(item.subject)}</div>
        {item.subject.parent && <div className="text-xs text-muted-foreground">{name(item.subject.parent)}</div>}
      </TableCell>
      <TableCell>
        {item.group ? <Badge variant="secondary">{name(item.group)}</Badge> : <span className="text-muted-foreground">{t("wholeClass")}</span>}
      </TableCell>
      <TableCell>
        <Badge variant={item.type === "OPTIONAL" ? "outline" : item.type === "ELECTIVE" ? "secondary" : "default"}>
          {t(`types.${item.type}`)}
        </Badge>
      </TableCell>
      <TableCell className="text-sm">
        {marks ? (
          <div>
            <div>{marks}</div>
            {item.parts.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {item.parts.map((p) => `${p.name} ${format.number(Number(p.fullMarks))}`).join(" + ")}
              </div>
            )}
            {item.gradingScale && (
              <div className="text-xs text-muted-foreground">{t("ownScale", { name: item.gradingScale.name })}</div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">{t("marksNotSet")}</span>
        )}
      </TableCell>
      <TableCell>
        {(permissions.manage || permissions.marks) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label={t("columns.actions")}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {permissions.marks && (
                <DropdownMenuItem onSelect={onMarks}>
                  <ClipboardList /> {t("actions.marks")}
                </DropdownMenuItem>
              )}
              {permissions.manage && (
                <>
                  <DropdownMenuItem onSelect={onEdit}>
                    <Pencil /> {t("actions.edit")}
                  </DropdownMenuItem>
                  {otherTypes.map((type) => (
                    <DropdownMenuItem key={type} onSelect={() => changeType(type)} disabled={setType.isPending}>
                      <ArrowDownUp />{" "}
                      {type === "COMPULSORY" ? t("actions.makeCompulsory") : type === "OPTIONAL" ? t("actions.makeOptional") : t("actions.makeElective")}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={onRemove}>
                    <Trash2 /> {t("actions.remove")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );
}

function RemoveDialog({ item, className, onClose }: { item: ClassSubject | null; className: string; onClose: () => void }) {
  const t = useTranslations("school.classSubjects.removeDialog");
  const tCommon = useTranslations("common");
  const name = useLocalizedName();
  const describeError = useErrorMessage();
  const remove = useRemoveClassSubject();

  const confirm = () => {
    if (!item) return;
    remove.mutate(item.id, {
      onSuccess: () => {
        toast.success(t("removed", { subject: name(item.subject) }));
        onClose();
      },
      onError: (e) => toast.error(describeError(e)),
    });
  };

  return (
    <AlertDialog open={!!item} onOpenChange={(open) => !open && !remove.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { subject: item ? name(item.subject) : "", className })}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>{tCommon("cancel")}</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={remove.isPending}>
            {remove.isPending ? t("removing") : t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/*
 * For each group (or the whole class) with "main or 4th" subjects: how many its students take
 * as main. At least one has to be left for the 4th list, so the most is one less than there are.
 */
function ElectiveRules({ data, classId, canManage }: { data: ClassSubjectList; classId: string; canManage: boolean }) {
  const t = useTranslations("school.classSubjects.electives");
  const name = useLocalizedName();
  const describeError = useErrorMessage();
  const setRule = useSetElectiveRule();

  const electives = data.items.filter((i) => i.type === "ELECTIVE");
  if (electives.length === 0) return null;

  // the whole-class ones count for every group
  const wholeClass = electives.filter((e) => !e.group);
  const groups = [...new Map(electives.flatMap((e) => (e.group ? [[e.group.id, e.group] as const] : []))).values()];
  const rows = [
    ...(wholeClass.length > 0 || groups.length === 0 ? [{ groupId: null, label: t("wholeClass"), subjects: wholeClass }] : []),
    ...groups.map((g) => ({ groupId: g.id, label: name(g), subjects: [...wholeClass, ...electives.filter((e) => e.group?.id === g.id)] })),
  ];
  const countOf = (groupId: string | null) =>
    data.electiveRules?.find((r) => r.classId === classId && r.groupId === groupId)?.mainCount ??
    data.electiveRules?.find((r) => r.classId === classId && r.groupId === null)?.mainCount ??
    1;

  const save = (groupId: string | null, mainCount: number) =>
    setRule.mutate(
      { academicYearId: data.academicYear.id, classId, groupId, mainCount },
      { onSuccess: () => toast.success(t("saved")), onError: (e) => toast.error(describeError(e)) },
    );

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <p className="text-sm font-medium">{t("title")}</p>
      <p className="text-xs text-muted-foreground">{t("hint")}</p>
      <div className="space-y-2">
        {rows.map((row) => {
          const most = Math.max(1, row.subjects.length - 1);
          return (
            <div key={row.groupId ?? "class"} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-28 font-medium">{row.label}</span>
              <span className="text-muted-foreground">{t("takes")}</span>
              <Select
                value={String(Math.min(countOf(row.groupId), most))}
                onValueChange={(v) => save(row.groupId, Number(v))}
                disabled={!canManage || row.subjects.length < 2 || setRule.isPending}
              >
                <SelectTrigger className="h-8 w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: most }, (_, i) => i + 1).map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">
                {t("ofThese", { subjects: row.subjects.map((s) => name(s.subject)).join(", ") })}
              </span>
              {row.subjects.length < 2 && <span className="text-xs text-amber-700 dark:text-amber-400">{t("needTwo")}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
