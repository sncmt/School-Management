"use client";

import { ChevronDown, Megaphone, Paperclip, Pin } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";
import { NoticeText } from "@/components/school/notices/NoticeText";
import { AttachmentList, CategoryBadge } from "@/components/school/notices/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { publicSchoolRoutes } from "@/lib/auth/routes";
import { fetchPublicNotice, fetchPublicNotices, type PublicNotice, type PublicNoticeItem, type PublicNoticePage } from "@/lib/publicNotices";

type Opened = { id: string; preview?: PublicNoticeItem };

// another part of the page (the hero's "latest notice" card) asks the board to open a notice
const OPEN_NOTICE_EVENT = "school-site:open-notice";
type OpenNoticeDetail = { notice: PublicNoticeItem };

/** A button anywhere on the homepage that opens a notice in the board's dialog. */
export function OpenNoticeButton({ notice, className, children }: { notice: PublicNoticeItem; className?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new CustomEvent<OpenNoticeDetail>(OPEN_NOTICE_EVENT, { detail: { notice } }))}
    >
      {children}
    </button>
  );
}

/*
 * The homepage's notices: newest first, a page at a time ("Show more"), each opening in full in a
 * dialog. The open notice is in the address ("/?notice=<id>"), so it can be shared and old notice
 * board links (sent here by the middleware) open it.
 */
export function NoticeBoard({ subdomain, first }: { subdomain: string; first: PublicNoticePage | null }) {
  const t = useTranslations("schoolHome.notices");
  const [items, setItems] = useState(first?.items ?? []);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [opened, setOpened] = useState<Opened | null>(null);
  const totalPages = first?.meta.totalPages ?? 0;

  // a notice named in the address opens on arrival
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("notice");
    if (id) setOpened({ id: id.slice(0, 64), preview: first?.items.find((n) => n.id === id) });
  }, [first]);

  const open = (notice: PublicNoticeItem) => {
    setOpened({ id: notice.id, preview: notice });
    history.replaceState(null, "", `/?${new URLSearchParams({ notice: notice.id })}`);
  };

  useEffect(() => {
    const onOpen = (e: Event) => open((e as CustomEvent<OpenNoticeDetail>).detail.notice);
    window.addEventListener(OPEN_NOTICE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_NOTICE_EVENT, onOpen);
  }, []);

  const close = () => {
    setOpened(null);
    history.replaceState(null, "", publicSchoolRoutes.notices);
  };

  const showMore = async () => {
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const next = await fetchPublicNotices(subdomain, page + 1);
      // a notice published meanwhile shifts the pages: skip any already shown
      setItems((shown) => [...shown, ...next.items.filter((n) => !shown.some((s) => s.id === n.id))]);
      setPage(page + 1);
    } catch {
      setMoreFailed(true);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/70 bg-card p-10 text-center text-sm text-muted-foreground">
          <Megaphone className="size-7 text-muted-foreground/50" />
          {t("empty")}
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border border-border/70 bg-card">
          {items.map((n) => (
            <li key={n.id}>
              <NoticeRow notice={n} onOpen={() => open(n)} />
            </li>
          ))}
        </ul>
      )}

      {page < totalPages && (
        <div className="mt-5 flex flex-col items-center gap-2">
          <Button variant="outline" onClick={showMore} disabled={loadingMore}>
            <ChevronDown /> {loadingMore ? t("loading") : t("showMore")}
          </Button>
          {moreFailed && <p className="text-xs text-destructive">{t("loadFailed")}</p>}
        </div>
      )}

      <NoticeDialog subdomain={subdomain} opened={opened} onClose={close} />
    </>
  );
}

function NoticeRow({ notice: n, onOpen }: { notice: PublicNoticeItem; onOpen: () => void }) {
  const t = useTranslations("schoolHome.notices");
  const format = useFormatter();
  const day = (opts: { day?: "numeric"; month?: "short"; year?: "numeric" }) => format.dateTime(new Date(n.publishAt), { ...opts, timeZone: "Asia/Dhaka" });

  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted/50 sm:px-5">
      <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-brand-soft py-2 text-center">
        <span className="text-xl leading-none font-semibold tabular-nums">{day({ day: "numeric" })}</span>
        <span className="mt-0.5 text-[13px] text-muted-foreground uppercase">{day({ month: "short" })}</span>
        <span className="text-[12px] text-muted-foreground tabular-nums">{day({ year: "numeric" })}</span>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="leading-snug font-medium">{n.title}</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <CategoryBadge category={n.category} />
          {n.pinned && (
            <span className="inline-flex items-center gap-1">
              <Pin className="size-3.5" /> {t("pinned")}
            </span>
          )}
          {n.attachmentCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="size-3.5" /> {t("files", { count: n.attachmentCount })}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

/* One notice in full. What the list already knows shows at once; the text and files load. */
function NoticeDialog({ subdomain, opened, onClose }: { subdomain: string; opened: Opened | null; onClose: () => void }) {
  const t = useTranslations("schoolHome.notices");
  const format = useFormatter();
  const [notice, setNotice] = useState<PublicNotice | null>(null);
  const [failed, setFailed] = useState(false);
  const id = opened?.id;

  useEffect(() => {
    if (!id) return;
    let current = true;
    setNotice(null);
    setFailed(false);
    fetchPublicNotice(subdomain, id)
      .then((n) => current && setNotice(n))
      .catch(() => current && setFailed(true));
    return () => {
      current = false;
    };
  }, [subdomain, id]);

  const head = notice ?? opened?.preview;
  const when = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "long", timeZone: "Asia/Dhaka" });

  return (
    <Dialog open={!!opened} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="space-y-2 border-b pb-4 text-left">
          {head && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <CategoryBadge category={head.category} />
              {head.pinned && (
                <span className="inline-flex items-center gap-1">
                  <Pin className="size-3.5" /> {t("pinned")}
                </span>
              )}
            </div>
          )}
          <DialogTitle className="text-xl leading-snug">
            {/* a span, not Skeleton's div: the title is a heading */}
            {head ? head.title : failed ? t("notFound") : <span className="block h-6 w-2/3 animate-pulse rounded-md bg-muted" />}
          </DialogTitle>
          {head ? (
            <DialogDescription>
              <time dateTime={head.publishAt}>{t("posted", { date: when(head.publishAt) })}</time>
              {head.expiresAt && ` · ${t("until", { date: when(head.expiresAt) })}`}
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{t("title")}</DialogDescription>
          )}
        </DialogHeader>

        {notice ? (
          <div className="space-y-5">
            <NoticeText body={notice.body} className="text-[17px]" />
            <AttachmentList attachments={notice.attachments} />
          </div>
        ) : failed ? (
          <p className="text-sm text-muted-foreground">{t("notFoundHint")}</p>
        ) : (
          <div className="space-y-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
