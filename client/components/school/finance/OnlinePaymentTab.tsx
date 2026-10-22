"use client";

import { CircleCheck, CircleX, PlugZap, Save } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getFieldErrors } from "@/lib/api/errors";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useOnlinePaymentSettings, useSaveOnlinePayment, useTestOnlinePayment, type OnlinePaymentSettings } from "@/lib/school/onlinePayment";
import { cn } from "@/lib/utils";
import { OnlinePaymentsList } from "./OnlinePaymentsList";

/** Online payments: what guardians paid, and the school's SSLCommerz store they pay into. */
export function OnlinePaymentTab() {
  const t = useTranslations("school.finance.online");
  const describeError = useErrorMessage();
  const settings = useOnlinePaymentSettings();
  if (settings.isPending) return <Skeleton className="h-96" />;
  if (settings.error) return <p className="py-8 text-center text-sm text-muted-foreground">{describeError(settings.error)}</p>;
  return (
    // a school not set up yet starts at its settings
    <Tabs defaultValue={settings.data.storeId ? "payments" : "settings"}>
      <TabsList>
        <TabsTrigger value="payments">{t("views.payments")}</TabsTrigger>
        <TabsTrigger value="settings">{t("views.settings")}</TabsTrigger>
      </TabsList>
      <TabsContent value="payments">
        <OnlinePaymentsList />
      </TabsContent>
      <TabsContent value="settings">
        <SettingsForm key={settings.dataUpdatedAt} saved={settings.data} />
      </TabsContent>
    </Tabs>
  );
}

function SettingsForm({ saved }: { saved: OnlinePaymentSettings }) {
  const t = useTranslations("school.finance.online");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const save = useSaveOnlinePayment();
  const test = useTestOnlinePayment();
  const [enabled, setEnabled] = useState(saved.enabled);
  const [sandbox, setSandbox] = useState(saved.sandbox);
  const [storeId, setStoreId] = useState(saved.storeId ?? "");
  // empty: keep the saved password
  const [password, setPassword] = useState("");
  const [charge, setCharge] = useState(saved.chargePercent === "0.00" ? "0" : saved.chargePercent);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const chargeValue = Number(charge);
  const chargeValid = /^\d+(\.\d{1,2})?$/.test(charge.trim()) && chargeValue >= 0 && chargeValue <= 5;
  const dirty =
    enabled !== saved.enabled || sandbox !== saved.sandbox || storeId.trim() !== (saved.storeId ?? "") || password !== "" || (chargeValid && chargeValue !== Number(saved.chargePercent));
  const hasStore = !!storeId.trim() && (saved.hasPassword || password.trim() !== "");

  const submit = () => {
    const found: Record<string, string> = {};
    if (!chargeValid) found.chargePercent = t("chargeInvalid");
    if (enabled && !hasStore) found.storeId = t("needStore");
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    save.mutate(
      { enabled, sandbox, storeId: storeId.trim() || null, ...(password.trim() ? { storePassword: password.trim() } : {}), chargePercent: chargeValue },
      {
        onSuccess: () => {
          setPassword("");
          toast.success(t("saved"));
        },
        onError: (e) => {
          const fields = getFieldErrors(e);
          if (Object.keys(fields).length > 0) setErrors(fields);
          else toast.error(describeError(e));
        },
      },
    );
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="flex cursor-pointer items-start justify-between gap-4 rounded-md border p-3 text-sm">
            <span>
              <span className="font-medium">{t("enabled")}</span>
              <span className="block text-xs text-muted-foreground">{t("enabledHint")}</span>
            </span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </label>

          <div className="space-y-2">
            <Label>{t("mode")}</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {[true, false].map((isSandbox) => (
                <button
                  key={String(isSandbox)}
                  type="button"
                  onClick={() => setSandbox(isSandbox)}
                  className={cn(
                    "rounded-md border p-3 text-left text-sm transition-colors",
                    sandbox === isSandbox ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted",
                  )}
                >
                  <div className="font-medium">{isSandbox ? t("sandbox") : t("live")}</div>
                  <div className="text-xs text-muted-foreground">{isSandbox ? t("sandboxHint") : t("liveHint")}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ssl-store">{t("storeId")}</Label>
              <Input id="ssl-store" value={storeId} onChange={(e) => setStoreId(e.target.value)} maxLength={80} className="font-mono" autoComplete="off" />
              {errors.storeId && <p className="text-xs text-destructive">{errors.storeId}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ssl-password">{t("storePassword")}</Label>
              <Input
                id="ssl-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={200}
                autoComplete="new-password"
                placeholder={saved.hasPassword ? t("passwordSaved") : ""}
              />
              <p className="text-xs text-muted-foreground">{saved.hasPassword ? t("passwordKeep") : t("passwordHint")}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ssl-charge">{t("charge")}</Label>
            <span className="flex items-center gap-2 text-sm">
              <Input id="ssl-charge" value={charge} onChange={(e) => setCharge(e.target.value)} inputMode="decimal" className="w-24" />%
            </span>
            {errors.chargePercent ? (
              <p className="text-xs text-destructive">{errors.chargePercent}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {chargeValid && chargeValue > 0 ? t("chargeExample", { charge: format.number((1000 * chargeValue) / 100, { maximumFractionDigits: 2 }) }) : t("chargeNone")}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={submit} disabled={!dirty || save.isPending}>
              <Save /> {save.isPending ? t("saving") : t("save")}
            </Button>
            <Button
              variant="outline"
              disabled={!saved.storeId || !saved.hasPassword || dirty || test.isPending}
              onClick={() => test.mutate(undefined, { onError: (e) => toast.error(describeError(e)) })}
            >
              <PlugZap /> {test.isPending ? t("testing") : t("test")}
            </Button>
          </div>
          {dirty && saved.storeId && <p className="text-xs text-muted-foreground">{t("saveBeforeTest")}</p>}
          {saved.lastTest && (
            <p className={cn("flex items-center gap-2 text-sm", saved.lastTest.ok ? "text-[#0a7d0a] dark:text-[#4fd14f]" : "text-destructive")}>
              {saved.lastTest.ok ? <CircleCheck className="size-4" /> : <CircleX className="size-4" />}
              {saved.lastTest.ok ? t("connected") : t("notConnected", { reason: saved.lastTest.message ?? "" })}
              <span className="text-xs text-muted-foreground">· {format.relativeTime(new Date(saved.lastTest.at), now)}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">{t("help.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{t("help.sandbox")}</p>
          <p>{t("help.live")}</p>
          <p>{t("help.money")}</p>
          <p>{t("help.server")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
