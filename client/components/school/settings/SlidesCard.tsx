"use client";

import { ArrowDown, ArrowUp, ImagePlus, Images, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  MAX_SLIDES,
  useAddSlide,
  useRemoveSlide,
  useReorderSlides,
  useSlides,
  useUpdateSlide,
  type Slide,
} from "@/lib/school/settings";

/** The pictures of the public homepage's image slider: add, caption, reorder, remove. */
export function SlidesCard() {
  const t = useTranslations("school.settings.slides");
  const describeError = useErrorMessage();
  const slides = useSlides();
  const add = useAddSlide();
  const reorder = useReorderSlides();
  const [removing, setRemoving] = useState<Slide | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const items = slides.data ?? [];
  const full = items.length >= MAX_SLIDES;

  const upload = (file: File | undefined) => {
    if (!file) return;
    add.mutate(
      { file, caption: "" },
      { onSuccess: () => toast.success(t("added")), onError: (e) => toast.error(describeError(e)) },
    );
  };

  // swap a picture with its neighbour
  const move = (from: number, to: number) => {
    const ids = items.map((s) => s.id);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    reorder.mutate(ids, { onError: (e) => toast.error(describeError(e)) });
  };

  return (
    <section className="rounded-2xl border border-border/70 bg-card">
      <header className="flex flex-wrap items-center gap-3 border-b px-5 py-4">
        <span className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Images className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{t("hint", { max: MAX_SLIDES })}</p>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Button onClick={() => fileInput.current?.click()} disabled={full || add.isPending || slides.isPending}>
          <ImagePlus /> {add.isPending ? t("uploading") : t("add")}
        </Button>
      </header>

      <div className="p-5">
        {slides.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : slides.isError ? (
          <p className="text-sm text-muted-foreground">{describeError(slides.error)}</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
            <Images className="size-6" />
            <p>{t("empty")}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((slide, i) => (
              <SlideRow
                key={slide.id}
                slide={slide}
                number={i + 1}
                onUp={i > 0 ? () => move(i, i - 1) : undefined}
                onDown={i < items.length - 1 ? () => move(i, i + 1) : undefined}
                onRemove={() => setRemoving(slide)}
                busy={reorder.isPending}
              />
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted-foreground">{full ? t("full", { max: MAX_SLIDES }) : t("note")}</p>
      </div>

      <RemoveSlideDialog slide={removing} onClose={() => setRemoving(null)} />
    </section>
  );
}

function SlideRow({
  slide,
  number,
  onUp,
  onDown,
  onRemove,
  busy,
}: {
  slide: Slide;
  number: number;
  onUp?: () => void;
  onDown?: () => void;
  onRemove: () => void;
  busy: boolean;
}) {
  const t = useTranslations("school.settings.slides");
  const describeError = useErrorMessage();
  const update = useUpdateSlide();
  const [caption, setCaption] = useState(slide.caption ?? "");
  const changed = caption.trim() !== (slide.caption ?? "");

  const save = () =>
    update.mutate(
      { id: slide.id, caption: caption.trim() || null },
      { onSuccess: () => toast.success(t("saved")), onError: (e) => toast.error(describeError(e)) },
    );

  return (
    <li className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-md bg-muted sm:w-36">
        {slide.image && (
          // eslint-disable-next-line @next/next/no-img-element -- signed links to private storage
          <img src={slide.image} alt="" className="size-full object-cover" />
        )}
        <span className="absolute top-1.5 left-1.5 rounded bg-black/60 px-1.5 text-xs font-semibold text-white tabular-nums">{number}</span>
      </div>
      <form
        className="flex min-w-0 flex-1 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (changed) save();
        }}
      >
        <Input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder={t("captionPlaceholder")}
          aria-label={t("caption", { number })}
          maxLength={120}
        />
        {changed && (
          <Button type="submit" variant="outline" disabled={update.isPending}>
            {t("save")}
          </Button>
        )}
      </form>
      <div className="flex shrink-0 gap-1 self-end sm:self-auto">
        <Button variant="ghost" size="icon" onClick={onUp} disabled={!onUp || busy} aria-label={t("moveUp")}>
          <ArrowUp />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDown} disabled={!onDown || busy} aria-label={t("moveDown")}>
          <ArrowDown />
        </Button>
        <Button variant="ghost" size="icon" onClick={onRemove} aria-label={t("remove")} className="text-destructive hover:text-destructive">
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}

function RemoveSlideDialog({ slide, onClose }: { slide: Slide | null; onClose: () => void }) {
  const t = useTranslations("school.settings.slides");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const remove = useRemoveSlide();

  const confirm = () =>
    slide &&
    remove.mutate(slide.id, {
      onSuccess: () => {
        toast.success(t("removed"));
        onClose();
      },
      onError: (e) => toast.error(describeError(e)),
    });

  return (
    <AlertDialog open={!!slide} onOpenChange={(open) => !open && !remove.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("removeTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{t("removeDescription")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={remove.isPending}>{tCommon("cancel")}</AlertDialogCancel>
          <Button variant="destructive" onClick={confirm} disabled={remove.isPending}>
            {remove.isPending ? t("removing") : t("remove")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
