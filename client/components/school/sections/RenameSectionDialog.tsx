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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useRenameSection, type Section } from "@/lib/school/sections";
import { renameSectionSchema } from "@/zod/section";

export function RenameSectionDialog({ section, onClose }: { section: Section | null; onClose: () => void }) {
  const t = useTranslations("school.sections.renameDialog");
  return (
    <Dialog open={!!section} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          {section?.isDefault && <DialogDescription>{t("defaultNote")}</DialogDescription>}
        </DialogHeader>
        {section && <RenameForm key={section.id} section={section} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function RenameForm({ section, onDone }: { section: Section; onDone: () => void }) {
  const t = useTranslations("school.sections.renameDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const rename = useRenameSection();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<{ name: string }>({
    resolver: zodResolver(renameSectionSchema),
    // the automatic section's "Default" isn't a name anyone chose
    defaultValues: { name: section.isDefault ? "" : section.name },
  });

  const onSubmit = form.handleSubmit(async ({ name }) => {
    setFormError(null);
    try {
      await rename.mutateAsync({ sectionId: section.id, name });
      toast.success(t("renamed", { name }));
      onDone();
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, ["name"], describeError));
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
                <Input autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone} disabled={rename.isPending}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" disabled={rename.isPending}>
            {rename.isPending ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
