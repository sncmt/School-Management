"use client";

import { FileText, Globe, Paperclip, Pin } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMarkNoticeRead, type NoticeAttachment, type NoticeCategory, type NoticeState } from "@/lib/school/notices";
import { cn } from "@/lib/utils";
import { NoticeText } from "./NoticeText";

const CATEGORY_STYLES: Record<NoticeCategory, string> = {
  GENERAL: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  EXAM: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  HOLIDAY: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  FEES: "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
  EVENT: "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  URGENT: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300",
};

export function CategoryBadge({ category, className }: { category: NoticeCategory; className?: string }) {
  const t = useTranslations("school.notices.categories");
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", CATEGORY_STYLES[category], className)}>
      {t(category)}
    </span>
  );
}

const STATE_STYLES: Record<NoticeState, string> = {
  LIVE: "bg-[#0ca30c]",
  SCHEDULED: "bg-[#fab219]",
  EXPIRED: "bg-muted-foreground/40",
  // hollow: not on the board yet
  DRAFT: "border border-muted-foreground/70",
};

/** Where a notice stands, as a dot and a word (never colour alone). */
export function StateLabel({ state }: { state: NoticeState }) {
  const t = useTranslations("school.notices.states");
  return (
    <span className="inline-flex items-center gap-2 text-sm whitespace-nowrap">
      <span className={cn("size-2 rounded-full", STATE_STYLES[state])} />
      {t(state)}
    </span>
  );
}

/** Notice dates in Bangladesh time: "18 Oct 2026", or with the time. */
export const useNoticeDate = () => {
  const format = useFormatter();
  return (iso: string, withTime = false) =>
    format.dateTime(new Date(iso), {
      day: "numeric",
      month: "short",
      year: "numeric",
      ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
      timeZone: "Asia/Dhaka",
    });
};

export const useFileSize = () => {
  const format = useFormatter();
  return (bytes: number) =>
    bytes >= 1024 * 1024
      ? `${format.number(bytes / (1024 * 1024), { maximumFractionDigits: 1 })} MB`
      : `${format.number(Math.max(1, Math.round(bytes / 1024)))} KB`;
};

/** Images as thumbnails, PDFs as rows; each opens in a new tab. */
export function AttachmentList({ attachments }: { attachments: NoticeAttachment[] }) {
  const t = useTranslations("school.notices.reader");
  const size = useFileSize();
  if (attachments.length === 0) return null;
  const images = attachments.filter((a) => a.contentType.startsWith("image/"));
  const files = attachments.filter((a) => !a.contentType.startsWith("image/"));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Paperclip className="size-3.5" /> {t("attachments", { count: attachments.length })}
      </div>
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((a) =>
            a.url ? (
              <a key={a.id} href={a.url} target="_blank" rel="noopener noreferrer" className="group block overflow-hidden rounded-lg border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element -- a signed link to private storage */}
                <img src={a.url} alt={a.name} className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.02]" />
              </a>
            ) : (
              <div key={a.id} className="flex aspect-[4/3] items-center justify-center rounded-lg border bg-muted p-2 text-center text-xs text-muted-foreground">
                {a.name}
              </div>
            ),
          )}
        </div>
      )}
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((a) => (
            <li key={a.id}>
              <a
                href={a.url ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={cn("flex items-center gap-3 rounded-lg border p-3 text-sm", a.url ? "hover:bg-muted" : "pointer-events-none opacity-60")}
              >
                <FileText className="size-5 shrink-0 text-red-600 dark:text-red-400" />
                <span className="min-w-0 flex-1 truncate font-medium">{a.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{size(a.size)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export type ReadableNotice = {
  id: string;
  title: string;
  body: string;
  category: NoticeCategory;
  pinned: boolean;
  isPublic: boolean;
  publishAt: string | null;
  expiresAt: string | null;
  attachments: NoticeAttachment[];
  // board notices: marked read when opened
  read?: boolean;
};

/** A notice in full. Opening an unread board notice marks it read. */
export function NoticeReader({ notice, onClose }: { notice: ReadableNotice | null; onClose: () => void }) {
  const t = useTranslations("school.notices.reader");
  const date = useNoticeDate();
  const markRead = useMarkNoticeRead();
  const marked = useRef<string | null>(null);

  useEffect(() => {
    if (notice && notice.read === false && marked.current !== notice.id) {
      marked.current = notice.id;
      markRead.mutate(notice.id);
    }
  }, [notice, markRead]);

  return (
    <Dialog open={!!notice} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {notice && (
          <>
            <DialogHeader className="space-y-2 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryBadge category={notice.category} />
                {notice.pinned && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Pin className="size-3.5" /> {t("pinned")}
                  </span>
                )}
                {notice.isPublic && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Globe className="size-3.5" /> {t("public")}
                  </span>
                )}
              </div>
              <DialogTitle className="text-xl leading-snug">{notice.title}</DialogTitle>
              <DialogDescription>
                {notice.publishAt ? t("posted", { date: date(notice.publishAt, true) }) : t("notPosted")}
                {notice.expiresAt && ` · ${t("until", { date: date(notice.expiresAt, true) })}`}
              </DialogDescription>
            </DialogHeader>
            <NoticeText body={notice.body} />
            <AttachmentList attachments={notice.attachments} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
