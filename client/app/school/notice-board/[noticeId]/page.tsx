import { ArrowLeft, Pin } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { NoticeText, noticeSnippet } from "@/components/school/notices/NoticeText";
import { AttachmentList, CategoryBadge } from "@/components/school/notices/shared";
import { publicSchoolRoutes } from "@/lib/auth/routes";
import { pickName } from "@/lib/i18n/names";
import { getPublicNotice } from "@/lib/publicNotices";
import { getCurrentSchoolSite } from "@/lib/site.server";

type Params = Promise<{ noticeId: string }>;

// one load for the page and its metadata
const load = cache(async (noticeId: string) => {
  const school = await getCurrentSchoolSite();
  if (!school || noticeId.length > 64) return null;
  const notice = await getPublicNotice(school.subdomain, noticeId);
  return notice ? { school, notice } : null;
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const found = await load((await params).noticeId);
  if (!found) return {};
  const locale = await getLocale();
  const description = noticeSnippet(found.notice.body, 160);
  return {
    title: { absolute: `${found.notice.title} · ${pickName(found.school, locale)}` },
    description,
    openGraph: { title: found.notice.title, description, type: "article" },
  };
}

/** One public notice in full, with its files. */
export default async function PublicNoticePage({ params }: { params: Params }) {
  const found = await load((await params).noticeId);
  // not public, not up now, or no such notice
  if (!found) notFound();
  const { notice } = found;
  const [t, format] = await Promise.all([getTranslations("publicNotices"), getFormatter()]);
  const when = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "long", timeZone: "Asia/Dhaka" });

  return (
    <div className="space-y-5">
      <Link href={publicSchoolRoutes.noticeBoard} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>

      <article className="space-y-5 rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] sm:p-8">
        <header className="space-y-3 border-b pb-5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <CategoryBadge category={notice.category} />
            {notice.pinned && (
              <span className="inline-flex items-center gap-1">
                <Pin className="size-3.5" /> {t("pinned")}
              </span>
            )}
          </div>
          <h1 className="text-2xl leading-snug font-semibold tracking-tight">{notice.title}</h1>
          <p className="text-sm text-muted-foreground">
            <time dateTime={notice.publishAt}>{t("posted", { date: when(notice.publishAt) })}</time>
            {notice.expiresAt && ` · ${t("until", { date: when(notice.expiresAt) })}`}
          </p>
        </header>
        <NoticeText body={notice.body} className="text-[15px]" />
        <AttachmentList attachments={notice.attachments} />
      </article>
    </div>
  );
}
