"use client";

import { ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { cn } from "@/lib/utils";

// the server refuses bigger uploads; checked here first so nobody waits for a refusal
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";

type Props = {
  // the current image's (signed) link, or null
  imageUrl: string | null;
  // uploads the file; call onProgress with 0..100 while it goes
  onUpload: (file: File, onProgress: (percent: number) => void) => Promise<unknown>;
  onRemove?: () => Promise<unknown>;
  // shown after a successful upload / removal
  messages?: { saved?: string; removed?: string };
  shape?: "square" | "circle";
  // preview size in px
  size?: number;
  // contain: logos keep their shape; cover: photos fill the frame
  fit?: "contain" | "cover";
  disabled?: boolean;
  alt?: string;
};

/** A preview with Upload/Change and Remove. The server resizes whatever is uploaded. */
export function ImageUpload({
  imageUrl,
  onUpload,
  onRemove,
  messages,
  shape = "square",
  size = 96,
  fit = "contain",
  disabled,
  alt = "",
}: Props) {
  const t = useTranslations("common");
  const describeError = useErrorMessage();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [removing, setRemoving] = useState(false);
  const busy = progress !== null || removing;

  const choose = async (file: File | undefined) => {
    if (input.current) input.current.value = ""; // the same file can be chosen again
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error(t("imageWrongType"));
    if (file.size > MAX_BYTES) return toast.error(t("imageTooLarge"));

    setProgress(0);
    try {
      await onUpload(file, setProgress);
      if (messages?.saved) toast.success(messages.saved);
    } catch (error) {
      toast.error(describeError(error));
    } finally {
      setProgress(null);
    }
  };

  const remove = async () => {
    if (!onRemove) return;
    setRemoving(true);
    try {
      await onRemove();
      if (messages?.removed) toast.success(messages.removed);
    } catch (error) {
      toast.error(describeError(error));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden border bg-muted/50",
          shape === "circle" ? "rounded-full" : "rounded-md",
        )}
        style={{ width: size, height: size }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed links to private storage
          <img src={imageUrl} alt={alt} className={cn("size-full", fit === "cover" ? "object-cover" : "object-contain p-1")} />
        ) : (
          <ImageIcon className="size-1/3 text-muted-foreground" aria-label={t("noImage")} />
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="size-5 animate-spin" />
          </div>
        )}
      </div>

      {!disabled && (
        <div className="flex flex-col items-start gap-2">
          <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={(e) => choose(e.target.files?.[0])} />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()} disabled={busy}>
              <Upload /> {imageUrl ? t("change") : t("upload")}
            </Button>
            {imageUrl && onRemove && (
              <Button type="button" variant="ghost" size="sm" onClick={remove} disabled={busy}>
                <Trash2 /> {t("remove")}
              </Button>
            )}
          </div>
          {progress !== null && <span className="text-xs text-muted-foreground">{t("uploading", { percent: progress })}</span>}
        </div>
      )}
    </div>
  );
}
