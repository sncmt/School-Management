"use client";

import { FlaskConical } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useSmsSettings, useUpdateSmsSettings, type SmsLanguage, type SmsProvider } from "@/lib/school/sms";
import { cn } from "@/lib/utils";

/** The school's SMS account: the switch for all SMS, its gateway, sender ID and language. */
export function SmsSettingsTab() {
  const t = useTranslations("school.sms.settings");
  const tSms = useTranslations("school.sms");
  const describeError = useErrorMessage();
  const settings = useSmsSettings();
  const save = useUpdateSmsSettings();
  const [form, setForm] = useState({ isActive: false, provider: "TEST" as SmsProvider, senderId: "", language: "BN" as SmsLanguage });

  useEffect(() => {
    if (settings.data) {
      setForm({
        isActive: settings.data.isActive,
        provider: settings.data.provider,
        senderId: settings.data.senderId ?? "",
        language: settings.data.language,
      });
    }
  }, [settings.data]);

  if (settings.isPending) return <Skeleton className="h-96 max-w-2xl rounded-xl" />;
  if (settings.isError) return <p className="text-sm text-muted-foreground">{describeError(settings.error)}</p>;

  const dirty =
    form.isActive !== settings.data.isActive ||
    form.provider !== settings.data.provider ||
    form.senderId.trim() !== (settings.data.senderId ?? "") ||
    form.language !== settings.data.language;

  const submit = () =>
    save.mutate(
      { ...form, senderId: form.senderId.trim() || null },
      { onSuccess: () => toast.success(t("saved")), onError: (e) => toast.error(describeError(e)) },
    );

  return (
    <section className="max-w-2xl divide-y rounded-2xl border border-border/70 bg-card">
      <div className="flex items-start gap-4 p-5">
        <div className="flex-1 space-y-1">
          <Label htmlFor="sms-active" className="text-base font-semibold">
            {t("active")}
          </Label>
          <p className="text-sm text-muted-foreground">{t("activeHint")}</p>
        </div>
        <Switch id="sms-active" checked={form.isActive} onCheckedChange={(isActive) => setForm({ ...form, isActive })} />
      </div>

      <div className="space-y-4 p-5">
        <div className="space-y-1.5">
          <Label htmlFor="sms-provider">{t("gateway")}</Label>
          <Select value={form.provider} onValueChange={(provider) => setForm({ ...form, provider: provider as SmsProvider })}>
            <SelectTrigger id="sms-provider" className="w-full sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TEST">{t("providers.TEST")}</SelectItem>
            </SelectContent>
          </Select>
          {form.provider === "TEST" && (
            <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <FlaskConical className="mt-0.5 size-3.5 shrink-0" /> {t("testHint")}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sms-sender">{t("senderId")}</Label>
          <Input
            id="sms-sender"
            value={form.senderId}
            onChange={(e) => setForm({ ...form, senderId: e.target.value })}
            maxLength={20}
            className="sm:w-72"
            placeholder={t("senderIdPlaceholder")}
          />
          <p className="text-xs text-muted-foreground">{t("senderIdHint")}</p>
        </div>
      </div>

      <fieldset className="space-y-3 p-5">
        <legend className="mb-3 text-sm font-medium">{t("language")}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["BN", "EN"] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              role="radio"
              aria-checked={form.language === lang}
              onClick={() => setForm({ ...form, language: lang })}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                form.language === lang ? "border-brand bg-brand-soft/60 ring-1 ring-brand" : "hover:bg-muted/50",
              )}
            >
              <div className="font-medium">{tSms(`languages.${lang}`)}</div>
              <div className="text-xs text-muted-foreground">{t(`languageHints.${lang}`)}</div>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex justify-end gap-2 p-4">
        <Button onClick={submit} disabled={!dirty || save.isPending}>
          {t("save")}
        </Button>
      </div>
    </section>
  );
}
