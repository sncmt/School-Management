"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useFieldArray, useForm, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  STANDARD_GPA5,
  useCreateGradingScale,
  useUpdateGradingScale,
  type GradingScale,
} from "@/lib/school/grading";
import { scaleFormSchema, type ScaleFormInput, type ScaleFormValues } from "@/zod/grading";

const FIELDS: FieldPath<ScaleFormInput>[] = [
  "name", "description", "maxGpa", "failGrade", "optionalBonusThreshold", "markBands", "gpaBands",
];

// "5.00" -> "5", "3.50" -> "3.5": how people type them
const plain = (value: string | number) => String(Number(value));

const toInput = (scale: Pick<GradingScale, "description" | "maxGpa" | "failGrade" | "failIfAnyCompulsoryFails" | "optionalBonusEnabled" | "optionalBonusThreshold"> & {
  name: string;
  markBands: { minPercent: string | number; grade: string; point: string | number }[];
  gpaBands: { minGpa: string | number; grade: string }[];
}): ScaleFormInput => ({
  name: scale.name,
  description: scale.description ?? "",
  maxGpa: plain(scale.maxGpa),
  failGrade: scale.failGrade,
  failIfAnyCompulsoryFails: scale.failIfAnyCompulsoryFails,
  optionalBonusEnabled: scale.optionalBonusEnabled,
  optionalBonusThreshold: plain(scale.optionalBonusThreshold),
  markBands: scale.markBands.map((b) => ({ minPercent: plain(b.minPercent), grade: b.grade, point: plain(b.point) })),
  gpaBands: scale.gpaBands.map((b) => ({ minGpa: plain(b.minGpa), grade: b.grade })),
});

export function GradingScaleFormDialog({
  open,
  scale,
  onClose,
}: {
  open: boolean;
  scale: GradingScale | null;
  onClose: () => void;
}) {
  const t = useTranslations("school.exams.scales.form");
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{scale ? t("editTitle") : t("addTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open && <ScaleForm key={scale?.id ?? "new"} scale={scale} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function ScaleForm({ scale, onDone }: { scale: GradingScale | null; onDone: () => void }) {
  const t = useTranslations("school.exams.scales.form");
  const tAll = useTranslations();
  const describeError = useErrorMessage();
  const create = useCreateGradingScale();
  const update = useUpdateGradingScale();
  const [formError, setFormError] = useState<string | null>(null);
  const saving = create.isPending || update.isPending;

  const form = useForm<ScaleFormInput, unknown, ScaleFormValues>({
    resolver: zodResolver(scaleFormSchema),
    defaultValues: scale ? toInput(scale) : toInput({ ...STANDARD_GPA5, name: "GPA 5", description: null } as never),
  });
  const markBands = useFieldArray({ control: form.control, name: "markBands" });
  const gpaBands = useFieldArray({ control: form.control, name: "gpaBands" });
  const bonusOn = form.watch("optionalBonusEnabled");

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const body = { ...values, description: values.description || undefined };
    try {
      if (scale) await update.mutateAsync({ scaleId: scale.id, body });
      else await create.mutateAsync(body);
      toast.success(t(scale ? "updated" : "added", { name: values.name }));
      onDone();
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, FIELDS, describeError));
    }
  });

  const listError = (name: "markBands" | "gpaBands") => {
    const e = form.formState.errors[name];
    const message = e?.root?.message ?? e?.message;
    return message ? <p className="text-sm text-destructive">{tAll(message as never)}</p> : null;
  };

  const numberField = (name: FieldPath<ScaleFormInput>, label: string, hint?: string, required = true) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel required={required}>{label}</FormLabel>
          <FormControl>
            <Input inputMode="decimal" className="w-28" {...field} value={field.value as string} />
          </FormControl>
          {hint && <FormDescription>{hint}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const cell = (name: FieldPath<ScaleFormInput>, label: string, mode: "decimal" | "text" = "decimal") => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Input inputMode={mode} aria-label={label} className="h-8" {...field} value={field.value as string} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormError message={formError} />

        <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("name")}</FormLabel>
                <FormControl>
                  <Input placeholder="GPA 5" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {numberField("maxGpa", t("maxGpa"))}
          <FormField
            control={form.control}
            name="failGrade"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("failGrade")}</FormLabel>
                <FormControl>
                  <Input className="w-20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* marks % -> grade, point */}
          <div className="space-y-2">
            <Label required>{t("markBands")}</Label>
            <p className="text-xs text-muted-foreground">{t("markBandsHint")}</p>
            <div className="grid grid-cols-[1fr_1fr_1fr_2rem] gap-2 text-xs text-muted-foreground">
              <span>{t("fromPercent")}</span>
              <span>{t("grade")}</span>
              <span>{t("point")}</span>
              <span />
            </div>
            {markBands.fields.map((row, i) => (
              <div key={row.id} className="grid grid-cols-[1fr_1fr_1fr_2rem] items-start gap-2">
                {cell(`markBands.${i}.minPercent`, t("fromPercent"))}
                {cell(`markBands.${i}.grade`, t("grade"), "text")}
                {cell(`markBands.${i}.point`, t("point"))}
                <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => markBands.remove(i)} disabled={markBands.fields.length <= 2} aria-label={t("removeBand")}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            {listError("markBands")}
            <Button type="button" variant="outline" size="sm" onClick={() => markBands.append({ minPercent: "", grade: "", point: "" })} disabled={markBands.fields.length >= 20}>
              <Plus /> {t("addBand")}
            </Button>
          </div>

          {/* GPA -> overall grade */}
          <div className="space-y-2">
            <Label required>{t("gpaBands")}</Label>
            <p className="text-xs text-muted-foreground">{t("gpaBandsHint")}</p>
            <div className="grid grid-cols-[1fr_1fr_2rem] gap-2 text-xs text-muted-foreground">
              <span>{t("fromGpa")}</span>
              <span>{t("grade")}</span>
              <span />
            </div>
            {gpaBands.fields.map((row, i) => (
              <div key={row.id} className="grid grid-cols-[1fr_1fr_2rem] items-start gap-2">
                {cell(`gpaBands.${i}.minGpa`, t("fromGpa"))}
                {cell(`gpaBands.${i}.grade`, t("grade"), "text")}
                <Button type="button" variant="ghost" size="icon" className="size-8" onClick={() => gpaBands.remove(i)} disabled={gpaBands.fields.length <= 2} aria-label={t("removeBand")}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            {listError("gpaBands")}
            <Button type="button" variant="outline" size="sm" onClick={() => gpaBands.append({ minGpa: "", grade: "" })} disabled={gpaBands.fields.length >= 20}>
              <Plus /> {t("addBand")}
            </Button>
          </div>
        </div>

        <div className="space-y-3 rounded-md border p-3">
          <FormField
            control={form.control}
            name="failIfAnyCompulsoryFails"
            render={({ field }) => (
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
                <span>
                  <span className="font-medium">{t("failIfAnyFails")}</span>
                  <span className="block text-xs text-muted-foreground">{t("failIfAnyFailsHint")}</span>
                </span>
              </label>
            )}
          />
          <FormField
            control={form.control}
            name="optionalBonusEnabled"
            render={({ field }) => (
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
                <span>
                  <span className="font-medium">{t("optionalBonus")}</span>
                  <span className="block text-xs text-muted-foreground">{t("optionalBonusHint")}</span>
                </span>
              </label>
            )}
          />
          {bonusOn && <div className="pl-6">{numberField("optionalBonusThreshold", t("bonusThreshold"), t("bonusThresholdHint"))}</div>}
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("notes")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
