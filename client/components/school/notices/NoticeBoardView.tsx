"use client";

import { Megaphone, Paperclip, Pin } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { NOTICE_CATEGORIES, useNoticeBoard, type BoardNotice, type NoticeCategory } from "@/lib/school/notices";
import { cn } from "@/lib/utils";
import { Pager } from "../finance/collect/PaymentsTab";
import { noticeSnippet } from "./NoticeText";
import { CategoryBadge, NoticeReader, useNoticeDate } from "./shared";

const PAGE_SIZE = 10;

/** The notices meant for this person now: pinned first, unread ones marked. */
export function NoticeBoardView() {
  const t = useTranslations("school.notices.board");
  const tCategory = useTranslations("school.notices.categories");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const [category, setCategory] = useState<NoticeCategory | undefined>();
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<BoardNotice | null>(null);
  const { data, isPending, error, refetch } = useNoticeBoard({ page, limit: PAGE_SIZE, category });

  const chip = (value: NoticeCategory | undefined, label: string) => (
    <button
      key={value ?? "all"}
      type="button"
      onClick={() => {
        setCategory(value);
        setPage(1);
      }}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        category === value ? "border-foreground bg-foreground text-background" : "bg-card hover:bg-muted",
      )}
      aria-pressed={category === value}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {chip(undefined, t("all"))}
        {NOTICE_CATEGORIES.map((c) => chip(c, tCategory(c)))}
        {!!data?.unread && <span className="ml-auto text-xs text-muted-foreground">{t("unread", { count: data.unread })}</span>}
      </div>

      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">
          <p>{describeError(error)}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {tCommon("tryAgain")}
          </Button>
        </div>
      ) : data.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/70 bg-card p-10 text-center text-sm text-muted-foreground">
          <Megaphone className="size-8 text-muted-foreground/50" />
          {category ? t("emptyCategory") : t("empty")}
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {data.items.map((n) => (
              <li key={n.id}>
                <NoticeCard notice={n} onOpen={() => setOpen(n)} />
              </li>
            ))}
          </ul>
          {data.meta.totalPages > 1 && <Pager page={page} totalPages={data.meta.totalPages} onPage={setPage} />}
        </>
      )}

      <NoticeReader notice={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function NoticeCard({ notice, onOpen }: { notice: BoardNotice; onOpen: () => void }) {
  const t = useTranslations("school.notices.board");
  const date = useNoticeDate();
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group relative flex w-full gap-4 rounded-2xl border border-border/70 bg-card p-4 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-shadow hover:shadow-md sm:p-5",
        !notice.read && "border-l-4 border-l-brand",
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <CategoryBadge category={notice.category} />
          <span>{date(notice.publishAt)}</span>
          {notice.pinned && (
            <span className="inline-flex items-center gap-1">
              <Pin className="size-3.5" /> {t("pinned")}
            </span>
          )}
          {notice.attachments.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="size-3.5" /> {notice.attachments.length}
            </span>
          )}
          {!notice.read && <span className="font-medium text-foreground">{t("new")}</span>}
        </div>
        <h3 className={cn("text-base leading-snug", notice.read ? "font-medium" : "font-semibold")}>{notice.title}</h3>
        <p className="line-clamp-2 text-sm text-muted-foreground">{noticeSnippet(notice.body, 220)}</p>
      </div>
    </button>
  );
}
