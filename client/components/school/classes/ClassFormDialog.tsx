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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useCreateClass, useUpdateClass, type SchoolClass } from "@/lib/school/classes";
import { classFormSchema, type ClassFormInput, type ClassFormValues } from "@/zod/schoolSetup";

type Props = {
  open: boolean;
  // null: creating a new class
  schoolClass: SchoolClass | null;
  // suggested level for a new class: one above the highest
  nextLevel: number;
  onClose: () => void;
};

export function ClassFormDialog({ open, schoolClass, nextLevel, onClose }: Props) {
  const t = useTranslations("school.classes.form");
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{schoolClass ? t("editTitle") : t("addTitle")}</DialogTitle>
          {!schoolClass && <DialogDescription>{t("addDescription")}</DialogDescription>}
        </DialogHeader>
        {open && (
          <ClassForm key={schoolClass?.id ?? "new"} schoolClass={schoolClass} nextLevel={nextLevel} onDone={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

const FIELDS: FieldPath<ClassFormInput>[] = ["name", "numericLevel"];

function ClassForm({
  schoolClass,
  nextLevel,
  onDone,
}: {
  schoolClass: SchoolClass | null;
  nextLevel: number;
  onDone: () => void;
}) {
  const t = useTranslations("school.classes.form");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const create = useCreateClass();
  const update = useUpdateClass();
  const [formError, setFormError] = useState<string | null>(null);
  const saving = create.isPending || update.isPending;

  const form = useForm<ClassFormInput, unknown, ClassFormValues>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: schoolClass?.name ?? "",
      numericLevel: String(schoolClass?.numericLevel ?? nextLevel),
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (schoolClass) {
        await update.mutateAsync({ classId: schoolClass.id, body: values });
        toast.success(t("updated", { name: values.name }));
      } else {
        await create.mutateAsync(values);
        toast.success(t("created", { name: values.name }));
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

        <FormField
          control={form.control}
          name="numericLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t("level")}</FormLabel>
              <FormControl>
                <Input inputMode="numeric" className="w-24" {...field} />
              </FormControl>
              <FormDescription>{t("levelHint")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
