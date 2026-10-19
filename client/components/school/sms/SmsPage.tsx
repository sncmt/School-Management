"use client";

import { FlaskConical } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/lib/auth/hooks";
import { activityPermission, SMS_ACTIVITIES, useSmsSettings } from "@/lib/school/sms";
import { cn } from "@/lib/utils";
import { SmsActivitiesTab } from "./SmsActivitiesTab";
import { SmsLogTab } from "./SmsLogTab";
import { SmsSendTab } from "./SmsSendTab";
import { SmsSettingsTab } from "./SmsSettingsTab";

type Tab = "activities" | "send" | "log" | "settings";

/** SMS to guardians: each part shows to those whose permissions allow it. */
export function SmsPage() {
  const t = useTranslations("school.sms");
  const can = useCan();
  const settings = useSmsSettings();

  const tabs = [
    (SMS_ACTIVITIES.some((a) => can(activityPermission(a))) || can("sms:templates")) && "activities",
    can("sms:send") && "send",
    can("sms:log") && "log",
    can("sms:gateway") && "settings",
  ].filter(Boolean) as Tab[];
  const [tab, setTab] = useState<Tab | undefined>();
  const current = tab && tabs.includes(tab) ? tab : tabs[0];

  const on = settings.data?.isActive;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        {settings.data && (
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                on
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-muted text-muted-foreground ring-border",
              )}
            >
              <span className={cn("size-1.5 rounded-full", on ? "bg-emerald-500" : "bg-muted-foreground/60")} />
              {t(on ? "status.on" : "status.off")}
            </span>
            {settings.data.provider === "TEST" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-600/15 ring-inset dark:bg-amber-950/40 dark:text-amber-300">
                <FlaskConical className="size-3.5" /> {t("status.testMode")}
              </span>
            )}
          </div>
        )}
      </div>

      <Tabs value={current} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          {tabs.map((name) => (
            <TabsTrigger key={name} value={name}>
              {t(`tabs.${name}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="activities">
          <SmsActivitiesTab settings={settings.data} onOpenSettings={can("sms:gateway") ? () => setTab("settings") : undefined} />
        </TabsContent>
        <TabsContent value="send">
          <SmsSendTab settings={settings.data} />
        </TabsContent>
        <TabsContent value="log">
          <SmsLogTab />
        </TabsContent>
        <TabsContent value="settings">
          <SmsSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
