"use client";

import type { Control, FieldValues, Path } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useSchoolMe } from "@/lib/auth/hooks";
import type { SchoolLanguage } from "@/zod/names";

/** The school's language, from the logged-in session (Bangla until it loads). */
export const useSchoolLanguage = (): SchoolLanguage => useSchoolMe()?.school.language ?? "BN";

// TOut: what the form's schema turns the values into on submit ("" -> null)
type Props<T extends FieldValues, TOut> = {
  control: Control<T, unknown, TOut>;
  labels: { nameEn: string; nameBn: string };
  autoFocus?: boolean;
};

/*
 * The English and Bangla name inputs of a school record: the school's language first,
 * the only one marked required. The form's schema (schoolNameFields) enforces the same rule.
 */
export function NameFields<T extends FieldValues, TOut = T>({ control, labels, autoFocus }: Props<T, TOut>) {
  const language = useSchoolLanguage();
  const order = language === "BN" ? (["nameBn", "nameEn"] as const) : (["nameEn", "nameBn"] as const);
  const required = order[0];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {order.map((field, i) => (
        <FormField
          key={field}
          control={control}
          name={field as Path<T>}
          render={({ field: input }) => (
            <FormItem>
              <FormLabel required={field === required}>{labels[field]}</FormLabel>
              <FormControl>
                <Input lang={field === "nameBn" ? "bn" : "en"} autoFocus={autoFocus && i === 0} {...input} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
    </div>
  );
}
