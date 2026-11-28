"use client";

import type { LucideIcon } from "lucide-react";
import { IdCard, ListChecks, Palette, PenLine, Plus, RotateCcw, Save, Table2, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useSchoolMe } from "@/lib/auth/hooks";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useCardSettings, useSaveCardSettings, type CardLayout, type CardSettings } from "@/lib/school/results";
import { cn } from "@/lib/utils";
import { ResultCardView } from "./ResultCardView";
import { sampleCards } from "./sampleCard";

const LAYOUTS: CardLayout[] = ["CLASSIC", "MODERN", "COMPACT"];
const COLOURS = ["#1e3a8a", "#0f766e", "#166534", "#7c2d12", "#7e22ce", "#be123c", "#111827"];

// the page's sticky top bar (72px): the save bar and the preview's bar stay just under it
const TOP_BAR = 72;

/** The school's result card design, with a live preview on a sample student. */
export function CardSettingsTab({ canManage }: { canManage: boolean }) {
  const t = useTranslations("school.exams.cardSettings");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const { data, isPending, isError, error, refetch, dataUpdatedAt } = useCardSettings();

  if (isPending) return <Skeleton className="h-96" />;
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
        <p>{describeError(error)}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          {tCommon("tryAgain")}
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="px-0.5 text-sm text-muted-foreground">{t("description")}</p>
      <Designer key={dataUpdatedAt} saved={data} canManage={canManage} />
    </div>
  );
}

/*
 * One sheet: the settings down the left (the save bar staying at their top), the preview on a
 * grey desk on the right, staying in view while the settings scroll. The card is drawn at its
 * printed width and zoomed to fit the preview (FitCard), so it never runs off the screen;
 * "Actual size" shows it unzoomed. Below 1024px the preview comes first, the settings under it.
 */
function Designer({ saved, canManage }: { saved: CardSettings; canManage: boolean }) {
  const t = useTranslations("school.exams.cardSettings");
  const describeError = useErrorMessage();
  const me = useSchoolMe();
  const save = useSaveCardSettings();
  const [s, setS] = useState(saved);
  const set = <K extends keyof CardSettings>(key: K, value: CardSettings[K]) => setS((x) => ({ ...x, [key]: value }));
  const changes = (Object.keys(s) as (keyof CardSettings)[]).filter((k) => JSON.stringify(s[k]) !== JSON.stringify(saved[k])).length;
  // the preview: zoomed to fit, or at its printed size
  const [actual, setActual] = useState(false);
  const sample = sampleCards(s, me?.school);

  const toggle = (key: keyof CardSettings, label: string, wide = false) => (
    <label className={cn("flex items-center justify-between gap-3 py-1.5 text-sm", wide && "col-span-2")}>
      <span className="min-w-0">{label}</span>
      <Switch checked={s[key] as boolean} onCheckedChange={(v) => set(key, v as never)} disabled={!canManage} />
    </label>
  );

  const submit = () =>
    save.mutate(
      { ...s, title: s.title.trim(), footerNote: s.footerNote.trim(), signatures: s.signatures.map((x) => x.trim()).filter(Boolean) },
      { onSuccess: () => toast.success(t("saved")), onError: (e) => toast.error(describeError(e)) },
    );

  return (
    <div className="grid rounded-2xl border border-border/60 bg-card lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[21.25rem_minmax(0,1fr)]">
      {/* ----------------------------------------------------------- settings */}
      <div className="min-w-0 max-lg:border-t max-lg:border-border/60 lg:border-r lg:border-border/60">
        {canManage && (
          <div
            className="z-10 flex items-center gap-2 border-b border-border/60 bg-card/95 px-4 py-3 backdrop-blur lg:sticky lg:rounded-tl-2xl"
            style={{ top: TOP_BAR }}
          >
            <Button onClick={submit} disabled={changes === 0 || save.isPending}>
              <Save /> {save.isPending ? t("saving") : t("save")}
            </Button>
            <Button variant="ghost" onClick={() => setS(saved)} disabled={changes === 0} className="px-2.5 text-muted-foreground">
              <RotateCcw /> {t("undo")}
            </Button>
            {changes > 0 && <span className="ml-auto text-[13px] text-muted-foreground">{t("changes", { count: changes })}</span>}
          </div>
        )}

        <Group icon={Palette} title={t("groups.look")}>
          <div className="grid grid-cols-3 gap-2">
            {LAYOUTS.map((l) => (
              <button
                key={l}
                type="button"
                disabled={!canManage}
                onClick={() => set("layout", l)}
                aria-pressed={s.layout === l}
                className={cn(
                  "cursor-pointer rounded-lg border px-1.5 pt-2 pb-1.5 text-center text-[13.5px] transition-colors disabled:cursor-default",
                  s.layout === l ? "border-navy bg-brand-soft font-bold text-navy ring-1 ring-navy" : "border-border hover:bg-muted",
                )}
              >
                <LayoutSketch layout={l} colour={s.accentColor} />
                {t(`layouts.${l}`)}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label>{t("colour")}</Label>
            <div className="flex flex-wrap items-center gap-1.5">
              {COLOURS.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={!canManage}
                  onClick={() => set("accentColor", c)}
                  aria-label={c}
                  aria-pressed={s.accentColor === c}
                  className={cn("size-7 cursor-pointer rounded-full border-2 shadow-[inset_0_0_0_2px_white] disabled:cursor-default", s.accentColor === c ? "border-foreground" : "border-transparent")}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={s.accentColor}
                disabled={!canManage}
                onChange={(e) => set("accentColor", e.target.value)}
                className="h-7 w-10 cursor-pointer rounded border"
                aria-label={t("customColour")}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="card-title">{t("title")}</Label>
            <Input id="card-title" value={s.title} maxLength={60} placeholder={t("titlePlaceholder")} disabled={!canManage} onChange={(e) => set("title", e.target.value)} />
          </div>
        </Group>

        {/* short switches two to a row; the long ones take the whole row */}
        <Group icon={IdCard} title={t("groups.header")}>
          <div className="grid grid-cols-2 gap-x-5">
            {toggle("showLogo", t("showLogo"))}
            {toggle("showAddress", t("showAddress"))}
            {toggle("showPhoto", t("showPhoto"))}
            {toggle("showParents", t("showParents"))}
            {toggle("showAdmissionNo", t("showAdmissionNo"))}
          </div>
        </Group>

        <Group icon={Table2} title={t("groups.columns")}>
          <div className="grid grid-cols-2 gap-x-5">
            {toggle("showCode", t("showCode"))}
            {toggle("showFullMarks", t("showFullMarks"))}
            {toggle("showPassMarks", t("showPassMarks"))}
            {toggle("showGrade", t("showGrade"))}
            {toggle("showPoint", t("showPoint"))}
            {toggle("showParts", t("showParts"), true)}
          </div>
          <ChoiceRow
            label={t("highestMarks")}
            value={s.highestMarks}
            onChange={(v) => set("highestMarks", v as CardSettings["highestMarks"])}
            options={(["NONE", "SECTION", "CLASS"] as const).map((v) => ({ value: v, label: t(`highest.${v}`) }))}
            disabled={!canManage}
          />
        </Group>

        <Group icon={ListChecks} title={t("groups.summary")}>
          <ChoiceRow
            label={t("position")}
            value={s.position}
            onChange={(v) => set("position", v as CardSettings["position"])}
            options={(["NONE", "SECTION", "CLASS", "BOTH"] as const).map((v) => ({ value: v, label: t(`positions.${v}`) }))}
            disabled={!canManage}
          />
          <div className="grid grid-cols-2 gap-x-5">
            {toggle("showAttendance", t("showAttendance"))}
            {toggle("showRemarks", t("showRemarks"))}
            {toggle("showGradingTable", t("showGradingTable"), true)}
          </div>
        </Group>

        <Group icon={PenLine} title={t("groups.footer")} last>
          <div className="space-y-1.5">
            <Label>{t("signatures")}</Label>
            {s.signatures.map((label, i) => (
              <div key={i} className="flex gap-1.5">
                <Input
                  value={label}
                  maxLength={40}
                  disabled={!canManage}
                  onChange={(e) => set("signatures", s.signatures.map((x, j) => (j === i ? e.target.value : x)))}
                  aria-label={t("signature", { n: i + 1 })}
                />
                {canManage && (
                  <Button variant="ghost" size="icon" onClick={() => set("signatures", s.signatures.filter((_, j) => j !== i))} aria-label={t("removeSignature")}>
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))}
            {canManage && s.signatures.length < 4 && (
              <Button variant="outline" size="sm" onClick={() => set("signatures", [...s.signatures, ""])}>
                <Plus /> {t("addSignature")}
              </Button>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="card-footer">{t("footerNote")}</Label>
            <Input id="card-footer" value={s.footerNote} maxLength={200} disabled={!canManage} placeholder={t("footerPlaceholder")} onChange={(e) => set("footerNote", e.target.value)} />
          </div>
        </Group>
      </div>

      {/* ----------------------------------------------------------- preview */}
      <div className="flex min-w-0 flex-col bg-muted/50 max-lg:order-first max-lg:rounded-t-2xl lg:rounded-r-2xl">
        <FitCard
          actual={actual}
          note={t("previewNote")}
          bar={(size) => (
            <>
              <span className="text-[15px] font-semibold">{t("preview")}</span>
              <Segmented
                value={actual ? "actual" : "fit"}
                onChange={(v) => setActual(v === "actual")}
                options={[
                  { value: "fit", label: t("fitScreen") },
                  { value: "actual", label: t("actualSize") },
                ]}
              />
              {size && <span className="ml-auto text-[13px] text-muted-foreground tabular-nums">{t("size", { size })}</span>}
            </>
          )}
        >
          <ResultCardView data={sample} card={sample.cards[0]} />
        </FitCard>
      </div>
    </div>
  );
}

/*
 * The preview's bar and stage. The card is drawn at its printed width (190mm) and zoomed (zoom,
 * so the room it takes shrinks too) to fill the stage's width, as big as it can be. From 1024px the
 * stage stays in view while the settings scroll: under the bars when it fits the window, otherwise
 * it scrolls until its bottom shows and stays there (a negative sticky top), so every part of the
 * card can be seen. The note under the card stays with it. "Actual size" draws it unzoomed,
 * scrolling sideways when it's wider than the stage.
 */
function FitCard({
  actual,
  note,
  bar,
  children,
}: {
  actual: boolean;
  note: string;
  bar: (size: string | null) => ReactNode;
  children: ReactNode;
}) {
  const format = useFormatter();
  const stage = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const caption = useRef<HTMLParagraphElement>(null);
  // where the stage sticks: just under the bar (which wraps to two rows on a narrow screen), or
  // higher (negative) when the card is taller than the window, so its bottom can show
  const [stageTop, setStageTop] = useState(TOP_BAR + 56);
  const [zoom, setZoom] = useState<number | null>(null);

  useLayoutEffect(() => {
    const box = stage.current;
    const drawing = card.current;
    if (!box || !drawing) return;
    const fit = () => {
      if (actual) {
        drawing.style.zoom = "";
        setZoom(1);
      } else {
        drawing.style.zoom = "1";
        const style = getComputedStyle(box);
        const room = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const z = Math.max(0.3, Math.min(1, room / drawing.offsetWidth));
        drawing.style.zoom = String(Math.floor(z * 1000) / 1000);
        setZoom(z);
      }
      const underBar = TOP_BAR + (head.current?.offsetHeight ?? 56);
      setStageTop(Math.min(underBar, window.innerHeight - box.offsetHeight));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    observer.observe(drawing);
    if (head.current) observer.observe(head.current);
    window.addEventListener("resize", fit);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [actual]);

  return (
    <>
      <div
        ref={head}
        className="z-10 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border/60 bg-muted/90 px-4 py-2.5 backdrop-blur lg:sticky lg:rounded-tr-2xl"
        style={{ top: TOP_BAR }}
      >
        {bar(zoom === null ? null : format.number(zoom, { style: "percent" }))}
      </div>
      {/* the card and its note stay in view together */}
      <div
        ref={stage}
        className={cn("flex flex-col gap-3 p-3 sm:p-4 lg:sticky", actual ? "items-start overflow-x-auto" : "items-center")}
        style={{ top: stageTop }}
      >
        <div ref={card} className="shrink-0 shadow-[0_18px_40px_-22px_rgb(15_23_42/0.45),0_0_0_1px_rgb(15_23_42/0.06)]">
          {children}
        </div>
        <p ref={caption} className="max-w-xl self-center text-center text-xs text-muted-foreground">
          {note}
        </p>
      </div>
    </>
  );
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="inline-flex gap-0.5 rounded-lg border border-border/70 bg-card p-0.5 text-[13px]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "cursor-pointer rounded-md px-2.5 py-1 transition-colors",
            value === o.value ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// a tiny drawing of each layout: the title band in the chosen colour over a few lines
function LayoutSketch({ layout, colour }: { layout: CardLayout; colour: string }) {
  return (
    <span
      aria-hidden
      className={cn("mx-auto mb-1.5 block h-8 w-full max-w-16 overflow-hidden rounded-sm bg-white ring-1 ring-border", layout === "MODERN" && "border-l-4")}
      style={{ borderColor: colour }}
    >
      <span className={cn("mx-1.5 mt-1.5 block rounded-[1px]", layout === "COMPACT" ? "h-1" : "h-1.5")} style={{ backgroundColor: colour }} />
      {Array.from({ length: layout === "COMPACT" ? 4 : 3 }, (_, i) => (
        <span key={i} className={cn("mx-1.5 block h-px bg-border", layout === "COMPACT" ? "mt-1" : "mt-1.5")} />
      ))}
    </span>
  );
}

function Group({ icon: Icon, title, last, children }: { icon: LucideIcon; title: string; last?: boolean; children: ReactNode }) {
  return (
    <section className={cn("space-y-3 px-4 py-4", !last && "border-b border-border/60")}>
      <h3 className="flex items-center gap-2 text-[15px] font-semibold text-navy">
        <Icon className="size-4 text-muted-foreground" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function ChoiceRow({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm">
      {label}
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-8 w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
