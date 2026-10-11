"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import type { SchoolClass } from "@/lib/school/classes";
import { useCreateSections } from "@/lib/school/sections";
import { addSectionsSchema, splitSectionNames, type AddSectionsInput, type AddSectionsValues } from "@/zod/section";

type Props = {
  open: boolean;
  classes: SchoolClass[];
  // classes ticked when the dialog opens (the class filter on the page)
  initialClassIds: string[];
  onClose: () => void;
};

/** Several section names for several classes at once: every class gets every name. */
export function AddSectionsDialog({ open, classes, initialClassIds, onClose }: Props) {
  const t = useTranslations("school.sections.addDialog");
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open && <AddSectionsForm classes={classes} initialClassIds={initialClassIds} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function AddSectionsForm({
  classes,
  initialClassIds,
  onDone,
}: {
  classes: SchoolClass[];
  initialClassIds: string[];
  onDone: () => void;
}) {
  const t = useTranslations("school.sections.addDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const create = useCreateSections();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<AddSectionsInput, unknown, AddSectionsValues>({
    resolver: zodResolver(addSectionsSchema),
    defaultValues: { classIds: initialClassIds, names: "" },
  });

  const classIds = form.watch("classIds");
  const nameCount = splitSectionNames(form.watch("names")).length;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const result = await create.mutateAsync(values);
      const skipped = result.skipped.map((s) => `${s.className} ${s.name}`).join(", ");

      if (result.created.length === 0) {
        toast.info(t("nothingNew"));
      } else {
        toast.success(t("created", { count: result.created.length }), {
          description: skipped ? t("skipped", { list: skipped }) : undefined,
        });
      }
      onDone();
    } catch (error) {
      setFormError(describeError(error));
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />

        <FormField
          control={form.control}
          name="classIds"
          render={({ field }) => {
            const toggle = (id: string, checked: boolean) =>
              field.onChange(checked ? [...field.value, id] : field.value.filter((v) => v !== id));
            return (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel required>{t("classes")}</FormLabel>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => field.onChange(classes.map((c) => c.id))}>
                      {t("selectAll")}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => field.onChange([])}>
                      {t("clear")}
                    </Button>
                  </div>
                </div>
                <div className="grid max-h-56 grid-cols-2 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-3">
                  {classes.map((schoolClass) => (
                    <label
                      key={schoolClass.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        className="size-4 accent-primary"
                        checked={field.value.includes(schoolClass.id)}
                        onChange={(e) => toggle(schoolClass.id, e.target.checked)}
                      />
                      {schoolClass.name}
                    </label>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="names"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t("names")}</FormLabel>
              <FormControl>
                <Input placeholder="A, B, C" {...field} />
              </FormControl>
              <FormDescription>{t("namesHint")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <p className="text-sm font-medium">{t("preview", { count: classIds.length * nameCount })}</p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone} disabled={create.isPending}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
