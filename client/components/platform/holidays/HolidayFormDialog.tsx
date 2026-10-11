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
import { Textarea } from "@/components/ui/textarea";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { dayKey } from "@/lib/dates";
import {
  useCreateNationalHoliday,
  useUpdateNationalHoliday,
  type NationalHoliday,
} from "@/lib/platform/holidays";
import { holidayFormSchema, type HolidayFormInput, type HolidayFormValues } from "@/zod/holiday";

type Props = {
  open: boolean;
  // null: adding a new holiday
  holiday: NationalHoliday | null;
  onClose: () => void;
};

export function HolidayFormDialog({ open, holiday, onClose }: Props) {
  const t = useTranslations("platform.holidays.form");
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{holiday ? t("editTitle") : t("addTitle")}</DialogTitle>
          {holiday && <DialogDescription>{t("editNote")}</DialogDescription>}
        </DialogHeader>
        {/* remounted per holiday so the fields start from that holiday */}
        {open && <HolidayForm key={holiday?.id ?? "new"} holiday={holiday} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

const FIELDS: FieldPath<HolidayFormInput>[] = ["nameEn", "nameBn", "description", "fromDate", "toDate"];

function HolidayForm({ holiday, onDone }: { holiday: NationalHoliday | null; onDone: () => void }) {
  const t = useTranslations("platform.holidays.form");
  const tCommon = useTranslations("common");
  const name = useLocalizedName();
  const describeError = useErrorMessage();
  const create = useCreateNationalHoliday();
  const update = useUpdateNationalHoliday();
  const [formError, setFormError] = useState<string | null>(null);
  const saving = create.isPending || update.isPending;

  const form = useForm<HolidayFormInput, unknown, HolidayFormValues>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: {
      nameEn: holiday?.nameEn ?? "",
      nameBn: holiday?.nameBn ?? "",
      description: holiday?.description ?? "",
      fromDate: holiday ? dayKey(holiday.fromDate) : "",
      toDate: holiday ? dayKey(holiday.toDate) : "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const saved = holiday
        ? await update.mutateAsync({ holidayId: holiday.id, body: values })
        : await create.mutateAsync(values);
      toast.success(t(holiday ? "updated" : "created", { name: name(saved) }));
      onDone();
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, FIELDS, describeError));
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="nameEn"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("nameEn")}</FormLabel>
                <FormControl>
                  <Input autoFocus {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nameBn"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("nameBn")}</FormLabel>
                <FormControl>
                  <Input lang="bn" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="fromDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("fromDate")}</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      // a one-day holiday needs only the start date: keep the end in step
                      const to = form.getValues("toDate");
                      if (!to || to < e.target.value) form.setValue("toDate", e.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="toDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("toDate")}</FormLabel>
                <FormControl>
                  <Input type="date" min={form.watch("fromDate") || undefined} {...field} />
                </FormControl>
                <FormDescription>{t("toDateHint")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("description")}</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
              </FormControl>
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
