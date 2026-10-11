"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCan } from "@/lib/auth/hooks";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useCreateGroup, useDeleteGroup, useGroups, useUpdateGroup, type Group } from "@/lib/school/groups";
import { cn } from "@/lib/utils";
import { schoolNamesSchema, type NamesInput, type NamesOutput } from "@/zod/names";
import { NameFields, useSchoolLanguage } from "../NameFields";

const COLUMNS = ["name", "students", "subjects"] as const;

export function GroupsList() {
  const t = useTranslations("school.groups");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const can = useCan();
  const { data, isPending, isError, error, isFetching, refetch } = useGroups();

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState<Group | null>(null);

  const groups = data?.items ?? [];
  const canUpdate = can("group:update");
  const canDelete = can("group:delete");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {can("group:create") && (
          <Button onClick={() => setAdding(true)}>
            <Plus /> {t("add")}
          </Button>
        )}
      </div>

      {data?.academicYear && (
        <p className="text-sm text-muted-foreground">{t("inYear", { year: data.academicYear.name })}</p>
      )}

      <div className={cn("rounded-md border transition-opacity", isFetching && !isPending && "opacity-60")}>
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((column) => (
                <TableHead key={column}>{t(`columns.${column}`)}</TableHead>
              ))}
              <TableHead className="w-12">
                <span className="sr-only">{t("columns.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 3 }, (_, i) => (
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
            ) : groups.length === 0 ? (
              <MessageRow>
                <p>{t("empty")}</p>
              </MessageRow>
            ) : (
              groups.map((group) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  onEdit={() => setEditing(group)}
                  onDelete={() => setDeleting(group)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <GroupFormDialog
        open={adding || !!editing}
        group={editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
      />
      <DeleteGroupDialog group={deleting} onClose={() => setDeleting(null)} />
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

function GroupRow({
  group,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: {
  group: Group;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("school.groups");
  const format = useFormatter();
  const name = useLocalizedName();
  const language = useSchoolLanguage();
  // the name in the other language, under the main one
  const other = language === "BN" ? group.nameEn : group.nameBn;

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{name(group)}</div>
        {other && other !== name(group) && <div className="text-xs text-muted-foreground">{other}</div>}
      </TableCell>
      <TableCell>{group.yearInfo ? format.number(group.yearInfo.activeStudents) : "—"}</TableCell>
      <TableCell>{group.yearInfo ? format.number(group.yearInfo.subjects) : "—"}</TableCell>
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

function GroupFormDialog({ open, group, onClose }: { open: boolean; group: Group | null; onClose: () => void }) {
  const t = useTranslations("school.groups.form");
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{group ? t("editTitle") : t("addTitle")}</DialogTitle>
        </DialogHeader>
        {open && <GroupForm key={group?.id ?? "new"} group={group} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function GroupForm({ group, onDone }: { group: Group | null; onDone: () => void }) {
  const t = useTranslations("school.groups.form");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const language = useSchoolLanguage();
  const create = useCreateGroup();
  const update = useUpdateGroup();
  const [formError, setFormError] = useState<string | null>(null);
  const saving = create.isPending || update.isPending;

  const form = useForm<NamesInput, unknown, NamesOutput>({
    resolver: zodResolver(schoolNamesSchema(language, 50)),
    defaultValues: { nameEn: group?.nameEn ?? "", nameBn: group?.nameBn ?? "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const saved = group
        ? await update.mutateAsync({ groupId: group.id, body: values })
        : await create.mutateAsync(values);
      toast.success(t(group ? "updated" : "created", { name: name(saved) }));
      onDone();
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, ["nameEn", "nameBn"], describeError));
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />
        <NameFields control={form.control} labels={{ nameEn: t("nameEn"), nameBn: t("nameBn") }} autoFocus />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone} disabled={saving}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function DeleteGroupDialog({ group, onClose }: { group: Group | null; onClose: () => void }) {
  const t = useTranslations("school.groups.deleteDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const remove = useDeleteGroup();

  const confirm = () => {
    if (!group) return;
    remove.mutate(group.id, {
      onSuccess: () => {
        toast.success(t("deleted", { name: name(group) }));
        onClose();
      },
      onError: (error) => toast.error(describeError(error)),
    });
  };

  return (
    <AlertDialog open={!!group} onOpenChange={(open) => !open && !remove.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name: group ? name(group) : "" })}</AlertDialogTitle>
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
