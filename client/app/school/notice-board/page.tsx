import { Megaphone, Paperclip, Pin } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { CategoryBadge } from "@/components/school/notices/shared";
import { publicSchoolRoutes } from "@/lib/auth/routes";
import { pickName } from "@/lib/i18n/names";
import { getPublicNotices } from "@/lib/publicNotices";
import { NOTICE_CATEGORIES, type NoticeCategory } from "@/lib/school/noticeKinds";
import { getCurrentSchoolSite } from "@/lib/site.server";
import { cn } from "@/lib/utils";

type SearchParams = Promise<{ page?: string; category?: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale, school] = await Promise.all([getTranslations("publicNotices"), getLocale(), getCurrentSchoolSite()]);
  const name = school ? pickName(school, locale) : "";
  return { title: { absolute: t("pageTitle", { school: name }) }, description: t("pageDescription", { school: name }) };
}

const readQuery = async (searchParams: SearchParams) => {
  const { page, category } = await searchParams;
  const pageNo = Math.max(1, Math.min(1000, Number.parseInt(page ?? "1", 10) || 1));
  const kind = NOTICE_CATEGORIES.includes(category as NoticeCategory) ? (category as NoticeCategory) : undefined;
  return { page: pageNo, category: kind };
};

const href = (query: { page?: number; category?: NoticeCategory }) => {
  const params = new URLSearchParams();
  if (query.category) params.set("category", query.category);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  const qs = params.toString();
  return qs ? `${publicSchoolRoutes.noticeBoard}?${qs}` : publicSchoolRoutes.noticeBoard;
};

/** The school's public notice board: notices marked public that are up now, newest first. */
export default async function PublicNoticeBoardPage({ searchParams }: { searchParams: SearchParams }) {
  const query = await readQuery(searchParams);
  const [t, tCategory, format, school] = await Promise.all([
    getTranslations("publicNotices"),
    getTranslations("school.notices.categories"),
    getFormatter(),
    getCurrentSchoolSite(),
  ]);
  const data = school ? await getPublicNotices(school.subdomain, query) : null;
  const items = data?.items ?? [];
  const totalPages = data?.meta.totalPages ?? 0;

  const day = (iso: string, opts: { day?: "numeric"; month?: "short"; year?: "numeric" }) => format.dateTime(new Date(iso), { ...opts, timeZone: "Asia/Dhaka" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label={t("filter")}>
        {[undefined, ...NOTICE_CATEGORIES].map((c) => (
          <Link
            key={c ?? "all"}
            href={href({ category: c })}
            aria-current={query.category === c ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              query.category === c ? "border-foreground bg-foreground text-background" : "bg-card hover:bg-muted",
            )}
          >
            {c ? tCategory(c) : t("all")}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
          <Megaphone className="size-8 text-muted-foreground/50" />
          {query.category ? t("emptyCategory") : t("empty")}
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
          {items.map((n) => (
            <li key={n.id}>
              <Link href={`${publicSchoolRoutes.noticeBoard}/${n.id}`} className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50 sm:px-5">
                <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-brand-soft py-2 text-center">
                  <span className="text-xl leading-none font-semibold tabular-nums">{day(n.publishAt, { day: "numeric" })}</span>
                  <span className="mt-0.5 text-[11px] text-muted-foreground uppercase">{day(n.publishAt, { month: "short" })}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{day(n.publishAt, { year: "numeric" })}</span>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <h2 className="leading-snug font-medium">{n.title}</h2>
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
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-between gap-3 text-sm" aria-label={t("pages")}>
          {query.page > 1 ? (
            <Link href={href({ ...query, page: query.page - 1 })} className="rounded-md border bg-card px-3 py-1.5 hover:bg-muted">
              {t("newer")}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">{t("page", { page: format.number(query.page), total: format.number(totalPages) })}</span>
          {query.page < totalPages ? (
            <Link href={href({ ...query, page: query.page + 1 })} className="rounded-md border bg-card px-3 py-1.5 hover:bg-muted">
              {t("older")}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
