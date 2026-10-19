"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useExams } from "@/lib/school/exams";
import { useSeatPlan } from "@/lib/school/seatPlan";
import { PlanSetup } from "./PlanSetup";
import { PlanView } from "./PlanView";

/** Choose an exam, then make its seat plan or work on it. */
export function SeatPlanTab({ canManage }: { canManage: boolean }) {
  const t = useTranslations("school.exams.seating");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const exams = useExams();
  const [chosen, setChosen] = useState<string | undefined>();
  // setting the plan up again over an existing one
  const [settingUp, setSettingUp] = useState(false);

  const list = exams.data?.items ?? [];
  // the latest exam first by default
  const examId = chosen ?? list.at(-1)?.id;
  const plan = useSeatPlan(examId);

  if (exams.isPending) return <Skeleton className="h-40" />;
  if (list.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">{t("noExams")}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{t("exam")}</span>
        <Select
          value={examId}
          onValueChange={(v) => {
            setChosen(v);
            setSettingUp(false);
          }}
        >
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {list.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {name(e)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {plan.isPending ? (
        <Skeleton className="h-64" />
      ) : plan.error ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{describeError(plan.error)}</p>
      ) : !plan.data.plan || settingUp ? (
        canManage ? (
          <PlanSetup
            key={`${plan.data.exam.id}:${plan.data.plan?.updatedAt ?? "new"}`}
            view={plan.data}
            onDone={() => setSettingUp(false)}
            onCancel={plan.data.plan ? () => setSettingUp(false) : undefined}
          />
        ) : (
          <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{t("noPlan")}</p>
        )
      ) : (
        <PlanView view={plan.data} canManage={canManage} onSetup={() => setSettingUp(true)} />
      )}
    </div>
  );
}
