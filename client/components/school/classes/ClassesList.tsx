"use client";

import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCan } from "@/lib/auth/hooks";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useClasses, useDeleteClass, type SchoolClass } from "@/lib/school/classes";
import { cn } from "@/lib/utils";
import { ClassFormDialog } from "./ClassFormDialog";

const COLUMNS = ["level", "name", "sections", "students"] as const;

export function ClassesList() {
  const t = useTranslations("school.classes");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const can = useCan();
  const { data, isPending, isError, error, isFetching, refetch } = useClasses();

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<SchoolClass | null>(null);
  const [deleting, setDeleting] = useState<SchoolClass | null>(null);

  const classes = data?.items ?? [];
  const nextLevel = classes.length ? Math.min(30, Math.max(...classes.map((c) => c.numericLevel)) + 1) : 1;
  const canUpdate = can("class:update");
  const canDelete = can("class:delete");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {can("class:create") && (
          <Button onClick={() => setAdding(true)}>
            <Plus /> {t("add")}
          </Button>
        )}
      </div>

      <div className={cn("rounded-md border transition-opacity", isFetching && !isPending && "opacity-60")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">{t("columns.level")}</TableHead>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.sections")}</TableHead>
              <TableHead>
                {data?.academicYear ? t("studentsIn", { year: data.academicYear.name }) : t("columns.students")}
              </TableHead>
              <TableHead className="w-12">
                <span className="sr-only">{t("columns.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 4 }, (_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: COLUMNS.length + 1 }, (_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <MessageRow>
                <p>{t("loadFailed")}</p>
                <p className="text-xs">{describeError(error)}</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  {tCommon("tryAgain")}
                </Button>
              </MessageRow>
            ) : classes.length === 0 ? (
              <MessageRow>
                <p>{t("empty")}</p>
              </MessageRow>
            ) : (
              classes.map((schoolClass) => (
                <ClassRow
                  key={schoolClass.id}
                  schoolClass={schoolClass}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  onEdit={() => setEditing(schoolClass)}
                  onDelete={() => setDeleting(schoolClass)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ClassFormDialog
        open={adding || !!editing}
        schoolClass={editing}
        nextLevel={nextLevel}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
      />
      <DeleteClassDialog schoolClass={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function MessageRow({ children }: { children: React.ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={COLUMNS.length + 1} className="h-32">
        <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
          {children}
        </div>
      </TableCell>
    </TableRow>
  );
}

function ClassRow({
  schoolClass,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: {
  schoolClass: SchoolClass;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("school.classes");
  const format = useFormatter();
  // the automatic section of a class without sections has no name worth showing
  const named = schoolClass.sections.filter((s) => !s.isDefault);

  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{format.number(schoolClass.numericLevel)}</TableCell>
      <TableCell className="font-medium">{schoolClass.name}</TableCell>
      <TableCell>
        {named.length === 0 ? (
          <span className="text-sm text-muted-foreground">{t("noSections")}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {named.map((section) => (
              <Badge key={section.id} variant="secondary">
                {section.name}
              </Badge>
            ))}
          </div>
        )}
      </TableCell>
      <TableCell>{schoolClass.activeStudents === null ? "—" : format.number(schoolClass.activeStudents)}</TableCell>
      <TableCell>
        {(canUpdate || canDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label={t("columns.actions")}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canUpdate && (
                <DropdownMenuItem onSelect={onEdit}>
                  <Pencil /> {t("edit")}
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                  <Trash2 /> {t("delete")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );
}

function DeleteClassDialog({ schoolClass, onClose }: { schoolClass: SchoolClass | null; onClose: () => void }) {
  const t = useTranslations("school.classes.deleteDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const remove = useDeleteClass();

  const confirm = () => {
    if (!schoolClass) return;
    remove.mutate(schoolClass.id, {
      onSuccess: () => {
        toast.success(t("deleted", { name: schoolClass.name }));
        onClose();
      },
      onError: (error) => toast.error(describeError(error)),
    });
  };

  return (
    <AlertDialog open={!!schoolClass} onOpenChange={(open) => !open && !remove.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name: schoolClass?.name ?? "" })}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>{tCommon("cancel")}</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={remove.isPending}>
            {remove.isPending ? t("deleting") : t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
