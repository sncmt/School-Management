"use client";

import { ArrowRight, CalendarHeart, Megaphone, Pin } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalizedName } from "@/lib/i18n/names";
import { useNoticeBoard, type BoardNotice } from "@/lib/school/notices";
import { cn } from "@/lib/utils";
import { CategoryBadge, NoticeReader, useNoticeDate } from "../notices/shared";

// Pieces shared by the staff dashboard and the family home.

export function Panel({ title, action, className, children }: { title: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cn("rounded-xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]", className)}>
      <header className="flex items-center justify-between gap-2 border-b px-5 py-4">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
      {children} <ArrowRight className="size-3.5" />
    </Link>
  );
}

export type UpcomingHoliday = { id: string; nameEn: string | null; nameBn: string | null; kind: string; type: string | null; from: string; to: string };

export function UpcomingPanel({ items, className }: { items: UpcomingHoliday[]; className?: string }) {
  const t = useTranslations("school.home.upcoming");
  const format = useFormatter();
  const name = useLocalizedName();
  const day = (key: string, opts: { day?: "numeric"; month?: "short"; weekday?: "long" }) => format.dateTime(new Date(`${key}T00:00:00Z`), { ...opts, timeZone: "UTC" });
  return (
    <Panel title={t("title")} className={className}>
      {items.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <CalendarHeart className="size-8 text-muted-foreground/50" />
          {t("none")}
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((e) => (
            <li key={e.id} className="flex items-center gap-4">
              <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-brand-soft py-1.5 text-center">
                <span className="text-lg leading-none font-semibold tabular-nums">{day(e.from, { day: "numeric" })}</span>
                <span className="text-[11px] text-muted-foreground uppercase">{day(e.from, { month: "short" })}</span>
              </div>
              <div className="min-w-0">
                <div className="truncate font-medium">{name(e)}</div>
                <div className="text-xs text-muted-foreground">
                  {e.from === e.to ? day(e.from, { weekday: "long" }) : t("range", { from: day(e.from, { day: "numeric", month: "short" }), to: day(e.to, { day: "numeric", month: "short" }) })}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/* The newest notices meant for this person, unread ones marked; each opens in full. */
export function NoticesPanel({ className }: { className?: string }) {
  const t = useTranslations("school.home.notices");
  const date = useNoticeDate();
  const { data, isPending } = useNoticeBoard({ limit: 5 });
  const [open, setOpen] = useState<BoardNotice | null>(null);
  return (
    <Panel
      title={t("title")}
      className={className}
      action={
        <div className="flex items-center gap-3">
          {!!data?.unread && (
            <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-brand-foreground">{t("unread", { count: data.unread })}</span>
          )}
          <PanelLink href="/notices">{t("open")}</PanelLink>
        </div>
      }
    >
      {isPending ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="flex min-h-32 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <Megaphone className="size-8 text-muted-foreground/50" />
          {t("none")}
        </div>
      ) : (
        <ul className="-my-2 divide-y">
          {data.items.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => setOpen(n)} className="flex w-full items-center gap-3 py-3 text-left">
                <span className={cn("size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand")} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-sm hover:underline", !n.read && "font-semibold")}>
                    {n.pinned && <Pin className="mr-1 inline size-3.5 text-muted-foreground" />}
                    {n.title}
                    {!n.read && <span className="sr-only"> ({t("new")})</span>}
                  </span>
                  <span className="block text-xs text-muted-foreground">{date(n.publishAt)}</span>
                </span>
                <CategoryBadge category={n.category} className="hidden sm:inline-flex" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <NoticeReader notice={open} onClose={() => setOpen(null)} />
    </Panel>
  );
}
