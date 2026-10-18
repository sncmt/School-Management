"use client";

import { BookOpenCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useFamilyHome } from "@/lib/school/family";
import { daysFromToday, useFamilyHomework, type FamilyHomeworkItem } from "@/lib/school/homework";
import { cn } from "@/lib/utils";
import { Pager } from "../finance/collect/PaymentsTab";
import { NoticeText } from "../notices/NoticeText";
import { AttachmentList } from "../notices/shared";
import { StudentAvatar } from "../students/StudentAvatar";
import { CheckBadge, DueLabel, useDay } from "./shared";

/** The family login: each child's homework, with how the teacher ticked it. */
export function FamilyHomework() {
  const t = useTranslations("school.homework.family");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const home = useFamilyHome();
  const [chosen, setChosen] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const children = (home.data?.children ?? []).filter((c) => c.enrollment);
  const childId = chosen ?? children[0]?.id;
  const list = useFamilyHomework(childId, page);

  if (home.isPending) return <Skeleton className="h-64 rounded-xl" />;
  if (home.error) return <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{describeError(home.error)}</p>;
  if (children.length === 0) return <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{t("noChildren")}</p>;

  return (
    <div className="space-y-4">
      {children.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist">
          {children.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === childId}
              onClick={() => {
                setChosen(c.id);
                setPage(1);
              }}
              className={cn(
                "flex items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm transition-colors",
                c.id === childId ? "border-foreground bg-foreground text-background" : "bg-card hover:bg-muted",
              )}
            >
              <StudentAvatar photo={c.photo} className="size-7" />
              {name(c)}
              {c.homework.total > 0 && (
                <span className={cn("rounded-full px-1.5 text-xs tabular-nums", c.id === childId ? "bg-background/20" : "bg-brand text-brand-foreground")}>{c.homework.total}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {list.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : list.error ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{describeError(list.error)}</p>
      ) : list.data.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          <BookOpenCheck className="size-8 text-muted-foreground/50" />
          {t("empty")}
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {list.data.items.map((hw) => (
              <li key={hw.id}>
                <HomeworkCard homework={hw} />
              </li>
            ))}
          </ul>
          {list.data.meta.totalPages > 1 && <Pager page={page} totalPages={list.data.meta.totalPages} onPage={setPage} />}
        </>
      )}
    </div>
  );
}

function HomeworkCard({ homework: hw }: { homework: FamilyHomeworkItem }) {
  const t = useTranslations("school.homework.family");
  const name = useLocalizedName();
  const day = useDay();
  const upcoming = daysFromToday(hw.dueDate) >= 0;
  const [open, setOpen] = useState(upcoming);

  return (
    <article className={cn("rounded-xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]", upcoming && !hw.check && "border-l-4 border-l-brand")}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full flex-wrap items-start gap-x-4 gap-y-2 p-4 text-left sm:p-5">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-xs font-medium text-muted-foreground">{name(hw.subject)}</div>
          <h3 className="leading-snug font-semibold">{hw.title}</h3>
          <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            <span>{t("given", { date: day(hw.assignedOn) })}</span>
            <span>
              {t("due", { date: day(hw.dueDate, "weekday") })} · <DueLabel dueDate={hw.dueDate} done={!!hw.check} />
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 text-sm">
          {hw.check ? <CheckBadge status={hw.check.status} /> : <span className="text-xs text-muted-foreground">{upcoming ? t("toDo") : t("notTicked")}</span>}
          {hw.check?.marks !== null && hw.check?.marks !== undefined && hw.fullMarks !== null && (
            <span className="font-semibold tabular-nums">{`${hw.check.marks} / ${hw.fullMarks}`}</span>
          )}
        </div>
      </button>
      {open && (hw.instructions || hw.attachments.length > 0 || hw.check?.comment) && (
        <div className="space-y-4 border-t px-4 py-4 sm:px-5">
          {hw.check?.comment && (
            <p className="rounded-lg bg-brand-soft/60 px-3 py-2 text-sm">
              <span className="font-medium">{t("teacherSays")}</span> {hw.check.comment}
            </p>
          )}
          {hw.instructions && <NoticeText body={hw.instructions} />}
          <AttachmentList attachments={hw.attachments} />
        </div>
      )}
    </article>
  );
}
