import { getTranslations } from "next-intl/server";
import type { About } from "@/lib/site";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./SectionHeading";

/*
 * The homepage's about section, as the school wrote it in its settings: its picture on a tilted
 * block of its colour, its words (a blank line starts a paragraph) and its facts as tiles. Without
 * a picture the words take the whole width.
 */
export async function AboutSection({ about, name }: { about: About; name: string }) {
  const t = await getTranslations("schoolHome.about");
  const paragraphs = about.body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const withPicture = !!about.image;

  return (
    <section id="about" className="relative isolate scroll-mt-20 overflow-hidden border-y bg-card">
      <div aria-hidden className="absolute -top-24 -right-24 -z-10 size-80 rounded-full bg-sidebar-primary/10 blur-3xl" />
      <div className={cn("mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:py-24", withPicture && "lg:grid-cols-2 lg:gap-16")}>
        {withPicture && (
          <div className="relative mx-auto w-full max-w-xl">
            <div aria-hidden className="absolute -inset-2 -rotate-2 rounded-3xl bg-school-sidebar sm:-inset-3" />
            <div aria-hidden className="site-dots absolute -bottom-8 -left-6 size-28 text-sidebar-primary/70" />
            {/* eslint-disable-next-line @next/next/no-img-element -- signed links to private storage */}
            <img
              src={about.image!}
              alt=""
              loading="lazy"
              className="relative aspect-[4/3] w-full rounded-2xl object-cover shadow-[0_24px_60px_-20px_rgb(0_0_0/0.45)]"
            />
          </div>
        )}

        <div className={cn(!withPicture && "mx-auto max-w-3xl")}>
          <SectionHeading eyebrow={t("eyebrow")} title={t("title", { name })} align={withPicture ? "left" : "center"} />
          {paragraphs.length > 0 && (
            <div className={cn("space-y-4 text-base leading-relaxed text-muted-foreground sm:text-lg", !withPicture && "text-center")}>
              {paragraphs.map((p, i) => (
                <p key={i} className="whitespace-pre-line">
                  {p}
                </p>
              ))}
            </div>
          )}

          {about.facts.length > 0 && (
            <dl className={cn("mt-10 grid grid-cols-2 gap-4", about.facts.length > 2 && !withPicture && "sm:grid-cols-4")}>
              {about.facts.map((fact, i) => (
                <div key={i} className="relative flex flex-col-reverse overflow-hidden rounded-2xl border border-border/70 bg-background p-5">
                  <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-sidebar-primary" />
                  <dt className="mt-1 text-sm text-muted-foreground">{fact.label}</dt>
                  <dd className="text-2xl font-bold tracking-tight text-school-sidebar sm:text-3xl dark:text-foreground">{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </section>
  );
}
