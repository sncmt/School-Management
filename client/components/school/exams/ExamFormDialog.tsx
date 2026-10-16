"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, useWatch, type FieldPath } from "react-hook-form";
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
import { applyServerErrors } from "@/lib/auth/formErrors";
import { dayKey } from "@/lib/dates";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useClasses } from "@/lib/school/classes";
import { useCreateExam, useUpdateExam, type Exam } from "@/lib/school/exams";
import { cn } from "@/lib/utils";
import { examFormSchema, type ExamFormInput, type ExamFormValues } from "@/zod/exam";
import { NameFields, useSchoolLanguage } from "../NameFields";

const FIELDS: FieldPath<ExamFormInput>[] = ["nameEn", "nameBn", "type", "classIds", "attendanceFrom", "attendanceTo"];

/** Add an exam, or rename one and change its attendance period (its type and classes are set elsewhere). */
export function ExamFormDialog({
  open,
  exam,
  onClose,
  onCreated,
}: {
  open: boolean;
  exam: Exam | null;
  onClose: () => void;
  onCreated?: (exam: Exam) => void;
}) {
  const t = useTranslations("school.exams.examForm");
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{exam ? t("editTitle") : t("addTitle")}</DialogTitle>
          <DialogDescription>{exam ? t("editDescription") : t("description")}</DialogDescription>
        </DialogHeader>
        {open && <ExamForm key={exam?.id ?? "new"} exam={exam} onDone={onClose} onCreated={onCreated} />}
      </DialogContent>
    </Dialog>
  );
}

function ExamForm({ exam, onDone, onCreated }: { exam: Exam | null; onDone: () => void; onCreated?: (exam: Exam) => void }) {
  const t = useTranslations("school.exams.examForm");
  const describeError = useErrorMessage();
  const language = useSchoolLanguage();
  const name = useLocalizedName();
  const classes = useClasses();
  const create = useCreateExam();
  const update = useUpdateExam();
  const [formError, setFormError] = useState<string | null>(null);
  const saving = create.isPending || update.isPending;

  const form = useForm<ExamFormInput, unknown, ExamFormValues>({
    resolver: zodResolver(examFormSchema(language)),
    defaultValues: {
      nameEn: exam?.nameEn ?? "",
      nameBn: exam?.nameBn ?? "",
      type: exam?.type ?? "MULTIPLE",
      allClasses: true,
      classIds: [],
      attendanceFrom: exam?.attendanceFrom ? dayKey(exam.attendanceFrom) : "",
      attendanceTo: exam?.attendanceTo ? dayKey(exam.attendanceTo) : "",
    },
  });
  const allClasses = useWatch({ control: form.control, name: "allClasses" });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (exam) {
        await update.mutateAsync({
          examId: exam.id,
          body: {
            nameEn: values.nameEn,
            nameBn: values.nameBn,
            attendanceFrom: values.attendanceFrom || null,
            attendanceTo: values.attendanceTo || null,
          },
        });
        toast.success(t("updated", { name: name(values) }));
      } else {
        const created = await create.mutateAsync({
          nameEn: values.nameEn,
          nameBn: values.nameBn,
          type: values.type,
          allClasses: values.allClasses,
          classIds: values.allClasses ? [] : values.classIds,
          ...(values.attendanceFrom ? { attendanceFrom: values.attendanceFrom, attendanceTo: values.attendanceTo } : {}),
        });
        toast.success(t("added", { name: name(values) }));
        onCreated?.(created);
      }
      onDone();
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, FIELDS, describeError));
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />
        <NameFields control={form.control} labels={{ nameEn: t("nameEn"), nameBn: t("nameBn") }} autoFocus />

        {!exam && (
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("type")}</FormLabel>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(["MULTIPLE", "SINGLE"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => field.onChange(type)}
                      className={cn(
                        "cursor-pointer rounded-md border p-3 text-left text-sm transition-colors",
                        field.value === type ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted",
                      )}
                    >
                      <div className="font-medium">{t(`types.${type}`)}</div>
                      <div className="text-xs text-muted-foreground">{t(`typeHints.${type}`)}</div>
                    </button>
                  ))}
                </div>
              </FormItem>
            )}
          />
        )}

        {!exam && (
          <FormField
            control={form.control}
            name="allClasses"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("classes")}</FormLabel>
                <div className="flex flex-wrap gap-4 text-sm">
                  {[true, false].map((value) => (
                    <label key={String(value)} className="flex cursor-pointer items-center gap-2">
                      <input type="radio" className="size-4 accent-primary" checked={field.value === value} onChange={() => field.onChange(value)} />
                      {value ? t("allClasses") : t("someClasses")}
                    </label>
                  ))}
                </div>
              </FormItem>
            )}
          />
        )}

        {!exam && !allClasses && (
          <FormField
            control={form.control}
            name="classIds"
            render={({ field }) => (
              <FormItem>
                <div className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-4">
                  {(classes.data?.items ?? []).map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={field.value.includes(c.id)}
                        onChange={(e) => field.onChange(e.target.checked ? [...field.value, c.id] : field.value.filter((id) => id !== c.id))}
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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
