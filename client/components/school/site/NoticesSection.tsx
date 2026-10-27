import { getTranslations } from "next-intl/server";
import { getPublicNotices } from "@/lib/publicNotices";
import { NoticeBoard } from "./NoticeBoard";
import { SectionHeading } from "./SectionHeading";

/** The homepage's notices section: the public notices, newest first, each opening in full on the page. */
export async function NoticesSection({ subdomain }: { subdomain: string }) {
  const [t, first] = await Promise.all([getTranslations("schoolHome.notices"), getPublicNotices(subdomain)]);

  return (
    <section id="notices" className="mx-auto max-w-4xl scroll-mt-20 px-4 py-16 sm:py-20">
      <SectionHeading eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
      <NoticeBoard subdomain={subdomain} first={first} />
    </section>
  );
}
