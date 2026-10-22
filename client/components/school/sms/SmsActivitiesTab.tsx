"use client";

import type { LucideIcon } from "lucide-react";
import { Award, Banknote, ClipboardCheck, GraduationCap, Lock, MessageSquareText, Pencil, PowerOff, UserPlus, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useCan } from "@/lib/auth/hooks";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useNotificationSettings, useSetNotificationTypeEnabled } from "@/lib/school/notifications";
import {
  activityPermission,
  SMS_ACTIVITIES,
  smsParts,
  useSmsTemplates,
  useUpdateSmsTemplate,
  type SmsActivity,
  type SmsSettings,
  type SmsTemplate,
} from "@/lib/school/sms";
import { cn } from "@/lib/utils";
import { SmsTemplateDialog } from "./SmsTemplateDialog";

const ICONS: Record<SmsActivity, LucideIcon> = {
  admission: UserPlus,
  payment: Banknote,
  attendance: ClipboardCheck,
  result: Award,
  fee_due: Wallet,
  promotion: GraduationCap,
};

/**
 * Every automatic SMS, by activity: its switch (for those with that activity's permission)
 * and its wording in the school's language (editable with sms:templates).
 */
export function SmsActivitiesTab({ settings, onOpenSettings }: { settings: SmsSettings | undefined; onOpenSettings?: () => void }) {
  const t = useTranslations("school.sms");
  const can = useCan();
  const templates = useSmsTemplates();
  const [editing, setEditing] = useState<SmsTemplate | null>(null);
  const language = settings?.language ?? "BN";

  if (templates.isPending) {
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }
  if (templates.isError) return <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{t("loadFailed")}</p>;

  return (
    <div className="space-y-5">
      {settings && !settings.isActive && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <PowerOff className="size-4 shrink-0" />
          <span className="flex-1">{t("activities.offBanner")}</span>
          {onOpenSettings && (
            <Button size="sm" variant="outline" onClick={onOpenSettings}>
              {t("activities.openSettings")}
            </Button>
          )}
        </div>
      )}
      <p className="text-sm text-muted-foreground">{t("activities.intro", { language: t(`languages.${language}`) })}</p>

      <div className="grid gap-5 lg:grid-cols-2">
        {SMS_ACTIVITIES.map((activity) => {
          const items = templates.data.filter((tpl) => tpl.activity === activity);
          const Icon = ICONS[activity];
          const mayToggle = can(activityPermission(activity));
          return (
            <section key={activity} className="rounded-xl border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
              <header className="flex items-center gap-3 border-b px-5 py-3.5">
                <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <Icon className="size-4" />
                </span>
                <h2 className="flex-1 font-semibold">{t(`activities.names.${activity}`)}</h2>
                {!mayToggle && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground" title={t("activities.noPermission")}>
                    <Lock className="size-3.5" /> {t("activities.viewOnly")}
                  </span>
                )}
              </header>
              <ul className="divide-y">
                {activity === "attendance" && <InAppPresentRow mayToggle={mayToggle} />}
                {items.map((tpl) => (
                  <EventRow
                    key={tpl.event}
                    template={tpl}
                    language={language}
                    mayToggle={mayToggle}
                    mayEdit={can("sms:templates")}
                    onEdit={() => setEditing(tpl)}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <SmsTemplateDialog template={editing} language={language} onClose={() => setEditing(null)} />
    </div>
  );
}

/*
 * Not an SMS: the daily "present" message in the family's app (the message icon). On unless
 * the school turns it off; the same permission as the attendance SMS.
 */
function InAppPresentRow({ mayToggle }: { mayToggle: boolean }) {
  const t = useTranslations("school.sms.activities.inAppPresent");
  const describeError = useErrorMessage();
  const settings = useNotificationSettings();
  const update = useSetNotificationTypeEnabled();
  const enabled = !settings.data?.mutedTypes.includes("STUDENT_PRESENT");

  const toggle = (on: boolean) =>
    update.mutate(
      { type: "STUDENT_PRESENT", enabled: on },
      { onSuccess: () => toast.success(t(on ? "turnedOn" : "turnedOff")), onError: (e) => toast.error(describeError(e)) },
    );

  return (
    <li className="flex items-start gap-3 bg-brand-soft/30 px-5 py-4">
      <MessageSquareText className="mt-0.5 size-4 shrink-0 text-brand" />
      <div className="min-w-0 flex-1">
        <label htmlFor="inapp-present" className="font-medium">
          {t("title")}
        </label>
        <p className="text-xs text-muted-foreground">{t("when")}</p>
      </div>
      <Switch id="inapp-present" checked={enabled} onCheckedChange={toggle} disabled={!mayToggle || !settings.isSuccess || update.isPending} />
    </li>
  );
}

function EventRow({
  template,
  language,
  mayToggle,
  mayEdit,
  onEdit,
}: {
  template: SmsTemplate;
  language: "BN" | "EN";
  mayToggle: boolean;
  mayEdit: boolean;
  onEdit: () => void;
}) {
  const t = useTranslations("school.sms");
  const describeError = useErrorMessage();
  const update = useUpdateSmsTemplate();
  const body = language === "BN" ? template.bodyBn : template.bodyEn;
  const custom = language === "BN" ? template.customBn : template.customEn;
  const { parts } = smsParts(body);
  const id = `sms-${template.event}`;

  const toggle = (enabled: boolean) =>
    update.mutate(
      { event: template.event, body: { enabled } },
      {
        onSuccess: () => toast.success(t(enabled ? "activities.turnedOn" : "activities.turnedOff", { name: t(`events.${template.event}.title`) })),
        onError: (e) => toast.error(describeError(e)),
      },
    );

  return (
    <li className="space-y-2.5 px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="font-medium">
            {t(`events.${template.event}.title`)}
          </label>
          <p className="text-xs text-muted-foreground">{t(`events.${template.event}.when`)}</p>
        </div>
        <Switch id={id} checked={template.enabled} onCheckedChange={toggle} disabled={!mayToggle || update.isPending} />
      </div>
      <div className={cn("rounded-lg border bg-muted/30 px-3 py-2.5", !template.enabled && "opacity-60")}>
        <p className="text-sm whitespace-pre-line" lang={language === "BN" ? "bn" : "en"}>
          {body}
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{t("parts", { count: parts })}</span>
          <span>·</span>
          <span>{t(custom ? "activities.custom" : "activities.default")}</span>
          {mayEdit && (
            <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs" onClick={onEdit}>
              <Pencil className="size-3.5" /> {t("activities.edit")}
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
