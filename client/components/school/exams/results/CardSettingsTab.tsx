"use client";

import { Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      <Designer key={dataUpdatedAt} saved={data} canManage={canManage} />
    </div>
  );
}

function Designer({ saved, canManage }: { saved: CardSettings; canManage: boolean }) {
  const t = useTranslations("school.exams.cardSettings");
  const describeError = useErrorMessage();
  const me = useSchoolMe();
  const save = useSaveCardSettings();
  const [s, setS] = useState(saved);
  const set = <K extends keyof CardSettings>(key: K, value: CardSettings[K]) => setS((x) => ({ ...x, [key]: value }));
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);
  // preview an exam's card or a final result's
  const [final, setFinal] = useState(false);
  const sample = sampleCards(s, me?.school, final);

  const toggle = (key: keyof CardSettings, label: string) => (
    <label className="flex items-center justify-between gap-3 py-1 text-sm">
      {label}
      <Switch checked={s[key] as boolean} onCheckedChange={(v) => set(key, v as never)} disabled={!canManage} />
    </label>
  );

  const submit = () =>
    save.mutate(
      { ...s, title: s.title.trim(), footerNote: s.footerNote.trim(), signatures: s.signatures.map((x) => x.trim()).filter(Boolean) },
      { onSuccess: () => toast.success(t("saved")), onError: (e) => toast.error(describeError(e)) },
    );

  return (
    <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
      {/* ----------------------------------------------------------- options */}
      <div className="space-y-3">
        {canManage && (
          <div className="flex gap-2">
            <Button onClick={submit} disabled={!dirty || save.isPending}>
              <Save /> {save.isPending ? t("saving") : t("save")}
            </Button>
            <Button variant="ghost" onClick={() => setS(saved)} disabled={!dirty}>
              <RotateCcw /> {t("undo")}
            </Button>
          </div>
        )}

        <Group title={t("groups.look")}>
          <div className="grid grid-cols-3 gap-2">
            {LAYOUTS.map((l) => (
              <button
                key={l}
                type="button"
                disabled={!canManage}
                onClick={() => set("layout", l)}
                className={cn(
                  "cursor-pointer rounded-md border p-2 text-center text-xs transition-colors disabled:cursor-default",
                  s.layout === l ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted",
                )}
              >
                <div className="font-medium">{t(`layouts.${l}`)}</div>
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
                  className={cn("size-7 cursor-pointer rounded-full border-2 disabled:cursor-default", s.accentColor === c ? "border-foreground" : "border-transparent")}
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

        <Group title={t("groups.header")}>
          {toggle("showLogo", t("showLogo"))}
          {toggle("showAddress", t("showAddress"))}
          {toggle("showPhoto", t("showPhoto"))}
          {toggle("showParents", t("showParents"))}
          {toggle("showAdmissionNo", t("showAdmissionNo"))}
        </Group>

        <Group title={t("groups.columns")}>
          {toggle("showCode", t("showCode"))}
          {toggle("showFullMarks", t("showFullMarks"))}
          {toggle("showPassMarks", t("showPassMarks"))}
          {toggle("showParts", t("showParts"))}
          {toggle("showGrade", t("showGrade"))}
          {toggle("showPoint", t("showPoint"))}
          {toggle("showComponents", t("showComponents"))}
          <ChoiceRow
            label={t("highestMarks")}
            value={s.highestMarks}
            onChange={(v) => set("highestMarks", v as CardSettings["highestMarks"])}
            options={(["NONE", "SECTION", "CLASS"] as const).map((v) => ({ value: v, label: t(`highest.${v}`) }))}
            disabled={!canManage}
          />
        </Group>

        <Group title={t("groups.summary")}>
          <ChoiceRow
            label={t("position")}
            value={s.position}
            onChange={(v) => set("position", v as CardSettings["position"])}
            options={(["NONE", "SECTION", "CLASS", "BOTH"] as const).map((v) => ({ value: v, label: t(`positions.${v}`) }))}
            disabled={!canManage}
          />
          {toggle("showAttendance", t("showAttendance"))}
          {toggle("showRemarks", t("showRemarks"))}
          {toggle("showGradingTable", t("showGradingTable"))}
        </Group>

        <Group title={t("groups.footer")}>
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
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium">{t("preview")}</div>
          <div className="inline-flex rounded-md border p-0.5 text-xs">
            {[false, true].map((f) => (
              <button
                key={String(f)}
                type="button"
                onClick={() => setFinal(f)}
                className={cn("cursor-pointer rounded px-2.5 py-1 transition-colors", final === f ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
              >
                {t(f ? "previewFinal" : "previewExam")}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-auto rounded-md bg-muted/40 p-4">
          <div className="origin-top-left shadow-sm" style={{ width: "190mm" }}>
            <ResultCardView data={sample} card={sample.cards[0]} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t("previewNote")}</p>
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
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
