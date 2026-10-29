"use client";

import { ImagePlus, Info, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { MAX_ABOUT_FACTS, useAbout, useRemoveAboutImage, useSaveAbout, useUploadAboutImage } from "@/lib/school/settings";
import type { About } from "@/lib/site";
import { ListEditor } from "./AdmissionCard";

const MAX_BODY = 3000;

/** The public homepage's about section: the school's own words, a picture and up to four facts. */
export function AboutCard() {
  const t = useTranslations("school.settings.about");
  const describeError = useErrorMessage();
  const about = useAbout();

  return (
    <section className="rounded-2xl border border-border/70 bg-card">
      <header className="flex items-center gap-3 border-b px-5 py-4">
        <span className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Info className="size-4" />
        </span>
        <div>
          <h2 className="font-semibold">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
        </div>
      </header>
      <div className="space-y-7 p-5">
        {about.isPending ? (
          <Skeleton className="h-64 w-full" />
        ) : about.isError ? (
          <p className="text-sm text-muted-foreground">{describeError(about.error)}</p>
        ) : (
          <>
            <AboutPicture image={about.data.image} />
            {/* keyed by the saved words, so a save (or another tab's) starts the form afresh */}
            <AboutForm key={JSON.stringify([about.data.body, about.data.facts])} saved={about.data} />
          </>
        )}
      </div>
    </section>
  );
}

function AboutPicture({ image }: { image: string | null }) {
  const t = useTranslations("school.settings.about");
  const describeError = useErrorMessage();
  const upload = useUploadAboutImage();
  const remove = useRemoveAboutImage();
  const fileInput = useRef<HTMLInputElement>(null);
  const busy = upload.isPending || remove.isPending;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex aspect-[4/3] w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted sm:w-48">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed links to private storage
          <img src={image} alt="" className="size-full object-cover" />
        ) : (
          <ImagePlus className="size-6 text-muted-foreground/60" />
        )}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold">{t("picture")}</p>
        <p className="text-xs text-muted-foreground">{t("pictureHint")}</p>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) upload.mutate(file, { onSuccess: () => toast.success(t("pictureSaved")), onError: (err) => toast.error(describeError(err)) });
          }}
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={busy}>
            <ImagePlus /> {upload.isPending ? t("uploading") : image ? t("changePicture") : t("addPicture")}
          </Button>
          {image && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => remove.mutate(undefined, { onSuccess: () => toast.success(t("pictureRemoved")), onError: (err) => toast.error(describeError(err)) })}
              disabled={busy}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 /> {t("removePicture")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function AboutForm({ saved }: { saved: About }) {
  const t = useTranslations("school.settings.about");
  const describeError = useErrorMessage();
  const save = useSaveAbout();
  const [body, setBody] = useState(saved.body);
  const [facts, setFacts] = useState(saved.facts);
  const changed = body !== saved.body || JSON.stringify(facts) !== JSON.stringify(saved.facts);

  const submit = () =>
    save.mutate(
      // rows left wholly blank are dropped; half-filled ones go to the server, which names the problem
      { body, facts: facts.filter((f) => f.label.trim() || f.value.trim()) },
      { onSuccess: () => toast.success(t("saved")), onError: (e) => toast.error(describeError(e)) },
    );

  return (
    <div className="space-y-7">
      <div className="space-y-2">
        <Label htmlFor="about-body">{t("body")}</Label>
        <Textarea id="about-body" value={body} onChange={(e) => setBody(e.target.value)} rows={7} maxLength={MAX_BODY} placeholder={t("bodyPlaceholder")} />
        <p className="text-right text-xs text-muted-foreground tabular-nums">
          {body.length} / {MAX_BODY}
        </p>
      </div>

      <ListEditor
        title={t("facts")}
        addLabel={t("addFact")}
        rows={facts}
        onChange={setFacts}
        blank={{ label: "", value: "" }}
        max={MAX_ABOUT_FACTS}
        render={(row, update) => (
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <Input value={row.label} onChange={(e) => update({ ...row, label: e.target.value })} placeholder={t("factLabelPlaceholder")} maxLength={40} />
            <Input value={row.value} onChange={(e) => update({ ...row, value: e.target.value })} placeholder={t("factValuePlaceholder")} maxLength={40} />
          </div>
        )}
      />

      <p className="text-xs text-muted-foreground">{t("note")}</p>
      <div className="flex justify-end gap-2">
        {changed && (
          <Button
            variant="ghost"
            onClick={() => {
              setBody(saved.body);
              setFacts(saved.facts);
            }}
            disabled={save.isPending}
          >
            {t("undo")}
          </Button>
        )}
        <Button onClick={submit} disabled={!changed || save.isPending}>
          {save.isPending ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}
