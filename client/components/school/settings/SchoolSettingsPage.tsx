"use client";

import { Check, Palette } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolMe } from "@/lib/auth/hooks";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useAppearance, useSaveAppearance } from "@/lib/school/settings";
import { ACCENT_COLORS, accentSwatch, applyAccent, asAccent, type AccentColor } from "@/lib/theme/accents";
import { cn } from "@/lib/utils";

/** The school's own settings (super admin only): for now, the accent colour of its site. */
export function SchoolSettingsPage() {
  const t = useTranslations("school.settings");
  const me = useSchoolMe();

  if (me && !me.isSuperAdmin) return <p className="py-12 text-center text-sm text-muted-foreground">{t("superAdminOnly")}</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <AppearanceCard />
    </div>
  );
}

function AppearanceCard() {
  const t = useTranslations("school.settings.appearance");
  const describeError = useErrorMessage();
  const appearance = useAppearance();
  const save = useSaveAppearance();
  const saved = appearance.data ? (asAccent(appearance.data.accentColor) ?? "BLUE") : undefined;
  const [picked, setPicked] = useState<AccentColor | undefined>();
  const chosen = picked ?? saved;

  // leaving the page with a colour tried but not saved: back to the saved one
  const savedRef = useRef(saved);
  useEffect(() => {
    savedRef.current = saved;
  }, [saved]);
  useEffect(() => () => applyAccent(savedRef.current ?? null), []);

  // try a colour: the whole page shows it at once (put back if not saved)
  const pick = (accent: AccentColor) => {
    setPicked(accent);
    applyAccent(accent);
  };

  const submit = () =>
    chosen &&
    save.mutate(chosen === "BLUE" ? null : chosen, {
      onSuccess: () => {
        setPicked(undefined);
        toast.success(t("saved"));
      },
      onError: (e) => toast.error(describeError(e)),
    });

  const reset = () => {
    setPicked(undefined);
    if (saved) applyAccent(saved);
  };

  return (
    <section className="rounded-xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
      <header className="flex items-center gap-3 border-b px-5 py-4">
        <span className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-brand">
          <Palette className="size-4" />
        </span>
        <div>
          <h2 className="font-semibold">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
        </div>
      </header>

      <div className="space-y-6 p-5">
        {appearance.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : appearance.isError ? (
          <p className="text-sm text-muted-foreground">{describeError(appearance.error)}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label={t("title")}>
              {ACCENT_COLORS.map((accent) => (
                <button
                  key={accent}
                  type="button"
                  role="radio"
                  aria-checked={chosen === accent}
                  onClick={() => pick(accent)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50",
                    chosen === accent && "border-brand ring-1 ring-brand",
                  )}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-white shadow-inner" style={{ background: accentSwatch(accent) }}>
                    {chosen === accent && <Check className="size-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{t(`colors.${accent}`)}</span>
                    {accent === "BLUE" && <span className="block text-xs text-muted-foreground">{t("default")}</span>}
                  </span>
                </button>
              ))}
            </div>

            {/* how the accent looks on the app's usual pieces */}
            <div className="space-y-3 rounded-lg border bg-canvas p-4">
              <p className="text-xs font-medium text-muted-foreground">{t("preview")}</p>
              <div className="overflow-hidden rounded-md border bg-card">
                <div className="bg-brand-soft px-3 py-2 text-[11px] font-bold tracking-wider text-navy uppercase">{t("previewTable")}</div>
                <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <span>{t("previewRow")}</span>
                  <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">{t("previewBadge")}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground">{t("previewButton")}</span>
                <span className="text-sm font-medium text-brand underline underline-offset-4">{t("previewLink")}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">{t("note")}</p>

            <div className="flex justify-end gap-2">
              {picked && picked !== saved && (
                <Button variant="ghost" onClick={reset} disabled={save.isPending}>
                  {t("undo")}
                </Button>
              )}
              <Button onClick={submit} disabled={!picked || picked === saved || save.isPending}>
                {t("save")}
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
