"use client";

import { BellOff, CheckCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { TablePagination } from "@/components/data/TablePagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolMe } from "@/lib/auth/hooks";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  useAnnouncements,
  useAnnouncementUnreadCount,
  useMarkAllAnnouncementsRead,
  useMarkAnnouncementRead,
} from "@/lib/school/announcements";
import { cn } from "@/lib/utils";
import { AnnouncementItem } from "./AnnouncementItem";
import { PageHero } from "@/components/layout/PageHero";

const PAGE_SIZES = [20, 50];

/** Every announcement from the platform, newest first, shown in full (super admin only). */
export function AnnouncementsPage() {
  const t = useTranslations("announcements");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const me = useSchoolMe();
  const allowed = !!me?.isSuperAdmin;

  const unread = useAnnouncementUnreadCount(allowed);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZES[0]);
  const { data, isPending, isError, error, isFetching, refetch } = useAnnouncements({ page, limit }, allowed);
  const markRead = useMarkAnnouncementRead();
  const markAll = useMarkAllAnnouncementsRead();

  // the text is all here: what's on screen counts as read, a moment after it is shown
  const shownUnread = data?.items.filter((a) => !a.read).map((a) => a.id).join(",") ?? "";
  const { mutate: markOne } = markRead;
  useEffect(() => {
    if (!shownUnread) return;
    const timer = setTimeout(() => shownUnread.split(",").forEach((id) => markOne(id)), 1500);
    return () => clearTimeout(timer);
  }, [shownUnread, markOne]);

  if (me && !allowed) return <p className="py-12 text-center text-sm text-muted-foreground">{t("superAdminOnly")}</p>;

  return (
    <div className="space-y-2">
      <PageHero
        title={t("pageTitle")}
        description={t("description")}
        actions={
          <>
            {unread > 0 && (
              <Button variant="outline" onClick={() => markAll.mutate(undefined)} disabled={markAll.isPending}>
                <CheckCheck /> {t("markAllRead")}
              </Button>
            )}
          </>
        }
      />

      <section className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-border/70 bg-card">
        <div className={cn("divide-y transition-opacity", isFetching && !isPending && "opacity-60")}>
          {isPending ? (
            Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex gap-3 px-5 py-4">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))
          ) : isError ? (
            <div className="flex flex-col items-center gap-2 px-5 py-14 text-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{t("loadFailed")}</p>
              <p className="text-xs">{describeError(error)}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                {tCommon("tryAgain")}
              </Button>
            </div>
          ) : data.items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 py-16 text-center text-sm text-muted-foreground">
              <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
                <BellOff className="size-5" />
              </span>
              <p className="font-medium text-foreground">{t("empty")}</p>
            </div>
          ) : (
            data.items.map((announcement) => (
              <article key={announcement.id} className={cn("px-5 py-4", !announcement.read && "bg-brand-soft/25")}>
                <AnnouncementItem announcement={announcement} />
              </article>
            ))
          )}
        </div>

        {data && data.meta.total > data.meta.limit && (
          <div className="border-t px-5 py-3">
            <TablePagination
              page={data.meta.page}
              limit={data.meta.limit}
              total={data.meta.total}
              totalPages={Math.max(1, data.meta.totalPages)}
              limits={PAGE_SIZES}
              onPageChange={setPage}
              onLimitChange={(n) => {
                setLimit(n);
                setPage(1);
              }}
              disabled={isFetching}
            />
          </div>
        )}
      </section>
    </div>
  );
}
