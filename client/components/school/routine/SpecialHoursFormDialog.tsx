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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { dayKey } from "@/lib/dates";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import type { AcademicYear } from "@/lib/school/academicYears";
import { useClasses } from "@/lib/school/classes";
import { usePeriodTemplateList } from "@/lib/school/routine";
import { useCreateScheduleOverride, useUpdateScheduleOverride, type ScheduleOverride } from "@/lib/school/schedule";
import { overrideFormSchema, type OverrideFormInput, type OverrideFormValues } from "@/zod/routine";

const OWN_TEMPLATE = "own"; // each section keeps its own bell schedule
const FIELDS: FieldPath<OverrideFormInput>[] = ["academicYearId", "name", "fromDate", "toDate", "rules"];

type Props = { open: boolean; override: ScheduleOverride | null; years: AcademicYear[]; defaultYearId?: string; onClose: () => void };

export function SpecialHoursFormDialog({ open, override, years, defaultYearId, onClose }: Props) {
  const t = useTranslations("school.routine.special.form");
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{override ? t("editTitle") : t("addTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open && (
          <OverrideForm key={override?.id ?? "new"} override={override} years={years} defaultYearId={defaultYearId} onDone={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

const targetOf = (r: { classId: string | null; sectionId: string | null }) =>
  r.sectionId ? `section:${r.sectionId}` : r.classId ? `class:${r.classId}` : "school";

function OverrideForm({
  override,
  years,
  defaultYearId,
  onDone,
}: {
  override: ScheduleOverride | null;
  years: AcademicYear[];
  defaultYearId?: string;
  onDone: () => void;
}) {
  const t = useTranslations("school.routine.special.form");
  const tAll = useTranslations();
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const classes = useClasses();
  const templates = usePeriodTemplateList();
  const create = useCreateScheduleOverride();
  const update = useUpdateScheduleOverride();
  const [formError, setFormError] = useState<string | null>(null);
  const saving = create.isPending || update.isPending;

  const form = useForm<OverrideFormInput, unknown, OverrideFormValues>({
    resolver: zodResolver(overrideFormSchema),
    defaultValues: override
      ? {
          academicYearId: override.academicYearId,
          name: override.name,
          fromDate: dayKey(override.fromDate),
          toDate: dayKey(override.toDate),
          rules: override.rules.map((r) => ({
            target: targetOf(r),
            startTime: r.startTime,
            endTime: r.endTime,
            periodTemplateId: r.periodTemplateId ?? "",
          })),
        }
      : {
          academicYearId: defaultYearId ?? years.find((y) => y.isCurrent)?.id ?? years[0]?.id ?? "",
          name: "",
          fromDate: "",
          toDate: "",
          rules: [{ target: "school", startTime: "08:00", endTime: "12:00", periodTemplateId: "" }],
        },
  });
  const rules = useFieldArray({ control: form.control, name: "rules" });
  const year = years.find((y) => y.id === form.watch("academicYearId"));

  // the whole school, each class, and each named section
  const targets = [
    { value: "school", label: t("wholeSchool") },
    ...(classes.data?.items ?? []).flatMap((c) => [
      { value: `class:${c.id}`, label: t("classTarget", { name: c.name }) },
      ...c.sections.filter((s) => !s.isDefault).map((s) => ({ value: `section:${s.id}`, label: t("sectionTarget", { class: c.name, name: s.name }) })),
    ]),
  ];

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const body = {
      ...values,
      rules: values.rules.map((r) => {
        const [kind, id] = r.target.split(":");
        const section = kind === "section" ? classes.data?.items.find((c) => c.sections.some((s) => s.id === id)) : undefined;
        return {
          ...(kind === "class" ? { classId: id } : {}),
          ...(kind === "section" ? { sectionId: id, classId: section?.id } : {}),
          startTime: r.startTime,
          endTime: r.endTime,
          ...(r.periodTemplateId ? { periodTemplateId: r.periodTemplateId } : {}),
        };
      }),
    };
    try {
      if (override) await update.mutateAsync({ overrideId: override.id, body });
      else await create.mutateAsync(body);
      toast.success(t(override ? "updated" : "added", { name: values.name }));
      onDone();
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, FIELDS, describeError));
    }
  });

  const listError = form.formState.errors.rules?.root?.message ?? form.formState.errors.rules?.message;

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t("name")}</FormLabel>
              <FormControl>
                <Input placeholder={t("namePlaceholder")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-3">
          {(["fromDate", "toDate"] as const).map((field) => (
            <FormField
              key={field}
              control={form.control}
              name={field}
              render={({ field: input }) => (
                <FormItem>
                  <FormLabel required>{t(field)}</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      min={year ? dayKey(year.startDate) : undefined}
                      max={year ? dayKey(year.endDate) : undefined}
                      {...input}
                      onChange={(e) => {
                        input.onChange(e);
                        const to = form.getValues("toDate");
                        if (field === "fromDate" && (!to || to < e.target.value)) form.setValue("toDate", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          {years.length > 1 && (
            <FormField
              control={form.control}
              name="academicYearId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("academicYear")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y.id} value={y.id}>
                          {y.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
        <FormDescription>{t("datesHint")}</FormDescription>

        <div className="space-y-2">
          <Label required>{t("hours")}</Label>
          {rules.fields.map((row, i) => (
            <div key={row.id} className="grid grid-cols-2 items-start gap-2 rounded-md border p-2 sm:grid-cols-[1fr_7rem_7rem_1fr_2.25rem]">
              <FormField
                control={form.control}
                name={`rules.${i}.target`}
                render={({ field }) => (
                  <FormItem className="col-span-2 sm:col-span-1">
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full" aria-label={t("appliesTo")}>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {targets.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {(["startTime", "endTime"] as const).map((field) => (
                <FormField
                  key={field}
                  control={form.control}
                  name={`rules.${i}.${field}`}
                  render={({ field: input }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="time" aria-label={t(field === "startTime" ? "start" : "end")} {...input} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <FormField
                control={form.control}
                name={`rules.${i}.periodTemplateId`}
                render={({ field }) => (
                  <FormItem>
                    <Select value={field.value || OWN_TEMPLATE} onValueChange={(v) => field.onChange(v === OWN_TEMPLATE ? "" : v)}>
                      <FormControl>
                        <SelectTrigger className="w-full" aria-label={t("bellSchedule")}>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={OWN_TEMPLATE}>{t("ownBellSchedule")}</SelectItem>
                        {templates.data?.map((tpl) => (
                          <SelectItem key={tpl.id} value={tpl.id}>
                            {name(tpl)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 justify-self-end"
                onClick={() => rules.remove(i)}
                disabled={rules.fields.length === 1}
                aria-label={t("removeRule")}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          {listError && <p className="text-sm text-destructive">{tAll(listError as never)}</p>}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => rules.append({ target: "", startTime: "08:00", endTime: "12:00", periodTemplateId: "" })}
          >
            <Plus /> {t("addRule")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("rulesHint")}</p>
        </div>

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
