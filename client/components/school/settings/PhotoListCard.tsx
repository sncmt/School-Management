"use client";

import { ArrowDown, ArrowUp, ImagePlus, Images, Trash2, type LucideIcon } from "lucide-react";
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
  MAX_PHOTOS,
  useAddPhoto,
  usePhotos,
  useRemovePhoto,
  useReorderPhotos,
  useUpdatePhoto,
  type ListPhoto,
  type PhotoList,
} from "@/lib/school/settings";
import { cn } from "@/lib/utils";

// the two lists share their wording's keys
const useListTranslations = (list: PhotoList) => useTranslations(list === "slides" ? "school.settings.slides" : "school.settings.gallery");

/**
 * One of the public homepage's picture lists, the image slider or the gallery: add, caption,
 * reorder, remove.
 */
export function PhotoListCard({ list, icon: Icon = Images }: { list: PhotoList; icon?: LucideIcon }) {
  const t = useListTranslations(list);
  const describeError = useErrorMessage();
  const photos = usePhotos(list);
  const add = useAddPhoto(list);
  const reorder = useReorderPhotos(list);
  const [removing, setRemoving] = useState<ListPhoto | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const items = photos.data ?? [];
  const max = MAX_PHOTOS[list];
  const full = items.length >= max;

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
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{t("hint", { max })}</p>
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
        <Button onClick={() => fileInput.current?.click()} disabled={full || add.isPending || photos.isPending}>
          <ImagePlus /> {add.isPending ? t("uploading") : t("add")}
        </Button>
      </header>

      <div className="p-5">
        {photos.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : photos.isError ? (
          <p className="text-sm text-muted-foreground">{describeError(photos.error)}</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
            <Images className="size-6" />
            <p>{t("empty")}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((photo, i) => (
              <PhotoRow
                key={photo.id}
                list={list}
                photo={photo}
                number={i + 1}
                onUp={i > 0 ? () => move(i, i - 1) : undefined}
                onDown={i < items.length - 1 ? () => move(i, i + 1) : undefined}
                onRemove={() => setRemoving(photo)}
                busy={reorder.isPending}
              />
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted-foreground">{full ? t("full", { max }) : t("note")}</p>
      </div>

      <RemovePhotoDialog list={list} photo={removing} onClose={() => setRemoving(null)} />
    </section>
  );
}

function PhotoRow({
  list,
  photo,
  number,
  onUp,
  onDown,
  onRemove,
  busy,
}: {
  list: PhotoList;
  photo: ListPhoto;
  number: number;
  onUp?: () => void;
  onDown?: () => void;
  onRemove: () => void;
  busy: boolean;
}) {
  const t = useListTranslations(list);
  const describeError = useErrorMessage();
  const update = useUpdatePhoto(list);
  const [caption, setCaption] = useState(photo.caption ?? "");
  const changed = caption.trim() !== (photo.caption ?? "");

  const save = () =>
    update.mutate(
      { id: photo.id, caption: caption.trim() || null },
      { onSuccess: () => toast.success(t("saved")), onError: (e) => toast.error(describeError(e)) },
    );

  return (
    <li className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center">
      <div className={cn("relative w-full shrink-0 overflow-hidden rounded-md bg-muted", list === "slides" ? "aspect-[4/3] sm:w-36" : "aspect-square sm:w-28")}>
        {photo.image && (
          // eslint-disable-next-line @next/next/no-img-element -- signed links to private storage
          <img src={photo.image} alt="" className="size-full object-cover" />
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

function RemovePhotoDialog({ list, photo, onClose }: { list: PhotoList; photo: ListPhoto | null; onClose: () => void }) {
  const t = useListTranslations(list);
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const remove = useRemovePhoto(list);

  const confirm = () =>
    photo &&
    remove.mutate(photo.id, {
      onSuccess: () => {
        toast.success(t("removed"));
        onClose();
      },
      onError: (e) => toast.error(describeError(e)),
    });

  return (
    <AlertDialog open={!!photo} onOpenChange={(open) => !open && !remove.isPending && onClose()}>
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
