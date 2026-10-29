"use client";

import { Check, GalleryHorizontalEnd, Palette } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolMe } from "@/lib/auth/hooks";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useAppearance, useSaveAppearance } from "@/lib/school/settings";
import {
  ACCENT_COLORS,
  accentSwatch,
  applySchoolColors,
  asAccent,
  asSidebar,
  SIDEBAR_COLORS,
  sidebarSwatch,
  SUGGESTED_ACCENT,
  type AccentColor,
  type SchoolColors,
  type SidebarColor,
} from "@/lib/theme/accents";
import { cn } from "@/lib/utils";
import { AboutCard } from "./AboutCard";
import { AdmissionCard } from "./AdmissionCard";
import { PhotoListCard } from "./PhotoListCard";

/** The school's own settings (super admin only): the colours of its site, and its homepage's slider and admission section. */
export function SchoolSettingsPage() {
  const t = useTranslations("school.settings");
  const me = useSchoolMe();

  if (me && !me.isSuperAdmin) return <p className="py-12 text-center text-sm text-muted-foreground">{t("superAdminOnly")}</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="space-y-1">
        <h1 className="page-title">{t("title")}</h1>
        <p className="page-subtitle">{t("description")}</p>
      </div>
      <AppearanceCard />
      <PhotoListCard list="slides" />
      <AboutCard />
      <AdmissionCard />
      <PhotoListCard list="gallery" icon={GalleryHorizontalEnd} />
    </div>
  );
}

type Colors = { accent: AccentColor; sidebar: SidebarColor };

function AppearanceCard() {
  const t = useTranslations("school.settings.appearance");
  const describeError = useErrorMessage();
  const appearance = useAppearance();
  const save = useSaveAppearance();
  const saved: Colors | undefined = appearance.data
    ? { accent: asAccent(appearance.data.accentColor) ?? "BLUE", sidebar: asSidebar(appearance.data.sidebarColor) ?? "NAVY" }
    : undefined;
  const [picked, setPicked] = useState<Partial<Colors>>({});
  const chosen: Colors | undefined = saved && { ...saved, ...picked };
  const changed = !!chosen && !!saved && (chosen.accent !== saved.accent || chosen.sidebar !== saved.sidebar);

  // leaving the page with colours tried but not saved: back to the saved ones
  const savedRef = useRef<SchoolColors | null>(null);
  useEffect(() => {
    savedRef.current = saved ?? null;
  });
  useEffect(
    () => () => {
      if (savedRef.current) applySchoolColors(savedRef.current);
    },
    [],
  );

  // try a colour: the whole page (sidebar included) shows it at once
  const pick = (patch: Partial<Colors>) => {
    if (!saved) return;
    const next = { ...saved, ...picked, ...patch };
    setPicked({ ...picked, ...patch });
    applySchoolColors(next);
  };

  const submit = () =>
    chosen &&
    save.mutate(
      { accentColor: chosen.accent === "BLUE" ? null : chosen.accent, sidebarColor: chosen.sidebar === "NAVY" ? null : chosen.sidebar },
      {
        onSuccess: () => {
          setPicked({});
          toast.success(t("saved"));
        },
        onError: (e) => toast.error(describeError(e)),
      },
    );

  const undo = () => {
    setPicked({});
    if (saved) applySchoolColors(saved);
  };

  const suggested = chosen ? SUGGESTED_ACCENT[chosen.sidebar] : undefined;

  return (
    <section className="rounded-2xl border border-border/70 bg-card">
      <header className="flex items-center gap-3 border-b px-5 py-4">
        <span className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Palette className="size-4" />
        </span>
        <div>
          <h2 className="font-semibold">{t("cardTitle")}</h2>
          <p className="text-xs text-muted-foreground">{t("cardHint")}</p>
        </div>
      </header>

      <div className="space-y-7 p-5">
        {appearance.isPending || !chosen ? (
          appearance.isError ? (
            <p className="text-sm text-muted-foreground">{describeError(appearance.error)}</p>
          ) : (
            <Skeleton className="h-48 w-full" />
          )
        ) : (
          <>
            <Swatches
              title={t("sidebar.title")}
              hint={t("sidebar.hint")}
              options={SIDEBAR_COLORS.map((key) => ({ key, color: sidebarSwatch(key), label: t(`sidebar.colors.${key}`), isDefault: key === "NAVY" }))}
              value={chosen.sidebar}
              onChange={(sidebar) => pick({ sidebar: sidebar as SidebarColor })}
            />

            <div className="space-y-3">
              <Swatches
                title={t("accent.title")}
                hint={t("accent.hint")}
                options={ACCENT_COLORS.map((key) => ({ key, color: accentSwatch(key), label: t(`accent.colors.${key}`), isDefault: key === "BLUE" }))}
                value={chosen.accent}
                onChange={(accent) => pick({ accent: accent as AccentColor })}
              />
              {suggested && suggested !== chosen.accent && (
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {t("suggestion", { sidebar: t(`sidebar.colors.${chosen.sidebar}`), accent: t(`accent.colors.${suggested}`) })}
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => pick({ accent: suggested })}>
                    {t("useSuggestion")}
                  </Button>
                </p>
              )}
            </div>

            <Preview />

            <p className="text-xs text-muted-foreground">{t("note")}</p>

            <div className="flex justify-end gap-2">
              {changed && (
                <Button variant="ghost" onClick={undo} disabled={save.isPending}>
                  {t("undo")}
                </Button>
              )}
              <Button onClick={submit} disabled={!changed || save.isPending}>
                {t("save")}
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/* A row of colour choices. */
function Swatches({
  title,
  hint,
  options,
  value,
  onChange,
}: {
  title: string;
  hint: string;
  options: { key: string; color: string; label: string; isDefault: boolean }[];
  value: string;
  onChange: (key: string) => void;
}) {
  const t = useTranslations("school.settings.appearance");
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label={title}>
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={value === o.key}
            onClick={() => onChange(o.key)}
            className={cn("flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50", value === o.key && "border-brand ring-1 ring-brand")}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-white shadow-inner" style={{ background: o.color }}>
              {value === o.key && <Check className="size-4" />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{o.label}</span>
              {o.isDefault && <span className="block text-xs text-muted-foreground">{t("default")}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* The two together, as the app draws them: a sliver of the sidebar beside a card. */
function Preview() {
  const t = useTranslations("school.settings.appearance");
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{t("preview")}</p>
      <div className="flex overflow-hidden rounded-lg border">
        <div className="w-36 shrink-0 space-y-1.5 bg-school-sidebar p-3 text-[15px] text-white">
          <div className="pb-1 text-[12px] font-semibold tracking-wider text-white/50 uppercase">{t("previewMenu")}</div>
          <div className="relative rounded-md bg-white/10 px-2 py-1.5 font-semibold before:absolute before:top-1.5 before:bottom-1.5 before:-left-3 before:w-[3px] before:rounded-r-full before:bg-sidebar-primary">
            {t("previewActive")}
          </div>
          <div className="px-2 py-1.5 text-white/80">{t("previewOther")}</div>
          <div className="px-2 py-1.5 text-white/80">{t("previewOther2")}</div>
        </div>
        <div className="min-w-0 flex-1 space-y-3 bg-canvas p-3">
          <div className="overflow-hidden rounded-md border bg-card">
            <div className="bg-brand-soft px-3 py-2 text-[13px] font-bold tracking-wider text-navy uppercase">{t("previewTable")}</div>
            <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <span className="truncate">{t("previewRow")}</span>
              <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">{t("previewBadge")}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* drawn as the app draws them: a button, an active tab, a link */}
            <span className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">{t("previewButton")}</span>
            <span className="rounded-lg bg-navy px-3 py-1.5 text-sm font-semibold text-navy-foreground">{t("previewTab")}</span>
            <span className="text-sm font-medium text-brand underline underline-offset-4">{t("previewLink")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
