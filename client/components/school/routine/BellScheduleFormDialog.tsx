"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Coffee, Plus, Trash2 } from "lucide-react";
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
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  addMinutes,
  useCreatePeriodTemplate,
  useUpdatePeriodTemplate,
  type PeriodTemplate,
} from "@/lib/school/routine";
import { cn } from "@/lib/utils";
import { templateFormSchema, type PeriodInput, type TemplateFormInput, type TemplateFormValues } from "@/zod/routine";
import { NameFields, useSchoolLanguage } from "../NameFields";

const BN = "০১২৩৪৫৬৭৮৯";
const bnNumber = (n: number) => String(n).replace(/\d/g, (d) => BN[Number(d)]);

const BN_ORDINALS = ["১ম", "২য়", "৩য়", "৪র্থ", "৫ম", "৬ষ্ঠ", "৭ম", "৮ম", "৯ম", "১০ম"];

// default names, in both languages, so most schools only adjust the times
const classPeriod = (n: number): Pick<PeriodInput, "nameEn" | "nameBn"> => ({
  nameEn: `Period ${n}`,
  nameBn: `${BN_ORDINALS[n - 1] ?? `${bnNumber(n)}তম`} পিরিয়ড`,
});
const breakPeriod = { nameEn: "Tiffin", nameBn: "টিফিন" };

/* A usual day: three 45-minute periods, a 30-minute tiffin, three more. */
const typicalDay = (): PeriodInput[] => {
  const periods: PeriodInput[] = [];
  let at = "08:00";
  for (const kind of ["c", "c", "c", "b", "c", "c", "c"] as const) {
    const length = kind === "b" ? 30 : 45;
    const n = periods.filter((p) => !p.isBreak).length + 1;
    periods.push({ ...(kind === "b" ? breakPeriod : classPeriod(n)), startTime: at, endTime: addMinutes(at, length), isBreak: kind === "b" });
    at = addMinutes(at, length);
  }
  return periods;
};

type Props = { open: boolean; template: PeriodTemplate | null; onClose: () => void };

export function BellScheduleFormDialog({ open, template, onClose }: Props) {
  const t = useTranslations("school.routine.bell.form");
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{template ? t("editTitle") : t("addTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open && <BellScheduleForm key={template?.id ?? "new"} template={template} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function BellScheduleForm({ template, onDone }: { template: PeriodTemplate | null; onDone: () => void }) {
  const t = useTranslations("school.routine.bell.form");
  const tAll = useTranslations();
  const describeError = useErrorMessage();
  const language = useSchoolLanguage();
  const name = useLocalizedName();
  const create = useCreatePeriodTemplate();
  const update = useUpdatePeriodTemplate();
  const [formError, setFormError] = useState<string | null>(null);
  const saving = create.isPending || update.isPending;

  const form = useForm<TemplateFormInput, unknown, TemplateFormValues>({
    resolver: zodResolver(templateFormSchema(language)),
    defaultValues: template
      ? {
          nameEn: template.nameEn ?? "",
          nameBn: template.nameBn ?? "",
          periods: template.periods.map((p) => ({
            nameEn: p.nameEn ?? "",
            nameBn: p.nameBn ?? "",
            startTime: p.startTime,
            endTime: p.endTime,
            isBreak: p.isBreak,
          })),
        }
      : { nameEn: "Regular day", nameBn: "সাধারণ দিন", periods: typicalDay() },
  });
  const periods = useFieldArray({ control: form.control, name: "periods" });

  // a new period starts when the last one ends
  const add = (isBreak: boolean) => {
    const all = form.getValues("periods");
    const last = all[all.length - 1];
    const start = last?.endTime || "08:00";
    const n = all.filter((p) => !p.isBreak).length + 1;
    periods.append({
      ...(isBreak ? breakPeriod : classPeriod(n)),
      startTime: start,
      endTime: addMinutes(start, isBreak ? 30 : 45),
      isBreak,
    });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    // periods are numbered by their order in the day
    const body = { ...values, periods: values.periods.map((p, i) => ({ ...p, number: i + 1 })) };
    try {
      if (template) await update.mutateAsync({ templateId: template.id, body });
      else await create.mutateAsync(body);
      toast.success(t(template ? "updated" : "added", { name: name(values) }));
      onDone();
    } catch (error) {
      setFormError(
        applyServerErrors(error, form.setError, ["nameEn", "nameBn"] as FieldPath<TemplateFormInput>[], describeError),
      );
    }
  });

  // an error about the whole list (none, or too many), not one period
  const listError = form.formState.errors.periods?.root?.message ?? form.formState.errors.periods?.message;
  const otherName = language === "BN" ? "nameEn" : "nameBn";
  const ownName = language === "BN" ? "nameBn" : "nameEn";

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />
        <NameFields control={form.control} labels={{ nameEn: t("nameEn"), nameBn: t("nameBn") }} />

        <div className="space-y-2">
          <Label required>{t("periods")}</Label>
          {/* column heads, wide screens only */}
          <div className="hidden grid-cols-[2rem_1fr_1fr_7rem_7rem_4.5rem_2rem] gap-2 px-1 text-xs text-muted-foreground md:grid">
            <span>#</span>
            <span>
              {t(ownName === "nameEn" ? "nameEn" : "nameBn")}
              <span className="text-destructive"> *</span>
            </span>
            <span>{t(otherName === "nameEn" ? "nameEn" : "nameBn")}</span>
            <span>{t("start")}</span>
            <span>{t("end")}</span>
            <span>{t("break")}</span>
            <span />
          </div>

          {periods.fields.map((row, i) => {
            const isBreak = form.watch(`periods.${i}.isBreak`);
            return (
              <div
                key={row.id}
                className={cn(
                  "grid grid-cols-2 items-start gap-2 rounded-md border p-2 md:grid-cols-[2rem_1fr_1fr_7rem_7rem_4.5rem_2rem] md:border-0 md:p-1",
                  isBreak && "bg-muted/60 md:rounded-md",
                )}
              >
                <span className="col-span-2 pt-2 text-sm font-medium text-muted-foreground md:col-span-1">{i + 1}</span>
                {([ownName, otherName] as const).map((field) => (
                  <FormField
                    key={field}
                    control={form.control}
                    name={`periods.${i}.${field}`}
                    render={({ field: input }) => (
                      <FormItem className="col-span-2 md:col-span-1">
                        <FormControl>
                          <Input lang={field === "nameBn" ? "bn" : "en"} aria-label={t(field)} {...input} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                {(["startTime", "endTime"] as const).map((field) => (
                  <FormField
                    key={field}
                    control={form.control}
                    name={`periods.${i}.${field}`}
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
                  name={`periods.${i}.isBreak`}
                  render={({ field: input }) => (
                    <label className="flex h-9 cursor-pointer items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={input.value}
                        onChange={(e) => input.onChange(e.target.checked)}
                      />
                      <span className="md:sr-only">{t("break")}</span>
                    </label>
                  )}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 justify-self-end"
                  onClick={() => periods.remove(i)}
                  disabled={periods.fields.length === 1}
                  aria-label={t("remove")}
                >
                  <Trash2 />
                </Button>
              </div>
            );
          })}
          {listError && <p className="text-sm text-destructive">{tAll(listError as never)}</p>}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => add(false)} disabled={periods.fields.length >= 20}>
              <Plus /> {t("addPeriod")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => add(true)} disabled={periods.fields.length >= 20}>
              <Coffee /> {t("addBreak")}
            </Button>
          </div>
          {template && template._count.sectionConfigs > 0 && (
            <p className="text-xs text-muted-foreground">{t("inUseNote")}</p>
          )}
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
