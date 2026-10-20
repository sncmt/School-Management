"use client";

import { CheckCheck, Inbox } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TablePagination } from "@/components/data/TablePagination";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
  type AppNotification,
} from "@/lib/school/notifications";
import { cn } from "@/lib/utils";
import { MESSAGE_HREF, MessageItem } from "./shared";

const PAGE_SIZES = [20, 50];

/** Every message for this login, newest first; all or only the unread ones. */
export function MessagesPage() {
  const t = useTranslations("inbox");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const router = useRouter();
  const unread = useUnreadCount();
  const [show, setShow] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZES[0]);
  const { data, isPending, isError, error, isFetching, refetch } = useNotifications({ page, limit, unread: show === "unread" });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const openMessage = (message: AppNotification) => {
    if (!message.read) markRead.mutate(message.id);
    router.push(MESSAGE_HREF);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" onClick={() => markAll.mutate(undefined)} disabled={markAll.isPending}>
            <CheckCheck /> {t("markAllRead")}
          </Button>
        )}
      </div>

      <section className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
        <div className="border-b px-4 py-3">
          <Tabs
            value={show}
            onValueChange={(v) => {
              setShow(v as "all" | "unread");
              setPage(1);
            }}
          >
            <TabsList variant="chip">
              <TabsTrigger value="all">{t("tabs.all")}</TabsTrigger>
              <TabsTrigger value="unread">
                {t("tabs.unread")}
                {unread > 0 && <span className="tabular-nums">({unread})</span>}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className={cn("divide-y transition-opacity", isFetching && !isPending && "opacity-60")}>
          {isPending ? (
            Array.from({ length: 5 }, (_, i) => (
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
              <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand dark:text-sidebar-primary">
                <Inbox className="size-5" />
              </span>
              <p className="font-medium text-foreground">{show === "unread" ? t("emptyUnread") : t("empty")}</p>
            </div>
          ) : (
            data.items.map((message) => (
              <button
                key={message.id}
                type="button"
                onClick={() => openMessage(message)}
                className={cn(
                  "block w-full px-5 py-4 transition-colors hover:bg-brand-soft/50 focus-visible:bg-brand-soft/50 focus-visible:outline-none",
                  !message.read && "bg-brand-soft/25",
                )}
              >
                <MessageItem message={message} />
              </button>
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
