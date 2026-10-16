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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { dayKey } from "@/lib/dates";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useLocalizedName } from "@/lib/i18n/names";
import type { AcademicYear } from "@/lib/school/academicYears";
import {
  HOLIDAY_TYPES,
  useCreateCalendarEntry,
  useUpdateCalendarEntry,
  type CalendarEntry,
  type EntryKind,
} from "@/lib/school/calendar";
import { useClasses } from "@/lib/school/classes";
import { cn } from "@/lib/utils";
import { entryFormSchema, type EntryFormInput, type EntryFormValues } from "@/zod/calendar";
import { NameFields, useSchoolLanguage } from "../NameFields";

const FIELDS: FieldPath<EntryFormInput>[] = [
  "academicYearId", "kind", "type", "nameEn", "nameBn", "description", "fromDate", "toDate", "allClasses",
  "classIds", "teachersOff",
];

export type EntryDefaults = { date?: string; kind?: EntryKind };

type Props = {
  open: boolean;
  // null: a new entry
  entry: CalendarEntry | null;
  defaults?: EntryDefaults;
  years: AcademicYear[];
  onClose: () => void;
};

export function EntryFormDialog({ open, entry, defaults, years, onClose }: Props) {
  const t = useTranslations("school.calendar.entryForm");
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{entry ? t("editTitle") : t("addTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open && (
          <EntryForm
            key={entry?.id ?? `new-${defaults?.date ?? ""}-${defaults?.kind ?? ""}`}
            entry={entry}
            defaults={defaults}
            years={years}
            onDone={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** The year whose dates contain `date`, else the current one. */
const yearFor = (years: AcademicYear[], date?: string) =>
  (date && years.find((y) => dayKey(y.startDate) <= date && date <= dayKey(y.endDate))) ||
  years.find((y) => y.isCurrent) ||
  years[0];

function EntryForm({
  entry,
  defaults,
  years,
  onDone,
}: {
  entry: CalendarEntry | null;
  defaults?: EntryDefaults;
  years: AcademicYear[];
  onDone: () => void;
}) {
  const t = useTranslations("school.calendar.entryForm");
  const tType = useTranslations("school.calendar.holidayTypes");
  const describeError = useErrorMessage();
  const language = useSchoolLanguage();
  const name = useLocalizedName();
  const classes = useClasses();
  const create = useCreateCalendarEntry();
  const update = useUpdateCalendarEntry();
  const [formError, setFormError] = useState<string | null>(null);
  const saving = create.isPending || update.isPending;

  const form = useForm<EntryFormInput, unknown, EntryFormValues>({
    resolver: zodResolver(entryFormSchema(language)),
    defaultValues: entry
      ? {
          academicYearId: entry.academicYearId,
          kind: entry.kind,
          type: entry.type ?? "",
          nameEn: entry.nameEn ?? "",
          nameBn: entry.nameBn ?? "",
          description: entry.description ?? "",
          fromDate: dayKey(entry.fromDate),
          toDate: dayKey(entry.toDate),
          allClasses: entry.allClasses,
          classIds: entry.classes.map((c) => c.class.id),
          teachersOff: entry.teachersOff,
        }
      : {
          academicYearId: yearFor(years, defaults?.date)?.id ?? "",
          kind: defaults?.kind ?? "HOLIDAY",
          type: "",
          nameEn: "",
          nameBn: "",
          description: "",
          fromDate: defaults?.date ?? "",
          toDate: defaults?.date ?? "",
          allClasses: true,
          classIds: [],
          teachersOff: true,
        },
  });

  const kind = useWatch({ control: form.control, name: "kind" });
  const allClasses = useWatch({ control: form.control, name: "allClasses" });
  const yearId = useWatch({ control: form.control, name: "academicYearId" });
  const year = years.find((y) => y.id === yearId);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const body = {
      ...values,
      type: values.kind === "HOLIDAY" && values.type ? values.type : undefined,
      description: values.description || undefined,
      classIds: values.allClasses ? [] : values.classIds,
      teachersOff: values.kind === "HOLIDAY" ? values.teachersOff : false,
    };
    try {
      if (entry) await update.mutateAsync({ entryId: entry.id, body });
      else await create.mutateAsync(body);
      toast.success(t(entry ? "updated" : "added", { name: name(values) }));
      onDone();
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, FIELDS, describeError));
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />

        {/* holiday or make-up working day */}
        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t("kind")}</FormLabel>
              <div className="grid gap-2 sm:grid-cols-2">
                {(["HOLIDAY", "WORKING_DAY"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => field.onChange(k)}
                    className={cn(
                      "cursor-pointer rounded-md border p-3 text-left text-sm transition-colors",
                      field.value === k ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted",
                    )}
                  >
                    <div className="font-medium">{t(`kinds.${k}`)}</div>
                    <div className="text-xs text-muted-foreground">{t(`kindHints.${k}`)}</div>
                  </button>
                ))}
              </div>
            </FormItem>
          )}
        />

        {kind === "HOLIDAY" && (
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("type")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full sm:w-64">
                      <SelectValue placeholder={t("chooseType")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {HOLIDAY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {tType(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <NameFields control={form.control} labels={{ nameEn: t("nameEn"), nameBn: t("nameBn") }} />

        <div className="grid gap-4 sm:grid-cols-2">
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
                        // a one-day entry is the usual case: keep the end date in step
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
        </div>

        {years.length > 1 && (
          <FormField
            control={form.control}
            name="academicYearId"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("academicYear")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full sm:w-64">
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
                <FormDescription>{t("academicYearHint")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* who it covers */}
        <FormField
          control={form.control}
          name="allClasses"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t("appliesTo")}</FormLabel>
              <div className="flex flex-wrap gap-4 text-sm">
                {[true, false].map((value) => (
                  <label key={String(value)} className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      className="size-4 accent-primary"
                      checked={field.value === value}
                      onChange={() => field.onChange(value)}
                    />
                    {value ? t("allClasses") : t("someClasses")}
                  </label>
                ))}
              </div>
            </FormItem>
          )}
        />

        {!allClasses && (
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
                        onChange={(e) =>
                          field.onChange(e.target.checked ? [...field.value, c.id] : field.value.filter((id) => id !== c.id))
                        }
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

        {kind === "HOLIDAY" && (
          <FormField
            control={form.control}
            name="teachersOff"
            render={({ field }) => (
              <FormItem>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 accent-primary"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                  />
                  <span>
                    <span className="font-medium">{t("teachersOff")}</span>
                    <span className="block text-xs text-muted-foreground">
                      {allClasses ? t("teachersOffHint") : t("teachersOffSomeClasses")}
                    </span>
                  </span>
                </label>
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("notes")}</FormLabel>
              <FormControl>
                <Textarea rows={2} {...field} />
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
