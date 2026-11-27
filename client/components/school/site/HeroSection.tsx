import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Fragment } from "react";
import { publicSchoolRoutes } from "@/lib/auth/routes";
import { hasAbout, type SchoolSite } from "@/lib/site";
import { cn } from "@/lib/utils";
import { HeroStage } from "./HeroStage";
import { siteFocus, splitName } from "./siteStyles";

/*
 * The top of the homepage, as in the reference: its photos as a row of framed cards at the right
 * (HeroStage), and at their left its own short line (set in its settings) after a gold line, its
 * name over two lines, its tagline (or the default one), and two pill buttons: "Admission open 2027"
 * (only once the school has set the year it is open for), which opens the application form, and
 * "Explore our school", which goes to its about section (or its notices). Without slides the about
 * photo or the first gallery photos stand in.
 */
export async function HeroSection({ school, name }: { school: SchoolSite; name: string }) {
  const t = await getTranslations("schoolHome.hero");
  // the school's line in its parts: a dot, bullet, middle dot or bar between spaces separates them
  // ("Learning . Discipline . Career"), so "St. Mary" stays whole
  const heroLine = school.about.heroLine
    .trim()
    .split(/\s+[.•·|]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const openYear = school.admission.openYear.trim();
  const explore = hasAbout(school.about) ? "#about" : "#notices";
  const [first, second] = splitName(name);

  // the slides, else the about photo, else up to three gallery photos
  const slides =
    school.slides.length > 0
      ? school.slides
      : school.about.image
        ? [{ id: "about", image: school.about.image, caption: null }]
        : school.gallery.slice(0, 3);

  return (
    <HeroStage slides={slides} name={name}>
      {heroLine.length > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <span aria-hidden className="inline-block h-0.5 w-12 shrink-0 bg-site-gold lg:w-[46px]" />
          <span className="text-[11px] font-bold tracking-[0.2em] text-brand-ink uppercase sm:text-[12px] [html[lang=bn]_&]:text-[11px] [html[lang=bn]_&]:tracking-normal">
            {heroLine.map((part, i) => (
              <Fragment key={i}>
                {/* between the parts, a heavy dot set as text, with a plain space either side */}
                {i > 0 && (
                  <>
                    {" "}
                    <span aria-hidden className="font-black">
                      •
                    </span>{" "}
                  </>
                )}
                {part}
              </Fragment>
            ))}
          </span>
        </div>
      )}

      <h1 className="text-[32px] leading-[1.2] font-extrabold text-brand-ink sm:text-[42px] sm:leading-[1.2] lg:text-[42px] lg:leading-[0.9]">
        {first}
        {second && (
          <>
            <br />
            {second}
          </>
        )}
      </h1>

      <p className="mt-4 text-base font-medium text-slate-700 sm:text-lg lg:mt-5 lg:text-[18px]">{school.about.tagline || t("tagline")}</p>

      <div className="mt-7 flex flex-wrap items-center gap-4 sm:gap-6 lg:mt-[34px]">
        {openYear && (
          <Link
            href={publicSchoolRoutes.apply}
            className={cn(
              "inline-flex h-11 items-center gap-2.5 rounded-full bg-brand-ink px-6 text-sm font-semibold lg:h-12 lg:px-[30px] lg:text-[14px] text-white shadow-[0_6px_16px_-6px_rgb(10_74_99/0.55)] transition hover:opacity-90",
              siteFocus,
            )}
          >
            <span>{t("admissionOpen", { year: openYear })}</span>
            <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        )}
        <a
          href={explore}
          className={cn(
            "inline-flex h-11 items-center justify-center rounded-full border border-brand-ink/40 bg-white px-6 text-sm font-semibold lg:h-12 lg:px-[30px] lg:text-[14px] text-brand-ink transition hover:border-brand-ink",
            siteFocus,
          )}
        >
          {t("explore")}
        </a>
      </div>
    </HeroStage>
  );
}
