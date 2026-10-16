"use client";

import { Copy, Lock, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  useCopyGradingScale,
  useDeleteGradingScale,
  useGradingScaleList,
  type GradingScale,
} from "@/lib/school/grading";
import { GradingScaleFormDialog } from "./GradingScaleFormDialog";

/** The school's grading scales: marks % to grade and point, GPA to grade. */
export function GradingScales({ canManage }: { canManage: boolean }) {
  const t = useTranslations("school.exams.scales");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const { data, isPending, isError, error, refetch } = useGradingScaleList();
  const [form, setForm] = useState<{ scale: GradingScale | null } | null>(null);
  const [copying, setCopying] = useState<GradingScale | null>(null);
  const [deleting, setDeleting] = useState<GradingScale | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">{t("description")}</p>
        {canManage && (
          <Button onClick={() => setForm({ scale: null })}>
            <Plus /> {t("add")}
          </Button>
        )}
      </div>

      {isPending ? (
        <Skeleton className="h-72" />
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
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((scale) => (
            <ScaleCard
              key={scale.id}
              scale={scale}
              canManage={canManage}
              onEdit={() => setForm({ scale })}
              onCopy={() => setCopying(scale)}
              onDelete={() => setDeleting(scale)}
            />
          ))}
        </div>
      )}

      <GradingScaleFormDialog open={!!form} scale={form?.scale ?? null} onClose={() => setForm(null)} />
      <CopyScaleDialog scale={copying} onClose={() => setCopying(null)} />
      <DeleteScaleDialog scale={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function ScaleCard({
  scale,
  canManage,
  onEdit,
  onCopy,
  onDelete,
}: {
  scale: GradingScale;
  canManage: boolean;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("school.exams.scales");
  const format = useFormatter();
  const num = (v: string) => format.number(Number(v), { maximumFractionDigits: 2 });
  const inUse = scale._count.classSettings + scale._count.classSubjects > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            {scale.name}
            {scale.isLocked && (
              <Badge variant="secondary" className="gap-1">
                <Lock className="size-3" /> {t("locked")}
              </Badge>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {t("maxGpa", { gpa: num(scale.maxGpa) })} · {t("usedBy", { classes: scale._count.classSettings, subjects: scale._count.classSubjects })}
          </p>
          {scale.description && <p className="text-xs text-muted-foreground">{scale.description}</p>}
        </div>
        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label={t("actions")}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={onEdit} disabled={scale.isLocked}>
                <Pencil /> {scale.isLocked ? t("editLocked") : t("edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onCopy}>
                <Copy /> {t("copy")}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={onDelete} disabled={inUse || scale.isLocked}>
                <Trash2 /> {inUse || scale.isLocked ? t("deleteInUse") : t("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="pb-1 text-left font-medium">{t("marks")}</th>
              <th className="pb-1 text-left font-medium">{t("grade")}</th>
              <th className="pb-1 text-right font-medium">{t("point")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {scale.markBands.map((b, i) => {
              const next = scale.markBands[i - 1];
              return (
                <tr key={b.minPercent}>
                  <td className="py-1 tabular-nums">
                    {next ? `${num(b.minPercent)}–<${num(next.minPercent)}%` : `${num(b.minPercent)}–100%`}
                  </td>
                  <td className="py-1 font-medium">{b.grade}</td>
                  <td className="py-1 text-right tabular-nums">{format.number(Number(b.point), { minimumFractionDigits: 2 })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="pb-1 text-left font-medium">{t("gpa")}</th>
              <th className="pb-1 text-right font-medium">{t("grade")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {scale.gpaBands.map((b) => (
              <tr key={b.minGpa}>
                <td className="py-1 tabular-nums">{t("fromGpa", { gpa: format.number(Number(b.minGpa), { minimumFractionDigits: 2 }) })}</td>
                <td className="py-1 text-right font-medium">{b.grade}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ul className="space-y-0.5 text-xs text-muted-foreground sm:col-span-2">
          {scale.failIfAnyCompulsoryFails && <li>• {t("ruleFailAny", { grade: scale.failGrade })}</li>}
          {scale.optionalBonusEnabled && <li>• {t("ruleBonus", { threshold: num(scale.optionalBonusThreshold) })}</li>}
        </ul>
      </CardContent>
    </Card>
  );
}

function CopyScaleDialog({ scale, onClose }: { scale: GradingScale | null; onClose: () => void }) {
  const t = useTranslations("school.exams.scales.copyDialog");
  const describeError = useErrorMessage();
  const copy = useCopyGradingScale();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setName("");
    setError(null);
    onClose();
  };
  const submit = () => {
    if (!scale) return;
    if (!name.trim()) return setError(t("nameRequired"));
    copy.mutate(
      { scaleId: scale.id, name: name.trim() },
      {
        onSuccess: () => {
          toast.success(t("done", { name: name.trim() }));
          close();
        },
        onError: (e) => setError(describeError(e)),
      },
    );
  };

  return (
    <Dialog open={!!scale} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title", { name: scale?.name ?? "" })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <FormError message={error} />
        <div className="space-y-2">
          <Label htmlFor="copy-name" required>
            {t("name")}
          </Label>
          <Input id="copy-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={scale ? `${scale.name} (2)` : ""} maxLength={50} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={copy.isPending}>
            {t("cancel")}
          </Button>
          <Button onClick={submit} disabled={copy.isPending}>
            {copy.isPending ? t("working") : t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteScaleDialog({ scale, onClose }: { scale: GradingScale | null; onClose: () => void }) {
  const t = useTranslations("school.exams.scales.deleteDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const remove = useDeleteGradingScale();

  const confirm = () => {
    if (!scale) return;
    remove.mutate(scale.id, {
      onSuccess: () => {
        toast.success(t("done", { name: scale.name }));
        onClose();
      },
      onError: (e) => toast.error(describeError(e)),
    });
  };

  return (
    <AlertDialog open={!!scale} onOpenChange={(open) => !open && !remove.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name: scale?.name ?? "" })}</AlertDialogTitle>
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
