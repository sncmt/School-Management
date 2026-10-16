"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { useFieldArray, useForm, useWatch, type Control, type FieldPath, type UseFormSetValue } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { dayKey } from "@/lib/dates";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useClasses } from "@/lib/school/classes";
import { useExams, type Exam } from "@/lib/school/exams";
import { useCreateFormula, useUpdateFormula, type FinalFormula, type FormulaBody } from "@/lib/school/finalResults";
import { cn } from "@/lib/utils";
import { formulaFormSchema, weightOf, type FormulaFormInput, type FormulaFormValues } from "@/zod/finalResult";
import { NameFields, useSchoolLanguage } from "../../NameFields";

type ComponentInput = FormulaFormInput["components"][number];

const emptyComponent = (weight: string): ComponentInput => ({ nameEn: "", nameBn: "", weight, method: "AVERAGE", bestCount: "", examIds: [] });

/** Add a class's final result (which exams count and how much), or change one not yet published. */
export function FormulaFormDialog({ open, formula, onClose }: { open: boolean; formula: FinalFormula | null; onClose: () => void }) {
  const t = useTranslations("school.exams.final.form");
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{formula ? t("editTitle") : t("addTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open && <FormulaForm key={formula?.id ?? "new"} formula={formula} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function FormulaForm({ formula, onDone }: { formula: FinalFormula | null; onDone: () => void }) {
  const t = useTranslations("school.exams.final.form");
  const format = useFormatter();
  const tValidation = useTranslations("validation");
  const describeError = useErrorMessage();
  const language = useSchoolLanguage();
  const name = useLocalizedName();
  const classes = useClasses();
  const exams = useExams();
  const create = useCreateFormula();
  const update = useUpdateFormula();
  const [formError, setFormError] = useState<string | null>(null);
  const saving = create.isPending || update.isPending;

  const form = useForm<FormulaFormInput, unknown, FormulaFormValues>({
    resolver: zodResolver(formulaFormSchema(language)),
    defaultValues: {
      classId: formula?.classId ?? "",
      nameEn: formula?.nameEn ?? "",
      nameBn: formula?.nameBn ?? "",
      attendanceFrom: formula?.attendanceFrom ? dayKey(formula.attendanceFrom) : "",
      attendanceTo: formula?.attendanceTo ? dayKey(formula.attendanceTo) : "",
      components: formula
        ? formula.components.map((c) => ({
            nameEn: c.nameEn ?? "",
            nameBn: c.nameBn ?? "",
            weight: String(Number(c.weight)),
            method: c.method,
            bestCount: c.bestCount ? String(c.bestCount) : "",
            examIds: c.exams.map((e) => e.exam.id),
          }))
        : [emptyComponent("100")],
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "components" });
  const classId = useWatch({ control: form.control, name: "classId" });
  const components = useWatch({ control: form.control, name: "components" });
  const total = components.reduce((s, c) => s + weightOf(c.weight), 0);
  const classExams = (exams.data?.items ?? []).filter((e) => e.classes.some((c) => c.class.id === classId));
  const rootError = form.formState.errors.components?.root?.message;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const body: FormulaBody = {
      nameEn: values.nameEn,
      nameBn: values.nameBn,
      ...(values.attendanceFrom ? { attendanceFrom: values.attendanceFrom, attendanceTo: values.attendanceTo } : {}),
      components: values.components,
    };
    try {
      if (formula) {
        await update.mutateAsync({ formulaId: formula.id, body });
        toast.success(t("updated", { name: name(values) }));
      } else {
        await create.mutateAsync({ ...body, classId: values.classId });
        toast.success(t("added", { name: name(values) }));
      }
      onDone();
    } catch (error) {
      const fieldPaths = [
        "classId",
        "nameEn",
        "nameBn",
        "attendanceFrom",
        "attendanceTo",
        ...values.components.flatMap((_, i) =>
          (["nameEn", "nameBn", "weight", "bestCount", "examIds"] as const).map((f) => `components.${i}.${f}`),
        ),
      ] as FieldPath<FormulaFormInput>[];
      setFormError(applyServerErrors(error, form.setError, fieldPaths, describeError));
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />

        {!formula && (
          <FormField
            control={form.control}
            name="classId"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("class")}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    // the exams belong to the class
                    form.setValue(
                      "components",
                      form.getValues("components").map((c) => ({ ...c, examIds: [] })),
                    );
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="w-full sm:w-60">
                      <SelectValue placeholder={t("chooseClass")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(classes.data?.items ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <NameFields control={form.control} labels={{ nameEn: t("nameEn"), nameBn: t("nameBn") }} autoFocus={!!formula} />

        {/* ----------------------------------------------------- components */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-sm font-medium">{t("components")}</div>
              <p className="text-xs text-muted-foreground">{t("componentsHint")}</p>
            </div>
            <span
              className={cn(
                "rounded-md px-2 py-1 text-sm font-medium tabular-nums",
                Math.abs(total - 100) < 1e-6 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
              )}
            >
              {t("total", { total: format.number(total, { maximumFractionDigits: 2 }) })}
            </span>
          </div>

          {!classId ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">{t("classFirst")}</p>
          ) : classExams.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">{t("noExams")}</p>
          ) : (
            fields.map((f, i) => (
              <ComponentCard
                key={f.id}
                index={i}
                control={form.control}
                setValue={form.setValue}
                classId={classId}
                exams={classExams}
                takenElsewhere={new Set(components.flatMap((c, j) => (j === i ? [] : c.examIds)))}
                onRemove={fields.length > 1 ? () => remove(i) : undefined}
              />
            ))
          )}
          {rootError && <p className="text-sm text-destructive">{tValidation(rootError.replace("validation.", "") as "weightTotal")}</p>}
          {classId && classExams.length > 0 && fields.length < 10 && (
            <Button type="button" variant="outline" size="sm" onClick={() => append(emptyComponent(total < 100 ? String(Math.round((100 - total) * 100) / 100) : ""))}>
              <Plus /> {t("addComponent")}
            </Button>
          )}
        </div>

        {/* ----------------------------------------------------- attendance */}
        <div className="space-y-2">
          <div className="grid gap-4 sm:grid-cols-2">
            {(["attendanceFrom", "attendanceTo"] as const).map((field) => (
              <FormField
                key={field}
                control={form.control}
                name={field}
                render={({ field: input }) => (
                  <FormItem>
                    <FormLabel>{t(field)}</FormLabel>
                    <FormControl>
                      <Input type="date" {...input} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
          <FormDescription>{t("attendanceHint")}</FormDescription>
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

/* One component: its name, weight, how its exams combine, and the exams. */
function ComponentCard({
  index,
  control,
  setValue,
  classId,
  exams,
  takenElsewhere,
  onRemove,
}: {
  index: number;
  control: Control<FormulaFormInput, unknown, FormulaFormValues>;
  setValue: UseFormSetValue<FormulaFormInput>;
  classId: string;
  exams: Exam[];
  takenElsewhere: Set<string>;
  onRemove?: () => void;
}) {
  const t = useTranslations("school.exams.final.form");
  const tStage = useTranslations("school.exams.stages");
  const name = useLocalizedName();
  const language = useSchoolLanguage();
  const method = useWatch({ control, name: `components.${index}.method` });
  const examIds = useWatch({ control, name: `components.${index}.examIds` });
  const names = useWatch({ control, name: [`components.${index}.nameEn`, `components.${index}.nameBn`] });
  const order = language === "BN" ? (["nameBn", "nameEn"] as const) : (["nameEn", "nameBn"] as const);

  // the first exam chosen names an unnamed component ("Annual Examination")
  const pickExam = (exam: Exam, checked: boolean) => {
    const next = checked ? [...examIds, exam.id] : examIds.filter((id) => id !== exam.id);
    setValue(`components.${index}.examIds`, next, { shouldValidate: true });
    // one exam has nothing to choose the best of
    if (next.length < 2) setValue(`components.${index}.method`, "AVERAGE");
    if (checked && next.length === 1 && !names[0] && !names[1]) {
      setValue(`components.${index}.nameEn`, exam.nameEn ?? "");
      setValue(`components.${index}.nameBn`, exam.nameBn ?? "");
    }
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-start gap-2">
        <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_1fr_6rem]">
          {order.map((field, i) => (
            <FormField
              key={field}
              control={control}
              name={`components.${index}.${field}`}
              render={({ field: input }) => (
                <FormItem>
                  <FormLabel required={i === 0}>{t(field === "nameEn" ? "componentNameEn" : "componentNameBn")}</FormLabel>
                  <FormControl>
                    <Input lang={field === "nameBn" ? "bn" : "en"} {...input} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <FormField
            control={control}
            name={`components.${index}.weight`}
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("weight")}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input inputMode="decimal" className="pr-6" {...field} />
                    <span className="absolute top-1/2 right-2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {onRemove && (
          <Button type="button" variant="ghost" size="icon" className="mt-6" onClick={onRemove} aria-label={t("removeComponent")}>
            <Trash2 />
          </Button>
        )}
      </div>

      <FormField
        control={control}
        name={`components.${index}.examIds`}
        render={() => (
          <FormItem>
            <FormLabel required>{t("exams")}</FormLabel>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {exams.map((exam) => {
                const status = exam.classes.find((c) => c.class.id === classId)?.status;
                const taken = takenElsewhere.has(exam.id);
                return (
                  <label
                    key={exam.id}
                    className={cn("flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm", taken ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-muted/50")}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={examIds.includes(exam.id)}
                      disabled={taken}
                      onChange={(e) => pickExam(exam, e.target.checked)}
                    />
                    <span className="flex-1">{name(exam)}</span>
                    {status && (
                      <Badge variant={status === "PUBLISHED" ? "default" : "outline"} className="text-[10px]">
                        {tStage(status)}
                      </Badge>
                    )}
                  </label>
                );
              })}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {examIds.length > 1 && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <FormField
            control={control}
            name={`components.${index}.method`}
            render={({ field }) => (
              <div className="flex flex-wrap gap-3">
                {(["AVERAGE", "BEST"] as const).map((m) => (
                  <label key={m} className="flex cursor-pointer items-center gap-2">
                    <input type="radio" className="size-4 accent-primary" checked={field.value === m} onChange={() => field.onChange(m)} />
                    {t(`methods.${m}`)}
                  </label>
                ))}
              </div>
            )}
          />
          {method === "BEST" && (
            <FormField
              control={control}
              name={`components.${index}.bestCount`}
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormLabel>{t("bestCount", { count: examIds.length })}</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" className="h-8 w-16" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      )}
    </div>
  );
}
