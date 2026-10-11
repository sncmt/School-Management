"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { dayKey } from "@/lib/dates";
import {
  useCreateAcademicYear,
  useUpdateAcademicYear,
  type AcademicYear,
  type CreateAcademicYearResult,
} from "@/lib/school/academicYears";
import {
  academicYearFormSchema,
  type AcademicYearFormInput,
  type AcademicYearFormValues,
} from "@/zod/schoolSetup";

type Props = {
  open: boolean;
  // null: creating a new year
  year: AcademicYear | null;
  // the first year a school creates becomes current by default
  isFirstYear: boolean;
  onClose: () => void;
};

export function AcademicYearFormDialog({ open, year, isFirstYear, onClose }: Props) {
  const t = useTranslations("school.years.form");
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{year ? t("editTitle") : t("addTitle")}</DialogTitle>
          {!year && <DialogDescription>{t("addDescription")}</DialogDescription>}
        </DialogHeader>
        {open && <YearForm key={year?.id ?? "new"} year={year} isFirstYear={isFirstYear} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

const FIELDS: FieldPath<AcademicYearFormInput>[] = ["name", "startDate", "endDate"];

function YearForm({
  year,
  isFirstYear,
  onDone,
}: {
  year: AcademicYear | null;
  isFirstYear: boolean;
  onDone: () => void;
}) {
  const t = useTranslations("school.years.form");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const create = useCreateAcademicYear();
  const update = useUpdateAcademicYear();
  const [formError, setFormError] = useState<string | null>(null);
  const saving = create.isPending || update.isPending;

  const form = useForm<AcademicYearFormInput, unknown, AcademicYearFormValues>({
    resolver: zodResolver(academicYearFormSchema),
    defaultValues: {
      name: year?.name ?? "",
      startDate: year ? dayKey(year.startDate) : "",
      endDate: year ? dayKey(year.endDate) : "",
      isCurrent: isFirstYear,
    },
  });

  const onSubmit = form.handleSubmit(async ({ isCurrent, ...values }) => {
    setFormError(null);
    try {
      if (year) {
        // only what changed: moving the dates is checked against everything dated in the year
        const body = {
          ...(values.name !== year.name ? { name: values.name } : {}),
          ...(values.startDate !== dayKey(year.startDate) ? { startDate: values.startDate } : {}),
          ...(values.endDate !== dayKey(year.endDate) ? { endDate: values.endDate } : {}),
        };
        if (Object.keys(body).length > 0) await update.mutateAsync({ yearId: year.id, body });
        toast.success(t("updated", { name: values.name }));
      } else {
        const created = await create.mutateAsync({ ...values, isCurrent });
        toast.success(t("created", { name: created.name }), { description: carriedOverText(created) });
      }
      onDone();
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, FIELDS, describeError));
    }
  });

  // "Copied from the year before: …", only when something was copied
  const carriedOverText = (created: CreateAcademicYearResult) => {
    const counts = {
      sections: created.carriedOverSections,
      subjects: created.carriedOverSubjects,
      teachers: created.carriedOverSubjectTeachers,
      results: created.carriedOverResultSettings,
      routine: created.carriedOverRoutine,
    };
    return Object.values(counts).some((n) => n > 0) ? t("carriedOver", counts) : undefined;
  };

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
                <Input placeholder={t("namePlaceholder")} autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("startDate")}</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("endDate")}</FormLabel>
                <FormControl>
                  <Input type="date" min={form.watch("startDate") || undefined} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {!year && (
          <FormField
            control={form.control}
            name="isCurrent"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2">
                <FormControl>
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                </FormControl>
                <FormLabel className="font-normal">{t("makeCurrent")}</FormLabel>
              </FormItem>
            )}
          />
        )}

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
