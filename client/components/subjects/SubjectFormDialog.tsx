"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm, type FieldPath, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { NameFields, useSchoolLanguage } from "@/components/school/NameFields";
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
import { applyServerErrors } from "@/lib/auth/formErrors";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  RELIGIONS,
  subjectKind,
  useCreateSubject,
  useUpdateSubject,
  type Subject,
  type SubjectScope,
} from "@/lib/subjects";
import {
  schoolSubjectFormSchema,
  subjectFormSchema,
  type SubjectFormInput,
  type SubjectFormValues,
} from "@/zod/subject";

type Props = {
  // PLATFORM: the NCTB list (both names required); SCHOOL: a school's own subject
  scope: SubjectScope;
  open: boolean;
  // null: adding a new subject
  subject: Subject | null;
  // every subject the paper's main subject can be chosen from
  subjects: Subject[];
  onClose: () => void;
};

export function SubjectFormDialog({ scope, open, subject, subjects, onClose }: Props) {
  const t = useTranslations("platform.subjects.form");
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{subject ? t("editTitle") : t("addTitle")}</DialogTitle>
          {scope === "PLATFORM" && <DialogDescription>{t("description")}</DialogDescription>}
        </DialogHeader>
        {/* remounted per subject so the fields start from that subject */}
        {open && (
          <SubjectForm key={subject?.id ?? "new"} scope={scope} subject={subject} subjects={subjects} onDone={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

const FIELDS: FieldPath<SubjectFormInput>[] = ["nameEn", "nameBn", "code", "parentId", "religion"];

function SubjectForm({
  scope,
  subject,
  subjects,
  onDone,
}: {
  scope: SubjectScope;
  subject: Subject | null;
  subjects: Subject[];
  onDone: () => void;
}) {
  const t = useTranslations("platform.subjects.form");
  const tReligion = useTranslations("religions");
  const tCommon = useTranslations("common");
  const name = useLocalizedName();
  const language = useSchoolLanguage();
  const describeError = useErrorMessage();
  const create = useCreateSubject(scope);
  const update = useUpdateSubject(scope);
  const [formError, setFormError] = useState<string | null>(null);
  const saving = create.isPending || update.isPending;

  const form = useForm<SubjectFormInput, unknown, SubjectFormValues>({
    resolver: (scope === "PLATFORM"
      ? zodResolver(subjectFormSchema)
      : zodResolver(schoolSubjectFormSchema(language))) as Resolver<SubjectFormInput, unknown, SubjectFormValues>,
    defaultValues: {
      nameEn: subject?.nameEn ?? "",
      nameBn: subject?.nameBn ?? "",
      code: subject?.code ?? "",
      kind: subject ? subjectKind(subject) : "main",
      parentId: subject?.parentId ?? "",
      religion: subject?.religion ?? "",
    },
  });

  const kind = form.watch("kind");

  // a paper's main subject: a main subject (not a paper, not a religion subject), never itself
  const parents = subjects.filter((s) => !s.parentId && !s.religion && s.id !== subject?.id);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const saved = subject
        ? await update.mutateAsync({ subjectId: subject.id, body: values })
        : await create.mutateAsync(values);
      toast.success(t(subject ? "updated" : "created", { name: name(saved) }));
      onDone();
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, FIELDS, describeError));
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />

        {scope === "SCHOOL" ? (
          <NameFields control={form.control} labels={{ nameEn: t("nameEn"), nameBn: t("nameBn") }} autoFocus />
        ) : (
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
        )}

        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("code")}</FormLabel>
              <FormControl>
                <Input className="w-40" spellCheck={false} {...field} />
              </FormControl>
              <FormDescription>{t("codeHint")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="kind"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t("kind")}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {(["main", "paper", "religion"] as const).map((k) => (
                    <SelectItem key={k} value={k}>
                      {t(`kinds.${k}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>{t(`kindHints.${kind}`)}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {kind === "paper" && (
          <FormField
            control={form.control}
            name="parentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("parent")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("parentPlaceholder")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {parents.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code ? `${p.code} · ` : ""}
                        {name(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {kind === "religion" && (
          <FormField
            control={form.control}
            name="religion"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("religion")}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("religionPlaceholder")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {RELIGIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {tReligion(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
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
