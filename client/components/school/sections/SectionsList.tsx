"use client";

import { AlertTriangle, MoreHorizontal, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCan } from "@/lib/auth/hooks";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useClasses } from "@/lib/school/classes";
import { useDeleteSection, useSections, type Section } from "@/lib/school/sections";
import { cn } from "@/lib/utils";
import { AddSectionsDialog } from "./AddSectionsDialog";
import { RenameSectionDialog } from "./RenameSectionDialog";
import { SectionSettingsDialog } from "./SectionSettingsDialog";

const ALL = "all";
const COLUMNS = ["class", "section", "classTeacher", "students", "hours", "bellSchedule"] as const;

export function SectionsList() {
  const t = useTranslations("school.sections");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const can = useCan();
  const { data, isPending, isError, error, isFetching, refetch } = useSections();
  const { data: classList } = useClasses();

  const [classFilter, setClassFilter] = useState(ALL);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<Section | null>(null);
  const [configuring, setConfiguring] = useState<Section | null>(null);
  const [deleting, setDeleting] = useState<Section | null>(null);

  const classes = classList?.items ?? [];
  const year = data?.academicYear ?? null;
  const sections = (data?.items ?? []).filter((s) => classFilter === ALL || s.class.id === classFilter);

  const permissions = {
    configure: can("section:configure") && !!year,
    rename: can("section:update"),
    delete: can("section:delete"),
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {can("section:create") && (
          <Button onClick={() => setAdding(true)} disabled={classes.length === 0}>
            <Plus /> {t("add")}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-48" aria-label={t("columns.class")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allClasses")}</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {data && (
          <span className="text-sm text-muted-foreground">
            {year ? t("settingsFor", { year: year.name }) : t("noYear")}
          </span>
        )}
      </div>

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
            ) : sections.length === 0 ? (
              <MessageRow>
                <p>{classFilter === ALL ? t("empty") : t("emptyFiltered")}</p>
              </MessageRow>
            ) : (
              sections.map((section) => (
                <SectionRow
                  key={section.id}
                  section={section}
                  permissions={permissions}
                  onConfigure={() => setConfiguring(section)}
                  onRename={() => setRenaming(section)}
                  onDelete={() => setDeleting(section)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AddSectionsDialog
        open={adding}
        classes={classes}
        initialClassIds={classFilter === ALL ? [] : [classFilter]}
        onClose={() => setAdding(false)}
      />
      <RenameSectionDialog section={renaming} onClose={() => setRenaming(null)} />
      <SectionSettingsDialog section={configuring} year={year} onClose={() => setConfiguring(null)} />
      <DeleteSectionDialog section={deleting} onClose={() => setDeleting(null)} />
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

function SectionRow({
  section,
  permissions,
  onConfigure,
  onRename,
  onDelete,
}: {
  section: Section;
  permissions: { configure: boolean; rename: boolean; delete: boolean };
  onConfigure: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("school.sections");
  const format = useFormatter();
  const name = useLocalizedName();
  const info = section.yearInfo;
  const config = info?.config ?? null;
  const notSet = <span className="text-muted-foreground">{t("notSet")}</span>;
  const anyAction = permissions.configure || permissions.rename || permissions.delete;

  return (
    <TableRow>
      <TableCell className="font-medium">{section.class.name}</TableCell>
      <TableCell>
        {section.isDefault ? <span className="text-muted-foreground">{t("wholeClass")}</span> : section.name}
      </TableCell>
      <TableCell>{config?.classTeacherMembership
          ? config.classTeacherMembership.teacherProfile
            ? name(config.classTeacherMembership.teacherProfile)
            : config.classTeacherMembership.user.fullname
          : notSet}</TableCell>
      <TableCell className="whitespace-nowrap">
        {!info ? (
          "—"
        ) : config?.capacity != null ? (
          <span className={cn("inline-flex items-center gap-1", info.isOverCapacity && "text-destructive")}>
            {info.isOverCapacity && <AlertTriangle className="size-3.5" aria-label={t("overCapacity")} />}
            {t("studentsOf", { count: info.activeStudents, capacity: config.capacity })}
          </span>
        ) : (
          format.number(info.activeStudents)
        )}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {config?.startTime && config.endTime ? `${config.startTime} – ${config.endTime}` : notSet}
      </TableCell>
      <TableCell>{config?.periodTemplate ? name(config.periodTemplate) : notSet}</TableCell>
      <TableCell>
        {anyAction && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label={t("columns.actions")}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {permissions.configure && (
                <DropdownMenuItem onSelect={onConfigure}>
                  <Settings2 /> {t("settings")}
                </DropdownMenuItem>
              )}
              {permissions.rename && (
                <DropdownMenuItem onSelect={onRename}>
                  <Pencil /> {t("rename")}
                </DropdownMenuItem>
              )}
              {permissions.delete && (
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

function DeleteSectionDialog({ section, onClose }: { section: Section | null; onClose: () => void }) {
  const t = useTranslations("school.sections");
  const tDialog = useTranslations("school.sections.deleteDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const remove = useDeleteSection();
  const label = section ? `${section.class.name} ${section.isDefault ? t("wholeClass") : section.name}` : "";

  const confirm = () => {
    if (!section) return;
    remove.mutate(section.id, {
      onSuccess: () => {
        toast.success(tDialog("deleted", { name: label }));
        onClose();
      },
      onError: (error) => toast.error(describeError(error)),
    });
  };

  return (
    <AlertDialog open={!!section} onOpenChange={(open) => !open && !remove.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tDialog("title", { name: label })}</AlertDialogTitle>
          <AlertDialogDescription>{tDialog("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>{tCommon("cancel")}</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={remove.isPending}>
            {remove.isPending ? tDialog("deleting") : tDialog("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
