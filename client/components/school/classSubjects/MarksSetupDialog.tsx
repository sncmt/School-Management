"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCan } from "@/lib/auth/hooks";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useGradingScales, useSetClassSubjectMarks, type ClassSubject } from "@/lib/school/classSubjects";
import type messages from "@/messages/en.json";
import { marksSetupSchema, type MarksSetupInput, type MarksSetupValues } from "@/zod/classSubject";

const CLASS_SCALE = "class"; // Select can't hold an empty value

// "100.00" -> "100"
const marksText = (v: string | null) => (v == null ? "" : String(Number(v)));

export function MarksSetupDialog({ classSubject, onClose }: { classSubject: ClassSubject | null; onClose: () => void }) {
  const t = useTranslations("school.classSubjects.marksDialog");
  const name = useLocalizedName();
  return (
    <Dialog open={!!classSubject} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title", { subject: classSubject ? name(classSubject.subject) : "" })}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {classSubject && <MarksForm key={classSubject.id} classSubject={classSubject} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function MarksForm({ classSubject, onDone }: { classSubject: ClassSubject; onDone: () => void }) {
  const t = useTranslations("school.classSubjects.marksDialog");
  const tValidation = useTranslations("validation");
  const tCommon = useTranslations("common");
  const can = useCan();
  const describeError = useErrorMessage();
  const save = useSetClassSubjectMarks();
  const scales = useGradingScales(can("grading:view"));
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<MarksSetupInput, unknown, MarksSetupValues>({
    resolver: zodResolver(marksSetupSchema),
    defaultValues: {
      fullMarks: marksText(classSubject.fullMarks),
      passMarks: marksText(classSubject.passMarks),
      parts: classSubject.parts.map((p) => ({
        name: p.name,
        fullMarks: marksText(p.fullMarks),
        passMarks: marksText(p.passMarks),
      })),
      gradingScaleId: classSubject.gradingScale?.id ?? "",
    },
  });
  const parts = useFieldArray({ control: form.control, name: "parts" });

  // an error about the parts as a whole ("must add up to the full marks")
  const partsError = form.formState.errors.parts?.root?.message ?? form.formState.errors.parts?.message;
  const partsErrorKey = partsError?.replace(/^validation\./, "") as keyof (typeof messages)["validation"] | undefined;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await save.mutateAsync({ classSubjectId: classSubject.id, body: values });
      toast.success(t("saved"));
      onDone();
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, ["fullMarks", "passMarks", "gradingScaleId"], describeError));
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fullMarks"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("fullMarks")}</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" autoFocus {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="passMarks"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("passMarks")}</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t("parts")}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => parts.append({ name: "", fullMarks: "", passMarks: "" })}
              disabled={parts.fields.length >= 5}
            >
              <Plus /> {t("addPart")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("partsHint")}</p>

          {parts.fields.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_5rem_5rem_2rem] gap-2 text-xs text-muted-foreground">
                <span>{t("partName")}</span>
                <span>{t("partFull")}</span>
                <span>{t("partPass")}</span>
              </div>
              {parts.fields.map((row, i) => (
                <div key={row.id} className="grid grid-cols-[1fr_5rem_5rem_2rem] items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`parts.${i}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder={t("partNamePlaceholder")} aria-label={t("partName")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`parts.${i}.fullMarks`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input inputMode="decimal" aria-label={t("partFull")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`parts.${i}.passMarks`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input inputMode="decimal" aria-label={t("partPass")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    onClick={() => parts.remove(i)}
                    aria-label={t("removePart")}
                  >
                    <X />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {partsErrorKey && (
            <p className="text-sm text-destructive">
              {tValidation.has(partsErrorKey) ? tValidation(partsErrorKey) : partsError}
            </p>
          )}
        </div>

        <FormField
          control={form.control}
          name="gradingScaleId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("scale")}</FormLabel>
              <Select
                value={field.value || CLASS_SCALE}
                onValueChange={(v) => field.onChange(v === CLASS_SCALE ? "" : v)}
                disabled={!can("grading:view")}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={CLASS_SCALE}>{t("classScale")}</SelectItem>
                  {/* the saved scale, even if the list hasn't loaded it */}
                  {classSubject.gradingScale && !scales.data?.some((s) => s.id === classSubject.gradingScale!.id) && (
                    <SelectItem value={classSubject.gradingScale.id}>{classSubject.gradingScale.name}</SelectItem>
                  )}
                  {scales.data?.map((scale) => (
                    <SelectItem key={scale.id} value={scale.id}>
                      {scale.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone} disabled={save.isPending}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
