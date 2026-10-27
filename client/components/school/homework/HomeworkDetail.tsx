"use client";

import { ArrowLeft, CheckCheck, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  CHECK_STATUSES,
  useDeleteHomework,
  useHomework,
  useSaveHomeworkChecks,
  type CheckBody,
  type CheckStatus,
  type HomeworkDetail as Detail,
  type SheetStudent,
} from "@/lib/school/homework";
import { cn } from "@/lib/utils";
import { NoticeText } from "../notices/NoticeText";
import { AttachmentList } from "../notices/shared";
import { StudentAvatar } from "../students/StudentAvatar";
import { HomeworkFormDialog } from "./HomeworkFormDialog";
import { CHECK_STYLES, CheckBadge, DueLabel, sectionNames, useDay } from "./shared";

/** One homework: what was given, and the class list to tick. */
export function HomeworkDetail({ homeworkId }: { homeworkId: string }) {
  const t = useTranslations("school.homework");
  const describeError = useErrorMessage();
  const { data, isPending, error } = useHomework(homeworkId);

  return (
    <div className="space-y-5">
      <Link href="/homework" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>
      {isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : error ? (
        <p className="rounded-2xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">{describeError(error)}</p>
      ) : (
        <>
          <Summary homework={data} />
          {/* a fresh sheet after the homework is edited (full marks or sections may have changed) */}
          <CheckSheet key={`${data.id}:${data.updatedAt}`} homework={data} />
        </>
      )}
    </div>
  );
}

function Summary({ homework }: { homework: Detail }) {
  const t = useTranslations("school.homework");
  const name = useLocalizedName();
  const day = useDay();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const sections = sectionNames(homework.sections);

  return (
    <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="text-sm text-muted-foreground">
            {homework.class.name}
            {sections && ` · ${t("sectionsList", { names: sections })}`} · <span className="font-medium text-foreground">{name(homework.classSubject.subject)}</span>
          </div>
          <h1 className="text-xl leading-snug font-semibold">{homework.title}</h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{t("givenOn", { date: day(homework.assignedOn, "weekday") })}</span>
            <span>
              {t("dueOn", { date: day(homework.dueDate, "weekday") })} · <DueLabel dueDate={homework.dueDate} />
            </span>
            {homework.fullMarks !== null && <span>{t("outOf", { marks: homework.fullMarks })}</span>}
            {homework.author && <span>{t("by", { name: homework.author })}</span>}
          </div>
        </div>
        {homework.canManage && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil /> {t("edit")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDeleting(true)} aria-label={t("delete")}>
              <Trash2 />
            </Button>
          </div>
        )}
      </div>
      {homework.instructions && <NoticeText body={homework.instructions} />}
      <AttachmentList attachments={homework.attachments} />

      <HomeworkFormDialog open={editing} homework={homework} onClose={() => setEditing(false)} />
      <DeleteDialog homework={deleting ? homework : null} onClose={() => setDeleting(false)} />
    </section>
  );
}

type Draft = { status: CheckStatus | null; marks: string; comment: string };

const draftOf = (s: SheetStudent): Draft => ({
  status: s.check?.status ?? null,
  marks: s.check?.marks === null || s.check?.marks === undefined ? "" : String(s.check.marks),
  comment: s.check?.comment ?? "",
});

const same = (a: Draft, b: Draft) => a.status === b.status && a.marks.trim() === b.marks.trim() && a.comment.trim() === b.comment.trim();

const takesMarks = (status: CheckStatus | null) => status === "DONE" || status === "LATE";

/** The class list: each student's tick, marks and comment, saved together. */
function CheckSheet({ homework }: { homework: Detail }) {
  const t = useTranslations("school.homework.sheet");
  const describeError = useErrorMessage();
  const save = useSaveHomeworkChecks();
  const saved = useMemo(() => new Map(homework.students.map((s) => [s.enrollmentId, draftOf(s)])), [homework.students]);
  const [drafts, setDrafts] = useState(saved);
  const editable = homework.canManage;
  const full = homework.fullMarks;

  const changed = homework.students.filter((s) => !same(drafts.get(s.enrollmentId)!, saved.get(s.enrollmentId)!));
  const set = (enrollmentId: string, patch: Partial<Draft>) =>
    setDrafts((d) => {
      const next = new Map(d);
      const cur = next.get(enrollmentId)!;
      const merged = { ...cur, ...patch };
      // only done homework has marks
      if (!takesMarks(merged.status)) merged.marks = "";
      next.set(enrollmentId, merged);
      return next;
    });

  const counts = CHECK_STATUSES.map((s) => ({ status: s, count: homework.students.filter((st) => drafts.get(st.enrollmentId)?.status === s).length }));
  const unticked = homework.students.filter((s) => !drafts.get(s.enrollmentId)?.status).length;

  const badMarks = (d: Draft) => {
    if (!d.marks.trim()) return false;
    const n = Number(d.marks);
    return !Number.isFinite(n) || n < 0 || (full !== null && n > full) || Math.round(n * 100) !== n * 100;
  };
  const invalid = changed.some((s) => badMarks(drafts.get(s.enrollmentId)!));

  const submit = () => {
    const checks: CheckBody[] = changed.map((s) => {
      const d = drafts.get(s.enrollmentId)!;
      return {
        enrollmentId: s.enrollmentId,
        status: d.status,
        marks: full !== null && takesMarks(d.status) && d.marks.trim() ? Number(d.marks) : null,
        comment: d.comment.trim() || null,
      };
    });
    save.mutate(
      { homeworkId: homework.id, checks },
      {
        onSuccess: () => toast.success(t("saved", { count: checks.length })),
        onError: (e) => toast.error(describeError(e)),
      },
    );
  };

  return (
    <section className="rounded-2xl border border-border/70 bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 className="font-semibold">{t("title", { count: homework.students.length })}</h2>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {counts.map((c) => (
              <span key={c.status} className="inline-flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", CHECK_STYLES[c.status].dot)} />
                {t(`count.${c.status}`, { count: c.count })}
              </span>
            ))}
            {unticked > 0 && <span>{t("unticked", { count: unticked })}</span>}
          </p>
        </div>
        {editable && homework.students.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={unticked === 0 || save.isPending}
              onClick={() => homework.students.forEach((s) => !drafts.get(s.enrollmentId)?.status && set(s.enrollmentId, { status: "DONE" }))}
            >
              <CheckCheck /> {t("restDone")}
            </Button>
            <Button size="sm" disabled={changed.length === 0 || invalid || save.isPending} onClick={submit}>
              {save.isPending ? t("saving") : changed.length > 0 ? t("saveCount", { count: changed.length }) : t("save")}
            </Button>
          </div>
        )}
      </header>

      {homework.students.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">{t("noStudents")}</p>
      ) : (
        <ul className="divide-y">
          {homework.students.map((s) => (
            <StudentRow
              key={s.enrollmentId}
              student={s}
              draft={drafts.get(s.enrollmentId)!}
              dirty={!same(drafts.get(s.enrollmentId)!, saved.get(s.enrollmentId)!)}
              editable={editable}
              fullMarks={full}
              badMarks={badMarks(drafts.get(s.enrollmentId)!)}
              showSection={homework.sections.filter((x) => !x.isDefault).length > 1}
              onChange={(patch) => set(s.enrollmentId, patch)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function StudentRow({
  student: s,
  draft,
  dirty,
  editable,
  fullMarks,
  badMarks,
  showSection,
  onChange,
}: {
  student: SheetStudent;
  draft: Draft;
  dirty: boolean;
  editable: boolean;
  fullMarks: number | null;
  badMarks: boolean;
  showSection: boolean;
  onChange: (patch: Partial<Draft>) => void;
}) {
  const t = useTranslations("school.homework.sheet");
  const tCheck = useTranslations("school.homework.checks");
  const name = useLocalizedName();
  return (
    <li className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3", dirty && "bg-brand-soft/40")}>
      <div className="flex min-w-48 flex-1 items-center gap-3">
        <span className="w-8 shrink-0 text-right text-sm text-muted-foreground tabular-nums">{s.rollNumber ?? "–"}</span>
        <StudentAvatar photo={s.student.photo} className="size-8" />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{name(s.student)}</div>
          {showSection && <div className="text-xs text-muted-foreground">{t("section", { name: s.section.name })}</div>}
        </div>
      </div>

      {editable ? (
        <>
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={t("tickFor", { name: name(s.student) })}>
            {CHECK_STATUSES.map((status) => {
              const on = draft.status === status;
              return (
                <button
                  key={status}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  // a second press clears the tick
                  onClick={() => onChange({ status: on ? null : status })}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    on ? CHECK_STYLES[status].chip : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", on ? CHECK_STYLES[status].dot : "bg-muted-foreground/40")} />
                  {tCheck(status)}
                </button>
              );
            })}
          </div>
          {fullMarks !== null && (
            <div className="flex items-center gap-1 text-sm">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                max={fullMarks}
                step="0.5"
                value={draft.marks}
                disabled={!takesMarks(draft.status)}
                onChange={(e) => onChange({ marks: e.target.value })}
                aria-label={t("marksFor", { name: name(s.student) })}
                aria-invalid={badMarks || undefined}
                className="h-8 w-20"
              />
              <span className="text-muted-foreground">/ {fullMarks}</span>
            </div>
          )}
          <Input
            value={draft.comment}
            maxLength={300}
            onChange={(e) => onChange({ comment: e.target.value })}
            placeholder={t("comment")}
            aria-label={t("commentFor", { name: name(s.student) })}
            className="h-8 w-full sm:w-56"
          />
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {draft.status ? <CheckBadge status={draft.status} /> : <span className="text-muted-foreground">{t("notTicked")}</span>}
          {fullMarks !== null && draft.marks && <span className="tabular-nums">{`${draft.marks} / ${fullMarks}`}</span>}
          {draft.comment && <span className="text-muted-foreground">“{draft.comment}”</span>}
        </div>
      )}
    </li>
  );
}

function DeleteDialog({ homework, onClose }: { homework: Detail | null; onClose: () => void }) {
  const t = useTranslations("school.homework.deleteDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const router = useRouter();
  const remove = useDeleteHomework();
  const confirm = () => {
    if (!homework) return;
    remove.mutate(homework.id, {
      onSuccess: () => {
        toast.success(t("done", { title: homework.title }));
        router.push("/homework");
      },
      onError: (e) => toast.error(describeError(e)),
    });
  };
  return (
    <AlertDialog open={!!homework} onOpenChange={(open) => !open && !remove.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { title: homework?.title ?? "" })}</AlertDialogTitle>
          <AlertDialogDescription>{t("description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>{tCommon("cancel")}</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={remove.isPending}>
            {remove.isPending ? t("working") : t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
