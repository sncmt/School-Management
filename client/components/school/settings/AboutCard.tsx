"use client";

import { ImagePlus, Info, Trash2, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import {
  useAbout,
  useRemoveAboutImage,
  useRemovePrincipalPhoto,
  useSaveAbout,
  useUploadAboutImage,
  useUploadPrincipalPhoto,
} from "@/lib/school/settings";
import { SOCIAL_KEYS, type About, type SocialKey } from "@/lib/site";

const MAX_BODY = 3000;
// the same limits as the server
const MAX_HERO_LINE = 80;
const MAX_TAGLINE = 160;
const MAX_FOOTER_NOTE = 300;
const MAX_MESSAGE = 1200;
const MAX_PRINCIPAL_NAME = 80;
const MAX_PRINCIPAL_TITLE = 60;
const MAX_SOCIAL_URL = 300;

/** The public homepage's about section: the school's own words, a picture and its principal's message (the figures under it are counted by the app). */
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
            <AboutForm
              key={JSON.stringify([
                about.data.body,
                about.data.heroLine,
                about.data.tagline,
                about.data.footerNote,
                about.data.principalMessage,
                about.data.principalName,
                about.data.principalTitle,
                ...SOCIAL_KEYS.map((k) => about.data[k]),
              ])}
              saved={about.data}
            />
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
  // the homepage's default lines, shown as the fallback while a field is empty
  const tHome = useTranslations("schoolHome");
  const describeError = useErrorMessage();
  const save = useSaveAbout();
  const [body, setBody] = useState(saved.body);
  const [heroLine, setHeroLine] = useState(saved.heroLine);
  const [tagline, setTagline] = useState(saved.tagline);
  const [footerNote, setFooterNote] = useState(saved.footerNote);
  const [principalMessage, setPrincipalMessage] = useState(saved.principalMessage);
  const [principalName, setPrincipalName] = useState(saved.principalName);
  const [principalTitle, setPrincipalTitle] = useState(saved.principalTitle);
  const savedSocial = () => Object.fromEntries(SOCIAL_KEYS.map((k) => [k, saved[k]])) as Record<SocialKey, string>;
  const [social, setSocial] = useState(savedSocial);
  const changed =
    body !== saved.body ||
    heroLine !== saved.heroLine ||
    tagline !== saved.tagline ||
    footerNote !== saved.footerNote ||
    principalMessage !== saved.principalMessage ||
    principalName !== saved.principalName ||
    principalTitle !== saved.principalTitle ||
    SOCIAL_KEYS.some((k) => social[k] !== saved[k]);

  const submit = () =>
    save.mutate(
      // rows left wholly blank are dropped; half-filled ones go to the server, which names the problem
      { body, facts: [], heroLine, tagline, footerNote, principalMessage, principalName, principalTitle, ...social },
      { onSuccess: () => toast.success(t("saved")), onError: (e) => toast.error(describeError(e)) },
    );

  return (
    <div className="space-y-7">
      {/* the short line above the school's name at the top of the homepage; blank = none */}
      <div className="space-y-2">
        <Label htmlFor="about-hero-line">{t("heroLine")}</Label>
        <Input
          id="about-hero-line"
          value={heroLine}
          onChange={(e) => setHeroLine(e.target.value)}
          maxLength={MAX_HERO_LINE}
          placeholder={t("heroLinePlaceholder")}
          aria-describedby="about-hero-line-hint"
        />
        <p id="about-hero-line-hint" className="text-xs text-muted-foreground">
          {t("heroLineHint")}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="about-tagline">{t("tagline")}</Label>
        <Input
          id="about-tagline"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={MAX_TAGLINE}
          placeholder={tHome("hero.tagline")}
          aria-describedby="about-tagline-hint"
        />
        <p id="about-tagline-hint" className="text-xs text-muted-foreground">
          {t("taglineHint", { fallback: tHome("hero.tagline") })}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="about-body">{t("body")}</Label>
        <Textarea id="about-body" value={body} onChange={(e) => setBody(e.target.value)} rows={7} maxLength={MAX_BODY} placeholder={t("bodyPlaceholder")} />
        <p className="text-right text-xs text-muted-foreground tabular-nums">
          {body.length} / {MAX_BODY}
        </p>
      </div>

      {/* the principal's message: shown beside the about text, hidden while the message is empty */}
      <fieldset className="min-w-0 space-y-5 rounded-xl border border-border/70 p-4 sm:p-5">
        <legend className="px-1 text-sm font-semibold">{t("principal")}</legend>
        <p className="-mt-2 text-xs text-muted-foreground">{t("principalHint")}</p>
        <PrincipalPhoto photo={saved.principalPhoto} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="about-principal-name">{t("principalName")}</Label>
            <Input
              id="about-principal-name"
              value={principalName}
              onChange={(e) => setPrincipalName(e.target.value)}
              maxLength={MAX_PRINCIPAL_NAME}
              placeholder={t("principalNamePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="about-principal-title">{t("principalTitle")}</Label>
            <Input
              id="about-principal-title"
              value={principalTitle}
              onChange={(e) => setPrincipalTitle(e.target.value)}
              maxLength={MAX_PRINCIPAL_TITLE}
              placeholder={tHome("about.principalTitle")}
              aria-describedby="about-principal-title-hint"
            />
            <p id="about-principal-title-hint" className="text-xs text-muted-foreground">
              {t("principalTitleHint", { fallback: tHome("about.principalTitle") })}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="about-principal-message">{t("principalMessage")}</Label>
          <Textarea
            id="about-principal-message"
            value={principalMessage}
            onChange={(e) => setPrincipalMessage(e.target.value)}
            rows={5}
            maxLength={MAX_MESSAGE}
            placeholder={t("principalMessagePlaceholder")}
          />
          <p className="text-right text-xs text-muted-foreground tabular-nums">
            {principalMessage.length} / {MAX_MESSAGE}
          </p>
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="about-footer-note">{t("footerNote")}</Label>
        <Textarea
          id="about-footer-note"
          value={footerNote}
          onChange={(e) => setFooterNote(e.target.value)}
          rows={2}
          maxLength={MAX_FOOTER_NOTE}
          placeholder={tHome("footer.about")}
          aria-describedby="about-footer-note-hint"
        />
        <p id="about-footer-note-hint" className="text-xs text-muted-foreground">
          {t("footerNoteHint", { fallback: tHome("footer.about") })}
        </p>
      </div>

      {/* the footer's icons: each shows only when its link is filled in */}
      <fieldset className="min-w-0 space-y-4 rounded-xl border border-border/70 p-4 sm:p-5">
        <legend className="px-1 text-sm font-semibold">{t("social")}</legend>
        <p className="-mt-2 text-xs text-muted-foreground">{t("socialHint")}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {SOCIAL_KEYS.map((key) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`about-${key}`}>{t(key)}</Label>
              <Input
                id={`about-${key}`}
                type="url"
                inputMode="url"
                value={social[key]}
                onChange={(e) => setSocial({ ...social, [key]: e.target.value })}
                maxLength={MAX_SOCIAL_URL}
                placeholder="https://"
                dir="ltr"
              />
            </div>
          ))}
        </div>
      </fieldset>

      <p className="text-xs text-muted-foreground">
        {t("note")} {t("linesNote")}
      </p>
      <div className="flex justify-end gap-2">
        {changed && (
          <Button
            variant="ghost"
            onClick={() => {
              setBody(saved.body);
              setHeroLine(saved.heroLine);
              setTagline(saved.tagline);
              setFooterNote(saved.footerNote);
              setPrincipalMessage(saved.principalMessage);
              setPrincipalName(saved.principalName);
              setPrincipalTitle(saved.principalTitle);
              setSocial(savedSocial());
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

/* The principal's photo: a round preview and its buttons; it saves (and goes) at once, like the picture. */
function PrincipalPhoto({ photo }: { photo: string | null }) {
  const t = useTranslations("school.settings.about");
  const describeError = useErrorMessage();
  const upload = useUploadPrincipalPhoto();
  const remove = useRemovePrincipalPhoto();
  const fileInput = useRef<HTMLInputElement>(null);
  const busy = upload.isPending || remove.isPending;

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- signed links to private storage
          <img src={photo} alt="" className="size-full object-cover" />
        ) : (
          <UserRound className="size-7 text-muted-foreground/60" />
        )}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold">{t("principalPhoto")}</p>
        <p className="text-xs text-muted-foreground">{t("principalPhotoHint")}</p>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) upload.mutate(file, { onSuccess: () => toast.success(t("photoSaved")), onError: (err) => toast.error(describeError(err)) });
          }}
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={busy}>
            <ImagePlus /> {upload.isPending ? t("uploading") : photo ? t("changePhoto") : t("addPhoto")}
          </Button>
          {photo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => remove.mutate(undefined, { onSuccess: () => toast.success(t("photoRemoved")), onError: (err) => toast.error(describeError(err)) })}
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
