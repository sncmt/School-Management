"use client";

import { useTranslations } from "next-intl";
import type { Control, FieldValues, Path } from "react-hook-form";
import { FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import type { AdmissionType } from "@/lib/school/students";
import { cn } from "@/lib/utils";

const TYPES: AdmissionType[] = ["NEW", "OLD"];

/**
 * New to the school this year, or an old student: it decides whether the admission fee
 * or the re-admission fee is charged.
 */
export function AdmissionTypeField<T extends FieldValues, TOut = T>({
  control,
  name,
  hint,
}: {
  control: Control<T, unknown, TOut>;
  name: Path<T>;
  hint?: string;
}) {
  const t = useTranslations("school.students.admissionType");
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel required>{t("label")}</FormLabel>
          <div className="grid gap-2 sm:grid-cols-2">
            {TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => field.onChange(type)}
                className={cn(
                  "cursor-pointer rounded-md border p-2.5 text-left text-sm transition-colors",
                  field.value === type ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted",
                )}
              >
                <div className="font-medium">{t(`types.${type}`)}</div>
                <div className="text-xs text-muted-foreground">{t(`hints.${type}`)}</div>
              </button>
            ))}
          </div>
          {hint && <FormDescription>{hint}</FormDescription>}
        </FormItem>
      )}
    />
  );
}
