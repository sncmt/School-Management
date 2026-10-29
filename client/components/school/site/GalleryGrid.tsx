"use client";

import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { SchoolSite } from "@/lib/site";

// a swipe shorter than this is a tap
const SWIPE_PX = 40;

/*
 * The gallery's pictures as a masonry wall (each keeps its own shape); a picture opens full size
 * in a dark viewer with its caption, arrows, swipes and the arrow keys.
 */
export function GalleryGrid({ photos }: { photos: SchoolSite["gallery"] }) {
  const t = useTranslations("schoolHome.gallery");
  const [open, setOpen] = useState<number | null>(null);
  const touchStart = useRef<number | null>(null);
  const count = photos.length;
  const go = (step: number) => setOpen((i) => (i === null ? i : (i + step + count) % count));

  // the arrow keys move through the pictures while one is open
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- go only reads the count
  }, [open === null, count]);

  const current = open === null ? null : photos[open];

  return (
    <>
      <ul className="columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
        {photos.map((photo, i) => (
          <li key={photo.id} className="mb-3 break-inside-avoid sm:mb-4">
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={photo.caption ? t("openNamed", { caption: photo.caption }) : t("open", { number: i + 1 })}
              className="group relative block w-full overflow-hidden rounded-xl bg-muted text-left focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- signed links to private storage */}
              <img src={photo.image} alt={photo.caption ?? ""} loading="lazy" className="w-full transition-transform duration-500 group-hover:scale-105" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <span className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-white/90 text-slate-900 opacity-0 shadow transition-opacity duration-300 group-hover:opacity-100">
                <Maximize2 className="size-4" />
              </span>
              {photo.caption && (
                <span className="absolute inset-x-0 bottom-0 translate-y-2 p-3 text-sm font-medium text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                  {photo.caption}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[100dvh] max-w-[100vw] gap-0 border-0 bg-transparent p-0 shadow-none sm:max-w-[min(1100px,95vw)]"
          onTouchStart={(e) => (touchStart.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchStart.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStart.current;
            touchStart.current = null;
            if (Math.abs(dx) > SWIPE_PX) go(dx < 0 ? 1 : -1);
          }}
        >
          {current && (
            <figure className="relative flex flex-col items-center">
              <DialogTitle className="sr-only">{current.caption ?? t("open", { number: open! + 1 })}</DialogTitle>
              <DialogDescription className="sr-only">{t("counter", { current: open! + 1, total: count })}</DialogDescription>
              {/* eslint-disable-next-line @next/next/no-img-element -- signed links to private storage */}
              <img
                key={current.id}
                src={current.image}
                alt={current.caption ?? ""}
                className="animate-in fade-in max-h-[80dvh] w-auto max-w-full rounded-lg object-contain shadow-2xl duration-300"
              />
              <figcaption className="mt-4 flex w-full items-center justify-between gap-4 px-2 text-sm text-white">
                <span className="min-w-0 truncate">{current.caption}</span>
                <span className="shrink-0 text-white/70 tabular-nums">{t("counter", { current: open! + 1, total: count })}</span>
              </figcaption>

              {count > 1 && (
                <>
                  <ViewerButton label={t("previous")} onClick={() => go(-1)} className="top-1/2 left-2 -translate-y-1/2 sm:-left-14">
                    <ChevronLeft className="size-5" />
                  </ViewerButton>
                  <ViewerButton label={t("next")} onClick={() => go(1)} className="top-1/2 right-2 -translate-y-1/2 sm:-right-14">
                    <ChevronRight className="size-5" />
                  </ViewerButton>
                </>
              )}
              <ViewerButton label={t("close")} onClick={() => setOpen(null)} className="-top-2 right-2 sm:-top-12 sm:right-0">
                <X className="size-5" />
              </ViewerButton>
            </figure>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ViewerButton({ label, onClick, className, children }: { label: string; onClick: () => void; className: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute flex size-10 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-white hover:text-slate-900 ${className}`}
    >
      {children}
    </button>
  );
}
