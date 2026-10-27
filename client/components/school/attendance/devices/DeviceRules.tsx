"use client";

import { Save } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useDeviceRules, useSaveDeviceRules, type DeviceRules } from "@/lib/school/attendanceDevices";

/** How punches become attendance: late after, absent at, the teachers' hours, the leaving gap. */
export function DeviceRulesForm() {
  const describeError = useErrorMessage();
  const rules = useDeviceRules();
  if (rules.isPending) return <Skeleton className="h-72" />;
  if (rules.error) return <p className="py-8 text-center text-sm text-muted-foreground">{describeError(rules.error)}</p>;
  return <RulesForm key={rules.dataUpdatedAt} saved={rules.data} />;
}

function RulesForm({ saved }: { saved: DeviceRules }) {
  const t = useTranslations("school.attendance.devices.rules");
  const describeError = useErrorMessage();
  const save = useSaveDeviceRules();
  const [r, setR] = useState(saved);
  const set = <K extends keyof DeviceRules>(k: K, v: DeviceRules[K]) => setR((x) => ({ ...x, [k]: v }));
  const dirty = JSON.stringify(r) !== JSON.stringify(saved);
  const num = (v: string) => (/^\d{1,3}$/.test(v) ? Number(v) : 0);

  return (
    <div className="space-y-4">
      <Section title={t("students")}>
        <Field label={t("lateAfter")} hint={t("lateAfterHint")}>
          <MinutesInput value={r.lateAfterMinutes} onChange={(v) => set("lateAfterMinutes", num(v))} />
        </Field>
        <AbsentField label={t("studentAbsent")} hint={t("studentAbsentHint")} value={r.studentAbsentAt} fallback="10:00" onChange={(v) => set("studentAbsentAt", v)} />
      </Section>

      <Section title={t("teachers")}>
        <Field label={t("teacherStart")}>
          <Input type="time" value={r.teacherStartTime} onChange={(e) => set("teacherStartTime", e.target.value)} className="w-32" />
        </Field>
        <Field label={t("lateAfter")} hint={t("teacherLateHint")}>
          <MinutesInput value={r.teacherLateAfterMinutes} onChange={(v) => set("teacherLateAfterMinutes", num(v))} />
        </Field>
        <AbsentField label={t("teacherAbsent")} hint={t("teacherAbsentHint")} value={r.teacherAbsentAt} fallback="10:30" onChange={(v) => set("teacherAbsentAt", v)} />
      </Section>

      <Section title={t("leaving")}>
        <Field label={t("gap")} hint={t("gapHint")}>
          <MinutesInput value={r.checkoutGapMinutes} onChange={(v) => set("checkoutGapMinutes", Math.max(5, num(v)))} />
        </Field>
      </Section>

      <p className="text-sm text-muted-foreground">
        {t.rich("smsNote", { link: (chunks) => <Link href="/sms" className="font-medium text-foreground underline underline-offset-2">{chunks}</Link> })}
      </p>

      <div className="flex gap-2">
        <Button
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate(r, { onSuccess: () => toast.success(t("saved")), onError: (e) => toast.error(describeError(e)) })}
        >
          <Save /> {save.isPending ? t("saving") : t("save")}
        </Button>
        <Button variant="outline" disabled={!dirty || save.isPending} onClick={() => setR(saved)}>
          {t("undo")}
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-x-6 gap-y-1 sm:grid-cols-[14rem_1fr] sm:items-center">
      <Label>{label}</Label>
      <div>
        {children}
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function MinutesInput({ value, onChange }: { value: number; onChange: (v: string) => void }) {
  const t = useTranslations("school.attendance.devices.rules");
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <Input value={String(value)} onChange={(e) => onChange(e.target.value)} inputMode="numeric" className="w-20" />
      {t("minutes")}
    </span>
  );
}

/* A cutoff time, or off. */
function AbsentField({ label, hint, value, fallback, onChange }: { label: string; hint: string; value: string | null; fallback: string; onChange: (v: string | null) => void }) {
  const t = useTranslations("school.attendance.devices.rules");
  return (
    <Field label={label} hint={hint}>
      <span className="inline-flex flex-wrap items-center gap-3 text-sm">
        <Switch checked={value !== null} onCheckedChange={(on) => onChange(on ? fallback : null)} aria-label={label} />
        {value !== null ? (
          <Input type="time" value={value} onChange={(e) => onChange(e.target.value || fallback)} className="w-32" />
        ) : (
          <span className="text-muted-foreground">{t("off")}</span>
        )}
      </span>
    </Field>
  );
}
