"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, ImageIcon, Paperclip, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useForm, useWatch, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  homeworkApi,
  homeworkKey,
  todayKey,
  useCreateHomework,
  useDetachHomeworkFile,
  useHomeworkOptions,
  useUpdateHomework,
  type HomeworkDetail,
  type HomeworkOption,
} from "@/lib/school/homework";
import { ATTACHMENT_ACCEPT, ATTACHMENT_MAX_BYTES, ATTACHMENT_MAX_COUNT } from "@/lib/school/notices";
import { cn } from "@/lib/utils";
import { homeworkFormSchema, type HomeworkFormValues } from "@/zod/homework";
import { NoticeText } from "../notices/NoticeText";
import { useFileSize } from "../notices/shared";

const FIELDS: FieldPath<HomeworkFormValues>[] = ["classSubjectId", "sectionIds", "title", "instructions", "assignedOn", "dueDate", "fullMarks"];

type Props = {
  open: boolean;
  // null: new homework
  homework: HomeworkDetail | null;
  onClose: () => void;
  // the new homework, to open it
  onCreated?: (homeworkId: string) => void;
};

export function HomeworkFormDialog({ open, homework, onClose, onCreated }: Props) {
  const t = useTranslations("school.homework.form");
  const options = useHomeworkOptions(open);
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{homework ? t("editTitle") : t("addTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {!open ? null : options.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <HomeworkForm key={homework?.id ?? "new"} homework={homework} options={options.data?.subjects ?? []} onDone={onClose} onCreated={onCreated} />
        )}
      </DialogContent>
    </Dialog>
  );
}

const tomorrow = () => new Date(Date.parse(`${todayKey()}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

function HomeworkForm({
  homework,
  options,
  onDone,
  onCreated,
}: {
  homework: HomeworkDetail | null;
  options: HomeworkOption[];
  onDone: () => void;
  onCreated?: (homeworkId: string) => void;
}) {
  const t = useTranslations("school.homework.form");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const queryClient = useQueryClient();
  const create = useCreateHomework();
  const update = useUpdateHomework();
  const detach = useDetachHomeworkFile();
  const fileSize = useFileSize();
  const fileInput = useRef<HTMLInputElement>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [queued, setQueued] = useState<File[]>([]);
  const [existing, setExisting] = useState(homework?.attachments ?? []);

  const form = useForm<HomeworkFormValues>({
    resolver: zodResolver(homeworkFormSchema),
    defaultValues: homework
      ? {
          classSubjectId: homework.classSubjectId,
          sectionIds: homework.sections.map((s) => s.id),
          title: homework.title,
          instructions: homework.instructions,
          assignedOn: homework.assignedOn,
          dueDate: homework.dueDate,
          hasMarks: homework.fullMarks !== null,
          fullMarks: homework.fullMarks === null ? "10" : String(homework.fullMarks),
        }
      : {
          classSubjectId: options.length === 1 ? options[0].classSubjectId : "",
          sectionIds: options.length === 1 ? options[0].sections.map((s) => s.id) : [],
          title: "",
          instructions: "",
          assignedOn: todayKey(),
          dueDate: tomorrow(),
          hasMarks: false,
          fullMarks: "10",
        },
  });

  const classSubjectId = useWatch({ control: form.control, name: "classSubjectId" });
  const hasMarks = useWatch({ control: form.control, name: "hasMarks" });
  const instructions = useWatch({ control: form.control, name: "instructions" });
  const option = options.find((o) => o.classSubjectId === classSubjectId);
  // editing: the homework's own sections stay choosable even if the person no longer teaches one
  const sections = homework
    ? [...(option?.sections ?? []), ...homework.sections.filter((s) => !option?.sections.some((o) => o.id === s.id))]
    : (option?.sections ?? []);
  const subjectLabel = (o: { class: { name: string }; subject: { nameEn: string | null; nameBn: string | null }; group: { nameEn: string | null; nameBn: string | null } | null }) =>
    `${o.class.name} · ${name(o.subject)}${o.group ? ` (${name(o.group)})` : ""}`;

  const pickFiles = (files: FileList | null) => {
    if (!files) return;
    const room = ATTACHMENT_MAX_COUNT - existing.length - queued.length;
    const picked: File[] = [];
    for (const file of Array.from(files)) {
      if (!ATTACHMENT_ACCEPT.split(",").includes(file.type)) toast.error(t("files.wrongType", { name: file.name }));
      else if (file.size > ATTACHMENT_MAX_BYTES) toast.error(t("files.tooLarge", { name: file.name }));
      else picked.push(file);
    }
    if (picked.length > room) toast.error(t("files.tooMany", { count: ATTACHMENT_MAX_COUNT }));
    setQueued((q) => [...q, ...picked.slice(0, Math.max(0, room))]);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    setSaving(true);
    const body = {
      sectionIds: values.sectionIds,
      title: values.title,
      instructions: values.instructions,
      assignedOn: values.assignedOn,
      dueDate: values.dueDate,
      fullMarks: values.hasMarks ? Number(values.fullMarks) : null,
    };
    let saved: HomeworkDetail;
    try {
      saved = homework
        ? await update.mutateAsync({ homeworkId: homework.id, body })
        : await create.mutateAsync({ ...body, classSubjectId: values.classSubjectId });
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, FIELDS, describeError));
      setSaving(false);
      return;
    }
    let failed = 0;
    for (const file of queued) {
      try {
        await homeworkApi.attach({ homeworkId: saved.id, file });
      } catch (error) {
        failed += 1;
        toast.error(`${file.name}: ${describeError(error)}`);
      }
    }
    await queryClient.invalidateQueries({ queryKey: homeworkKey });
    setSaving(false);
    toast.success(homework ? t("saved") : t("given"));
    if (failed > 0) {
      setQueued([]);
      return;
    }
    onDone();
    if (!homework) onCreated?.(saved.id);
  });

  const filesCount = existing.length + queued.length;

  if (!homework && options.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{t("noSubjects")}</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormError message={formError} />

        {homework ? (
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">{t("subject")}: </span>
            <span className="font-medium">{subjectLabel({ class: homework.class, subject: homework.classSubject.subject, group: homework.classSubject.group })}</span>
          </div>
        ) : (
          <FormField
            control={form.control}
            name="classSubjectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("subject")}</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    // all the subject's sections to start with
                    form.setValue("sectionIds", options.find((o) => o.classSubjectId === v)?.sections.map((s) => s.id) ?? []);
                  }}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("chooseSubject")} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {options.map((o) => (
                      <SelectItem key={o.classSubjectId} value={o.classSubjectId}>
                        {subjectLabel(o)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* a class without sections of its own has one hidden section: nothing to choose */}
        {sections.some((s) => !s.isDefault) && (
          <FormField
            control={form.control}
            name="sectionIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("sections")}</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {sections.map((s) => {
                    const on = field.value.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => field.onChange(on ? field.value.filter((id) => id !== s.id) : [...field.value, s.id])}
                        className={cn(
                          "rounded-full border px-3 py-1 text-sm transition-colors",
                          on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                        )}
                      >
                        {s.isDefault ? t("wholeClass") : s.name}
                      </button>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t("title")}</FormLabel>
              <FormControl>
                <Input {...field} maxLength={200} placeholder={t("titlePlaceholder")} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between gap-2">
                <FormLabel>{t("instructions")}</FormLabel>
                <div className="flex rounded-md border p-0.5 text-xs">
                  {[false, true].map((p) => (
                    <button
                      key={String(p)}
                      type="button"
                      onClick={() => setPreview(p)}
                      className={cn("rounded px-2 py-0.5", preview === p ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground")}
                    >
                      {p ? t("preview") : t("write")}
                    </button>
                  ))}
                </div>
              </div>
              {preview ? (
                <div className="min-h-28 rounded-md border bg-background p-3">
                  {instructions.trim() ? <NoticeText body={instructions} /> : <p className="text-sm text-muted-foreground">{t("nothingYet")}</p>}
                </div>
              ) : (
                <FormControl>
                  <Textarea rows={6} {...field} placeholder={t("instructionsPlaceholder")} />
                </FormControl>
              )}
              <FormDescription>{t("instructionsHint")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {(["assignedOn", "dueDate"] as const).map((name) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t(name)}</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        // keep the due date on or after the day it is given
                        if (name === "assignedOn" && form.getValues("dueDate") < e.target.value) form.setValue("dueDate", e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>

        <div className="space-y-3 rounded-md border p-3">
          <FormField
            control={form.control}
            name="hasMarks"
            render={({ field }) => (
              <label className="flex cursor-pointer items-start justify-between gap-4 text-sm">
                <span>
                  <span className="font-medium">{t("hasMarks")}</span>
                  <span className="block text-xs text-muted-foreground">{t("hasMarksHint")}</span>
                </span>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </label>
            )}
          />
          {hasMarks && (
            <FormField
              control={form.control}
              name="fullMarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>{t("fullMarks")}</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="decimal" min={1} max={1000} step="0.5" className="w-32" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {homework && homework.fullMarks !== null && !hasMarks && <p className="text-xs text-[#b4271f] dark:text-[#ff7a70]">{t("marksWillGo")}</p>}
        </div>

        {/* files */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{t("files.title")}</span>
            <Button type="button" variant="outline" size="sm" disabled={saving || filesCount >= ATTACHMENT_MAX_COUNT} onClick={() => fileInput.current?.click()}>
              <Paperclip /> {t("files.add")}
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept={ATTACHMENT_ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => {
                pickFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
          {filesCount === 0 ? (
            <p className="text-xs text-muted-foreground">{t("files.hint", { count: ATTACHMENT_MAX_COUNT })}</p>
          ) : (
            <ul className="space-y-1.5">
              {existing.map((a) => (
                <FileRow
                  key={a.id}
                  name={a.name}
                  size={fileSize(a.size)}
                  image={a.contentType.startsWith("image/")}
                  disabled={saving || detach.isPending}
                  onRemove={() =>
                    homework &&
                    detach.mutate(
                      { homeworkId: homework.id, attachmentId: a.id },
                      { onSuccess: (updated) => setExisting(updated.attachments), onError: (e) => toast.error(describeError(e)) },
                    )
                  }
                />
              ))}
              {queued.map((file, i) => (
                <FileRow
                  key={`${file.name}-${i}`}
                  name={file.name}
                  size={fileSize(file.size)}
                  image={file.type.startsWith("image/")}
                  note={t("files.waiting")}
                  disabled={saving}
                  onRemove={() => setQueued((q) => q.filter((_, j) => j !== i))}
                />
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t("saving") : homework ? t("save") : t("give")}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function FileRow({ name, size, image, note, disabled, onRemove }: { name: string; size: string; image: boolean; note?: string; disabled: boolean; onRemove: () => void }) {
  const t = useTranslations("school.homework.form.files");
  const Icon = image ? ImageIcon : FileText;
  return (
    <li className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
      <Icon className={cn("size-4 shrink-0", image ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400")} />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <span className="shrink-0 text-xs text-muted-foreground">
        {size}
        {note && ` · ${note}`}
      </span>
      <Button type="button" variant="ghost" size="icon" className="size-7" disabled={disabled} onClick={onRemove} aria-label={t("remove", { name })}>
        <X />
      </Button>
    </li>
  );
}

