"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useClasses, type SchoolClass } from "@/lib/school/classes";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MAX_COUNT,
  NOTICE_AUDIENCES,
  NOTICE_CATEGORIES,
  noticesApi,
  useCreateNotice,
  useDetachNoticeFile,
  useNotice,
  useUpdateNotice,
  type NoticeBody,
  type NoticeDetail,
} from "@/lib/school/notices";
import { cn } from "@/lib/utils";
import { fromLocalInput, noticeFormSchema, toLocalInput, type NoticeFormValues } from "@/zod/notice";
import { useQueryClient } from "@tanstack/react-query";
import { NoticeText } from "./NoticeText";
import { useFileSize } from "./shared";

const FIELDS: FieldPath<NoticeFormValues>[] = ["title", "body", "category", "audience", "places", "isPublic", "pinned", "publishAt", "expiresAt"];

type Props = {
  open: boolean;
  // null: a new notice
  noticeId: string | null;
  canPublish: boolean;
  onClose: () => void;
};

export function NoticeFormDialog({ open, noticeId, canPublish, onClose }: Props) {
  const t = useTranslations("school.notices.form");
  const notice = useNotice(open ? noticeId : null);
  const describeError = useErrorMessage();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{noticeId ? t("editTitle") : t("addTitle")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {!open ? null : noticeId && notice.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : noticeId && notice.error ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{describeError(notice.error)}</p>
        ) : (
          <NoticeForm key={noticeId ?? "new"} notice={noticeId ? (notice.data ?? null) : null} canPublish={canPublish} onDone={onClose} />
        )}
      </DialogContent>
    </Dialog>
  );
}

const placesOf = (notice: NoticeDetail): NoticeFormValues["places"] => {
  const byClass = new Map<string, string[]>();
  for (const target of notice.targets) {
    const list = byClass.get(target.class.id) ?? [];
    if (target.section) list.push(target.section.id);
    byClass.set(target.class.id, list);
  }
  return [...byClass].map(([classId, sectionIds]) => ({ classId, sectionIds }));
};

type Mode = "draft" | "publish" | "save";

function NoticeForm({ notice, canPublish, onDone }: { notice: NoticeDetail | null; canPublish: boolean; onDone: () => void }) {
  const t = useTranslations("school.notices.form");
  const tCategory = useTranslations("school.notices.categories");
  const tAudience = useTranslations("school.notices.audiences");
  const describeError = useErrorMessage();
  const queryClient = useQueryClient();
  const classes = useClasses();
  const create = useCreateNotice();
  const update = useUpdateNotice();
  const detach = useDetachNoticeFile();
  const fileSize = useFileSize();
  const fileInput = useRef<HTMLInputElement>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Mode | null>(null);
  const [preview, setPreview] = useState(false);
  // files picked here, uploaded once the notice is saved
  const [queued, setQueued] = useState<File[]>([]);
  const [existing, setExisting] = useState(notice?.attachments ?? []);

  const published = notice?.status === "PUBLISHED";

  const form = useForm<NoticeFormValues>({
    resolver: zodResolver(noticeFormSchema),
    defaultValues: notice
      ? {
          title: notice.title,
          body: notice.body,
          category: notice.category,
          audience: notice.audience,
          allFamilies: notice.targets.length === 0,
          places: placesOf(notice),
          isPublic: notice.isPublic,
          pinned: notice.pinned,
          publishAt: toLocalInput(notice.publishAt),
          expiresAt: toLocalInput(notice.expiresAt),
        }
      : {
          title: "",
          body: "",
          category: "GENERAL",
          audience: "EVERYONE",
          allFamilies: true,
          places: [],
          isPublic: false,
          pinned: false,
          publishAt: "",
          expiresAt: "",
        },
  });

  const audience = useWatch({ control: form.control, name: "audience" });
  const allFamilies = useWatch({ control: form.control, name: "allFamilies" });
  const body = useWatch({ control: form.control, name: "body" });
  const publishAt = useWatch({ control: form.control, name: "publishAt" });
  const later = !!publishAt && new Date(publishAt) > new Date();

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

  const removeExisting = (attachmentId: string) => {
    if (!notice) return;
    detach.mutate(
      { noticeId: notice.id, attachmentId },
      {
        onSuccess: (updated) => setExisting(updated.attachments),
        onError: (e) => toast.error(describeError(e)),
      },
    );
  };

  const submit = (mode: Mode) =>
    form.handleSubmit(async (values) => {
      setFormError(null);
      setSaving(mode);
      const payload: NoticeBody = {
        title: values.title,
        body: values.body,
        category: values.category,
        audience: values.audience,
        targets:
          values.audience === "FAMILIES" && !values.allFamilies
            ? values.places.flatMap((p) =>
                p.sectionIds.length === 0 ? [{ classId: p.classId }] : p.sectionIds.map((sectionId) => ({ classId: p.classId, sectionId })),
              )
            : [],
        isPublic: values.isPublic,
        pinned: values.pinned,
        publishAt: fromLocalInput(values.publishAt),
        expiresAt: fromLocalInput(values.expiresAt),
      };
      let saved: NoticeDetail;
      try {
        // saved as a draft first, so its files are attached before anyone sees it
        saved = notice ? await update.mutateAsync({ noticeId: notice.id, body: payload }) : await create.mutateAsync({ ...payload, publish: false });
      } catch (error) {
        setFormError(applyServerErrors(error, form.setError, FIELDS, describeError));
        setSaving(null);
        return;
      }

      let failed = 0;
      for (const file of queued) {
        try {
          await noticesApi.attach({ noticeId: saved.id, file });
        } catch (error) {
          failed += 1;
          toast.error(`${file.name}: ${describeError(error)}`);
        }
      }

      try {
        if (mode === "publish") await noticesApi.publish({ noticeId: saved.id });
      } catch (error) {
        toast.error(describeError(error));
      }
      await queryClient.invalidateQueries({ queryKey: ["school", "notices"] });
      setSaving(null);

      toast.success(
        mode === "publish" ? (later ? t("scheduled") : t("published")) : mode === "draft" ? t("draftSaved") : t("saved"),
      );
      if (failed === 0) onDone();
      else setQueued([]);
    })();

  const busy = saving !== null;
  const filesCount = existing.length + queued.length;

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(published ? "save" : "draft");
        }}
        className="space-y-5"
        noValidate
      >
        <FormError message={formError} />

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
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t("category")}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {NOTICE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {tCategory(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        {/* who reads it in the app */}
        <FormField
          control={form.control}
          name="audience"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t("audience")}</FormLabel>
              <div className="grid gap-2 sm:grid-cols-3">
                {NOTICE_AUDIENCES.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => field.onChange(a)}
                    className={cn(
                      "cursor-pointer rounded-md border p-3 text-left text-sm transition-colors",
                      field.value === a ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted",
                    )}
                  >
                    <div className="font-medium">{tAudience(a)}</div>
                    <div className="text-xs text-muted-foreground">{t(`audienceHints.${a}`)}</div>
                  </button>
                ))}
              </div>
            </FormItem>
          )}
        />

        {audience === "FAMILIES" && (
          <div className="space-y-3 rounded-md border bg-muted/30 p-3">
            <FormField
              control={form.control}
              name="allFamilies"
              render={({ field }) => (
                <div className="flex flex-wrap gap-4 text-sm">
                  {[true, false].map((value) => (
                    <label key={String(value)} className="flex cursor-pointer items-center gap-2">
                      <input type="radio" className="size-4 accent-primary" checked={field.value === value} onChange={() => field.onChange(value)} />
                      {value ? t("allFamilies") : t("someClasses")}
                    </label>
                  ))}
                </div>
              )}
            />
            {!allFamilies && (
              <FormField
                control={form.control}
                name="places"
                render={({ field }) => (
                  <FormItem>
                    {classes.isPending ? (
                      <Skeleton className="h-24 w-full" />
                    ) : (
                      <PlacePicker classes={classes.data?.items ?? []} value={field.value} onChange={field.onChange} />
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between gap-2">
                <FormLabel required>{t("body")}</FormLabel>
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
                <div className="min-h-40 rounded-md border bg-background p-3">
                  {body.trim() ? <NoticeText body={body} /> : <p className="text-sm text-muted-foreground">{t("nothingYet")}</p>}
                </div>
              ) : (
                <FormControl>
                  <Textarea rows={9} {...field} placeholder={t("bodyPlaceholder")} />
                </FormControl>
              )}
              <FormDescription>{t("bodyHint")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* files */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{t("files.title")}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || filesCount >= ATTACHMENT_MAX_COUNT}
              onClick={() => fileInput.current?.click()}
            >
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
                <FileRow key={a.id} name={a.name} size={fileSize(a.size)} image={a.contentType.startsWith("image/")} disabled={busy || detach.isPending} onRemove={() => removeExisting(a.id)} />
              ))}
              {queued.map((file, i) => (
                <FileRow
                  key={`${file.name}-${i}`}
                  name={file.name}
                  size={fileSize(file.size)}
                  image={file.type.startsWith("image/")}
                  note={t("files.waiting")}
                  disabled={busy}
                  onRemove={() => setQueued((q) => q.filter((_, j) => j !== i))}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="publishAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("publishAt")}</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormDescription>{t("publishAtHint")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="expiresAt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("expiresAt")}</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormDescription>{t("expiresAtHint")}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3 rounded-md border p-3">
          {(["isPublic", "pinned"] as const).map((name) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <label className="flex cursor-pointer items-start justify-between gap-4 text-sm">
                  <span>
                    <span className="font-medium">{t(name)}</span>
                    <span className="block text-xs text-muted-foreground">{t(`${name}Hint`)}</span>
                  </span>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </label>
              )}
            />
          ))}
        </div>

        {!published && !canPublish && <p className="text-xs text-muted-foreground">{t("draftOnly")}</p>}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
            {t("cancel")}
          </Button>
          {published ? (
            <Button type="submit" disabled={busy}>
              {saving === "save" ? t("saving") : t("save")}
            </Button>
          ) : (
            <>
              <Button type="submit" variant={canPublish ? "outline" : "default"} disabled={busy}>
                {saving === "draft" ? t("saving") : t("saveDraft")}
              </Button>
              {canPublish && (
                <Button type="button" disabled={busy} onClick={() => submit("publish")}>
                  {saving === "publish" ? t("publishing") : later ? t("schedule") : t("publish")}
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </form>
    </Form>
  );
}

function FileRow({ name, size, image, note, disabled, onRemove }: { name: string; size: string; image: boolean; note?: string; disabled: boolean; onRemove: () => void }) {
  const t = useTranslations("school.notices.form.files");
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

/* Classes to tick; a class with several sections can be narrowed to some of them. */
function PlacePicker({
  classes,
  value,
  onChange,
}: {
  classes: SchoolClass[];
  value: NoticeFormValues["places"];
  onChange: (v: NoticeFormValues["places"]) => void;
}) {
  const t = useTranslations("school.notices.form");
  const chosen = new Map(value.map((p) => [p.classId, p.sectionIds]));
  const set = (classId: string, sectionIds: string[] | null) =>
    onChange(
      sectionIds === null
        ? value.filter((p) => p.classId !== classId)
        : chosen.has(classId)
          ? value.map((p) => (p.classId === classId ? { classId, sectionIds } : p))
          : [...value, { classId, sectionIds }],
    );

  if (classes.length === 0) return <p className="text-sm text-muted-foreground">{t("noClasses")}</p>;

  return (
    <ul className="max-h-72 divide-y overflow-y-auto rounded-md border bg-background">
      {classes.map((c) => {
        const sections = c.sections.filter((s) => !s.isDefault);
        const picked = chosen.get(c.id);
        return (
          <li key={c.id} className="px-3 py-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-primary" checked={!!picked} onChange={(e) => set(c.id, e.target.checked ? [] : null)} />
              <span className="font-medium">{c.name}</span>
              {picked && sections.length > 1 && (
                <span className="text-xs text-muted-foreground">{picked.length === 0 ? t("wholeClass") : t("someSections", { count: picked.length })}</span>
              )}
            </label>
            {picked && sections.length > 1 && (
              <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
                {sections.map((s) => {
                  const on = picked.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => set(c.id, on ? picked.filter((id) => id !== s.id) : [...picked, s.id])}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                        on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                      )}
                      aria-pressed={on}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
