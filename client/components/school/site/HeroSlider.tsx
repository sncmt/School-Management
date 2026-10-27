"use client";

import { ChevronLeft, ChevronRight, School } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SchoolSite } from "@/lib/site";
import { cn } from "@/lib/utils";

const INTERVAL_MS = 6000;
// a swipe shorter than this is a tap
const SWIPE_PX = 40;

/*
 * The hero's picture frame: the school's pictures one after another, fading, with a bar per
 * picture that fills while it shows, arrows and swipes. It moves on by itself unless the visitor
 * points at it, focuses it or asks for less motion. Without pictures, the school's logo on its
 * colour fills the frame (also when none of them loads).
 */
export function HeroSlider({ slides: all, name, logo }: { slides: SchoolSite["slides"]; name: string; logo: string | null }) {
  const t = useTranslations("schoolHome.slider");
  const [index, setIndex] = useState(0);
  // pictures whose link didn't load are left out, rather than showing an empty frame
  const [failed, setFailed] = useState<string[]>([]);
  const slides = all.filter((slide) => !failed.includes(slide.id));
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStart = useRef<number | null>(null);
  const count = slides.length;

  const go = useCallback((to: number) => setIndex(((to % count) + count) % count), [count]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // the filling bar's end moves on to the next picture, so pausing the bar (hover, focus) holds the turn;
  // with one picture, or less motion asked for, nothing moves by itself
  const still = count < 2 || reducedMotion;

  const frame = "relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-school-sidebar shadow-[0_24px_60px_-20px_rgb(0_0_0/0.45)] ring-1 ring-black/5";

  if (count === 0) {
    return (
      <div className={cn(frame, "dark flex items-center justify-center text-white")}>
        <div aria-hidden className="site-dots absolute inset-0 text-white/10" />
        <div aria-hidden className="absolute -top-16 -right-16 size-64 rounded-full bg-sidebar-primary/25 blur-3xl" />
        <div aria-hidden className="absolute -bottom-20 -left-10 size-72 rounded-full bg-white/10 blur-3xl" />
        <span className="relative flex size-32 items-center justify-center overflow-hidden rounded-2xl bg-white text-school-sidebar shadow-2xl ring-8 ring-white/10 sm:size-40">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- school logos can be on any host
            <img src={logo} alt={name} className="size-28 object-contain sm:size-36" />
          ) : (
            <School className="size-16" />
          )}
        </span>
      </div>
    );
  }

  return (
    <div
      className={frame}
      role="region"
      aria-roledescription="carousel"
      aria-label={t("label", { name })}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => (touchStart.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStart.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStart.current;
        touchStart.current = null;
        if (Math.abs(dx) > SWIPE_PX) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          role="group"
          aria-roledescription="slide"
          aria-label={t("slideOf", { current: i + 1, total: count })}
          aria-hidden={i !== index}
          className={cn(
            "absolute inset-0 transition-[opacity,transform] duration-1000 ease-out motion-reduce:transition-none",
            i === index ? "scale-100 opacity-100" : "scale-105 opacity-0",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- signed links to private storage */}
          <img
            src={slide.image}
            alt={slide.caption ?? ""}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "auto"}
            onError={() => {
              setFailed((ids) => [...ids, slide.id]);
              setIndex(0);
            }}
            className="size-full object-cover"
          />
        </div>
      ))}

      {/* shade under the caption and controls, so white reads on any picture */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 space-y-3 p-4 sm:p-6">
        {slides[index].caption && (
          <p key={slides[index].id} className="max-w-md animate-in fade-in slide-in-from-bottom-2 text-lg font-semibold text-balance text-white drop-shadow duration-700 sm:text-2xl">
            {slides[index].caption}
          </p>
        )}
        {count > 1 && (
          <div className="flex items-center gap-3">
            {/* one bar per picture: past ones full, the current one filling */}
            <div className="flex flex-1 gap-1.5">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={t("goTo", { number: i + 1 })}
                  aria-current={i === index}
                  className="group/bar relative h-6 flex-1 cursor-pointer"
                >
                  <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-white/30 group-hover/bar:bg-white/45">
                    {i < index && <span className="absolute inset-0 bg-white" />}
                    {i === index &&
                      (still ? (
                        <span className="absolute inset-0 bg-white" />
                      ) : (
                        <span
                          key={index}
                          className="slide-progress absolute inset-0 bg-white"
                          data-paused={paused}
                          style={{ "--slide-duration": `${INTERVAL_MS}ms` } as React.CSSProperties}
                          onAnimationEnd={() => go(index + 1)}
                        />
                      ))}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <SlideArrow side="left" label={t("previous")} onClick={() => go(index - 1)} />
              <SlideArrow side="right" label={t("next")} onClick={() => go(index + 1)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SlideArrow({ side, label, onClick }: { side: "left" | "right"; label: string; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/25"
    >
      <Icon className="size-4.5" />
    </button>
  );
}
