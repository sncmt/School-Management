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
import { ArrowDownUp, ClipboardList, GripVertical, MoreHorizontal, Plus, Trash2 } from "lucide-react";
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
  type ClassSubject,
} from "@/lib/school/classSubjects";
import { useClasses } from "@/lib/school/classes";
import { cn } from "@/lib/utils";
import { AddClassSubjectsDialog } from "./AddClassSubjectsDialog";
import { MarksSetupDialog } from "./MarksSetupDialog";

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {canManage && (
          <Button onClick={() => setAdding(true)} disabled={!schoolClass || noYear}>
            <Plus /> {t("add")}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={classId ?? ""} onValueChange={chooseClass} disabled={classes.length === 0}>
          <SelectTrigger className="w-48" aria-label={t("class")}>
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
  onRemove,
}: {
  item: ClassSubject;
  permissions: { manage: boolean; marks: boolean };
  onMarks: () => void;
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

  const otherType = item.type === "COMPULSORY" ? "OPTIONAL" : "COMPULSORY";
  const changeType = () =>
    setType.mutate(
      { classSubjectId: item.id, type: otherType },
      {
        onSuccess: () => toast.success(t("typeChanged", { subject: name(item.subject), type: t(`types.${otherType}`) })),
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
        <Badge variant={item.type === "OPTIONAL" ? "outline" : "default"}>{t(`types.${item.type}`)}</Badge>
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
                  <DropdownMenuItem onSelect={changeType} disabled={setType.isPending}>
                    <ArrowDownUp /> {item.type === "COMPULSORY" ? t("actions.makeOptional") : t("actions.makeCompulsory")}
                  </DropdownMenuItem>
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
