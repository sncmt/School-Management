"use client";

import { Coffee, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  useDeletePeriodTemplate,
  usePeriodTemplateList,
  useTimeLabel,
  type PeriodTemplate,
} from "@/lib/school/routine";
import { BellScheduleFormDialog } from "./BellScheduleFormDialog";

/** The school's bell schedules: the periods of a day, used by sections and schedule changes. */
export function BellSchedules({ canManage }: { canManage: boolean }) {
  const t = useTranslations("school.routine.bell");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const { data, isPending, isError, error, refetch } = usePeriodTemplateList();
  const [form, setForm] = useState<{ template: PeriodTemplate | null } | null>(null);
  const [deleting, setDeleting] = useState<PeriodTemplate | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
        {canManage && (
          <Button onClick={() => setForm({ template: null })}>
            <Plus /> {t("add")}
          </Button>
        )}
      </div>

      {isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
          <p>{t("loadFailed")}</p>
          <p className="text-xs">{describeError(error)}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {tCommon("tryAgain")}
          </Button>
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">{t("empty")}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              canManage={canManage}
              onEdit={() => setForm({ template })}
              onDelete={() => setDeleting(template)}
            />
          ))}
        </div>
      )}

      <BellScheduleFormDialog open={!!form} template={form?.template ?? null} onClose={() => setForm(null)} />
      <DeleteTemplateDialog template={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function TemplateCard({
  template,
  canManage,
  onEdit,
  onDelete,
}: {
  template: PeriodTemplate;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("school.routine.bell");
  const name = useLocalizedName();
  const time = useTimeLabel();
  const classPeriods = template.periods.filter((p) => !p.isBreak).length;
  const first = template.periods[0];
  const last = template.periods[template.periods.length - 1];
  const inUse = template._count.sectionConfigs > 0 || template._count.overrideRules > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{name(template)}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {first && last && `${time(first.startTime)} – ${time(last.endTime)} · `}
            {t("classPeriods", { count: classPeriods })}
          </p>
          <div className="flex flex-wrap gap-1">
            <Badge variant={template._count.sectionConfigs > 0 ? "default" : "outline"}>
              {t("usedBy", { count: template._count.sectionConfigs })}
            </Badge>
            {template._count.overrideRules > 0 && (
              <Badge variant="secondary">{t("usedByChanges", { count: template._count.overrideRules })}</Badge>
            )}
          </div>
        </div>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label={t("actions")}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil /> {t("edit")}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" disabled={inUse} onSelect={onDelete}>
                <Trash2 /> {inUse ? t("deleteInUse") : t("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent>
        <ol className="divide-y text-sm">
          {template.periods.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-1.5">
              <span className={p.isBreak ? "flex items-center gap-1.5 text-muted-foreground" : ""}>
                {p.isBreak && <Coffee className="size-3.5" />}
                {name(p)}
              </span>
              <span className="whitespace-nowrap text-muted-foreground tabular-nums">
                {time(p.startTime)} – {time(p.endTime)}
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function DeleteTemplateDialog({ template, onClose }: { template: PeriodTemplate | null; onClose: () => void }) {
  const t = useTranslations("school.routine.bell.deleteDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const remove = useDeletePeriodTemplate();

  const confirm = () => {
    if (!template) return;
    remove.mutate(template.id, {
      onSuccess: () => {
        toast.success(t("done", { name: name(template) }));
        onClose();
      },
      onError: (e) => toast.error(describeError(e)),
    });
  };

  return (
    <AlertDialog open={!!template} onOpenChange={(open) => !open && !remove.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name: template ? name(template) : "" })}</AlertDialogTitle>
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
