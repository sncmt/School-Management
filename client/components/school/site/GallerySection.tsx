import { getTranslations } from "next-intl/server";
import type { SchoolSite } from "@/lib/site";
import { GalleryGrid } from "./GalleryGrid";
import { SectionHeading } from "./SectionHeading";

/** The homepage's gallery: the school's pictures, each opening full size. */
export async function GallerySection({ photos }: { photos: SchoolSite["gallery"] }) {
  const t = await getTranslations("schoolHome.gallery");
  return (
    <section id="gallery" className="scroll-mt-20 border-y bg-card">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <SectionHeading eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
        <GalleryGrid photos={photos} />
      </div>
    </section>
  );
}
