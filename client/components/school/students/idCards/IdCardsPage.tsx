"use client";

import { Check, Printer, RotateCcw, Save } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCan, useSchoolMe } from "@/lib/auth/hooks";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useAcademicYears } from "@/lib/school/academicYears";
import { useClasses } from "@/lib/school/classes";
import { ID_CARD_TEMPLATES, useIdCards, useIdCardSchool, useIdCardSettings, useSaveIdCardSettings, type IdCard, type IdCardSettings, type IdCardYear } from "@/lib/school/idCards";
import { cn } from "@/lib/utils";
import { IdCardPrint, PER_SHEET } from "./IdCardPrint";
import { IdCardBack, IdCardFront } from "./IdCardTemplates";

const ALL = "all";
const PREVIEW = 6;
const COLOURS = ["#1e3a8a", "#0f766e", "#166534", "#7c2d12", "#7e22ce", "#be123c", "#111827", "#b45309"];

/** Student ID cards: print them by class and section, and choose the school's design. */
export function IdCardsPage() {
  const t = useTranslations("school.idCards");
  const can = useCan();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <Tabs defaultValue="print">
        <TabsList>
          <TabsTrigger value="print">{t("tabs.print")}</TabsTrigger>
          <TabsTrigger value="design">{t("tabs.design")}</TabsTrigger>
        </TabsList>
        <TabsContent value="print">
          <PrintTab />
        </TabsContent>
        <TabsContent value="design">
          <DesignTab canManage={can("student:update")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ------------------------------------------------------------------- print

function PrintTab() {
  const t = useTranslations("school.idCards.print");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const years = useAcademicYears();
  const classes = useClasses();
  const [yearId, setYearId] = useState<string | undefined>();
  const [classId, setClassId] = useState<string>(ALL);
  const [sectionId, setSectionId] = useState<string>(ALL);
  const [withBacks, setWithBacks] = useState(true);

  const yearList = years.data ?? [];
  const shownYear = yearId ?? yearList.find((y) => y.isCurrent)?.id;
  const sections = classes.data?.items.find((c) => c.id === classId)?.sections.filter((s) => !s.isDefault) ?? [];
  const cards = useIdCards(
    {
      ...(shownYear ? { academicYearId: shownYear } : {}),
      ...(classId !== ALL ? { classId } : {}),
      ...(classId !== ALL && sectionId !== ALL ? { sectionId } : {}),
    },
    // the whole school at once only when a class is chosen or the school is small
    classId !== ALL || (classes.data?.items.length ?? 0) <= 3,
  );
  const data = cards.data;
  const sheets = data ? Math.ceil(data.cards.length / PER_SHEET) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {yearList.length > 1 && (
          <Select value={shownYear} onValueChange={setYearId}>
            <SelectTrigger className="w-36" aria-label={t("year")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearList.map((y) => (
                <SelectItem key={y.id} value={y.id}>
                  {y.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={classId}
          onValueChange={(v) => {
            setClassId(v);
            setSectionId(ALL);
          }}
        >
          <SelectTrigger className="w-40" aria-label={t("class")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allClasses")}</SelectItem>
            {classes.data?.items.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sections.length > 0 && (
          <Select value={sectionId} onValueChange={setSectionId}>
            <SelectTrigger className="w-36" aria-label={t("section")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("allSections")}</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {data?.settings.showBack && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Switch checked={withBacks} onCheckedChange={setWithBacks} />
              {t("withBacks")}
            </label>
          )}
          <Button onClick={() => window.print()} disabled={!data || data.cards.length === 0}>
            <Printer /> {t("print")}
          </Button>
        </div>
      </div>

      {classId === ALL && (classes.data?.items.length ?? 0) > 3 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{t("chooseClass")}</p>
      ) : cards.isPending ? (
        <Skeleton className="h-72" />
      ) : cards.error ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{describeError(cards.error)}</p>
      ) : data!.cards.length === 0 ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t("count", { cards: format.number(data!.cards.length), sheets: format.number(sheets) })}
            {withBacks && data!.settings.showBack && ` · ${t("duplexHint")}`}
            {` · ${t("printHint")}`}
          </p>
          <div className="flex flex-wrap gap-4 rounded-md bg-muted/40 p-4">
            {data!.cards.slice(0, PREVIEW).map((card) => (
              <IdCardFront key={card.id} school={data!.school} settings={data!.settings} year={data!.academicYear} card={card} />
            ))}
            {data!.settings.showBack && <IdCardBack school={data!.school} settings={data!.settings} year={data!.academicYear} />}
          </div>
          {data!.cards.length > PREVIEW && <p className="text-xs text-muted-foreground">{t("more", { count: data!.cards.length - PREVIEW })}</p>}
          <IdCardPrint data={data!} withBacks={withBacks} />
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ design

function DesignTab({ canManage }: { canManage: boolean }) {
  const describeError = useErrorMessage();
  const settings = useIdCardSettings();
  if (settings.isPending) return <Skeleton className="h-96" />;
  if (settings.error) return <p className="py-8 text-center text-sm text-muted-foreground">{describeError(settings.error)}</p>;
  return <Designer key={settings.dataUpdatedAt} saved={settings.data} canManage={canManage} />;
}

/* A made-up student for the previews. */
const useSample = (): { card: IdCard; year: IdCardYear } => {
  const t = useTranslations("school.idCards.sample");
  return {
    card: {
      id: "sample",
      rollNumber: "12",
      class: { id: "c", name: t("class"), numericLevel: 8 },
      section: { id: "s", name: "A", isDefault: false },
      group: null,
      student: { id: "st", nameEn: t("name"), nameBn: t("name"), fatherName: t("father"), admissionNo: "2026-0045", photo: null, mobile: "+8801712345678" },
    },
    year: { id: "y", name: String(new Date().getFullYear()), startDate: "", endDate: "" },
  };
};

function Designer({ saved, canManage }: { saved: IdCardSettings; canManage: boolean }) {
  const t = useTranslations("school.idCards.design");
  const describeError = useErrorMessage();
  const me = useSchoolMe();
  const save = useSaveIdCardSettings();
  const sample = useSample();
  const [s, setS] = useState(saved);
  const set = <K extends keyof IdCardSettings>(k: K, v: IdCardSettings[K]) => setS((x) => ({ ...x, [k]: v }));
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);
  // the real school (with its address) once loaded; the login's name and logo until then
  const schoolInfo = useIdCardSchool();
  const school = schoolInfo.data ?? (me ? { ...me.school, address: null, phone: null, email: null, website: null } : null);

  return (
    <div className="space-y-5">
      {/* the templates, each drawn with the current colour */}
      <section className="space-y-2">
        <h2 className="font-semibold">{t("templates")}</h2>
        <div className="flex flex-wrap gap-4">
          {ID_CARD_TEMPLATES.map((template) => {
            const on = s.template === template;
            return (
              <button
                key={template}
                type="button"
                disabled={!canManage}
                onClick={() => set("template", template)}
                aria-pressed={on}
                className={cn("flex flex-col items-center gap-2 rounded-xl border bg-card p-3 transition-colors disabled:cursor-default", on ? "border-primary ring-2 ring-primary" : canManage && "hover:bg-muted/50")}
              >
                <IdCardFront school={school} settings={{ ...s, template }} year={sample.year} card={sample.card} />
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {on && <Check className="size-4 text-primary" />}
                  {t(`names.${template}`)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
        <section className="space-y-4 rounded-xl border bg-card p-5">
          <div className="space-y-2">
            <Label>{t("colour")}</Label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOURS.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={!canManage}
                  onClick={() => set("accentColor", c)}
                  aria-label={c}
                  aria-pressed={s.accentColor === c}
                  className={cn("size-7 rounded-full ring-offset-2 ring-offset-card", s.accentColor === c && "ring-2 ring-foreground")}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={s.accentColor}
                disabled={!canManage}
                onChange={(e) => set("accentColor", e.target.value)}
                aria-label={t("customColour")}
                className="h-7 w-10 cursor-pointer rounded border bg-transparent"
              />
            </div>
          </div>
          {(["showLogo", "showAdmissionNo", "showBack"] as const).map((k) => (
            <label key={k} className="flex cursor-pointer items-start justify-between gap-4 text-sm">
              <span>
                <span className="font-medium">{t(k)}</span>
                <span className="block text-xs text-muted-foreground">{t(`${k}Hint`)}</span>
              </span>
              <Switch checked={s[k]} disabled={!canManage} onCheckedChange={(v) => set(k, v)} />
            </label>
          ))}
          {s.showBack && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="id-back">{t("backText")}</Label>
                <Textarea id="id-back" rows={3} maxLength={300} value={s.backText} disabled={!canManage} onChange={(e) => set("backText", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="id-sign">{t("signatureLabel")}</Label>
                <Input id="id-sign" maxLength={40} value={s.signatureLabel} disabled={!canManage} onChange={(e) => set("signatureLabel", e.target.value)} className="sm:w-64" />
              </div>
            </>
          )}
          {canManage && (
            <div className="flex gap-2 pt-2">
              <Button
                disabled={!dirty || save.isPending}
                onClick={() => save.mutate(s, { onSuccess: () => toast.success(t("saved")), onError: (e) => toast.error(describeError(e)) })}
              >
                <Save /> {save.isPending ? t("saving") : t("save")}
              </Button>
              <Button variant="outline" disabled={!dirty || save.isPending} onClick={() => setS(saved)}>
                <RotateCcw /> {t("undo")}
              </Button>
            </div>
          )}
        </section>

        {/* the chosen design, front and back */}
        <section className="space-y-2">
          <h2 className="font-semibold">{t("preview")}</h2>
          <div className="flex flex-wrap gap-4 rounded-xl border bg-muted/40 p-4">
            <IdCardFront school={school} settings={s} year={sample.year} card={sample.card} />
            {s.showBack && <IdCardBack school={school} settings={s} year={sample.year} />}
          </div>
        </section>
      </div>
    </div>
  );
}
