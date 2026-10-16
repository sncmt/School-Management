"use client";

import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useFinanceSettings, useSaveFinanceSettings, type MidYearFeeRule } from "@/lib/school/finance";
import { cn } from "@/lib/utils";
import { ListState } from "./shared";

const RULES: MidYearFeeRule[] = ["FROM_ADMISSION", "WHOLE_YEAR"];

/** The school's finance rules. */
export function FinanceSettingsTab({ canManage }: { canManage: boolean }) {
  const settings = useFinanceSettings();
  return (
    <ListState isPending={settings.isPending} error={settings.error} onRetry={() => settings.refetch()} empty={null}>
      {settings.data && <SettingsForm key={settings.dataUpdatedAt} saved={settings.data.midYearMonthlyFees} canManage={canManage} />}
    </ListState>
  );
}

function SettingsForm({ saved, canManage }: { saved: MidYearFeeRule; canManage: boolean }) {
  const t = useTranslations("school.finance.settings");
  const describeError = useErrorMessage();
  const save = useSaveFinanceSettings();
  const [rule, setRule] = useState(saved);

  const submit = () =>
    save.mutate(
      { midYearMonthlyFees: rule },
      { onSuccess: () => toast.success(t("saved")), onError: (e) => toast.error(describeError(e)) },
    );

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-base">{t("midYear")}</CardTitle>
        <CardDescription>{t("midYearDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          {RULES.map((r) => (
            <button
              key={r}
              type="button"
              disabled={!canManage}
              onClick={() => setRule(r)}
              className={cn(
                "rounded-md border p-3 text-left text-sm transition-colors disabled:cursor-default",
                rule === r ? "border-primary bg-primary/5 ring-1 ring-primary" : "cursor-pointer hover:bg-muted",
              )}
            >
              <div className="font-medium">{t(`rules.${r}`)}</div>
              <div className="text-xs text-muted-foreground">{t(`ruleHints.${r}`)}</div>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{t("appliesFromNow")}</p>
        {canManage && (
          <Button onClick={submit} disabled={rule === saved || save.isPending}>
            <Save /> {save.isPending ? t("saving") : t("save")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
