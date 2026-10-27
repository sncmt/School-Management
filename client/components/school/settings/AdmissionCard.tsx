"use client";

import { GraduationCap, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { MAX_ADMISSION_ROWS, useAdmission, useSaveAdmission } from "@/lib/school/settings";
import type { Admission } from "@/lib/site";

// what the form holds: the amounts as typed, turned into numbers on save
type Draft = {
  requirements: string[];
  dates: { label: string; value: string }[];
  fees: { label: string; amount: string }[];
};

const toDraft = (a: Admission): Draft => ({
  requirements: a.requirements,
  dates: a.dates,
  fees: a.fees.map((f) => ({ label: f.label, amount: String(f.amount) })),
});

/** The public homepage's admission section: requirements, dates and fees. Empty lists are left out there. */
export function AdmissionCard() {
  const t = useTranslations("school.settings.admission");
  const describeError = useErrorMessage();
  const admission = useAdmission();

  return (
    <section className="rounded-2xl border border-border/70 bg-card">
      <header className="flex items-center gap-3 border-b px-5 py-4">
        <span className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-brand">
          <GraduationCap className="size-4" />
        </span>
        <div>
          <h2 className="font-semibold">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{t("hint")}</p>
        </div>
      </header>
      <div className="p-5">
        {admission.isPending ? (
          <Skeleton className="h-48 w-full" />
        ) : admission.isError ? (
          <p className="text-sm text-muted-foreground">{describeError(admission.error)}</p>
        ) : (
          // keyed by the saved data, so a save (or another tab's) starts the form afresh
          <AdmissionForm key={JSON.stringify(admission.data)} saved={admission.data} />
        )}
      </div>
    </section>
  );
}

function AdmissionForm({ saved }: { saved: Admission }) {
  const t = useTranslations("school.settings.admission");
  const describeError = useErrorMessage();
  const save = useSaveAdmission();
  const [draft, setDraft] = useState<Draft>(() => toDraft(saved));
  const changed = JSON.stringify(draft) !== JSON.stringify(toDraft(saved));

  const set = <K extends keyof Draft>(key: K, rows: Draft[K]) => setDraft((d) => ({ ...d, [key]: rows }));

  const submit = () => {
    // rows left wholly blank are dropped; half-filled ones go to the server, which names the problem
    const fees = draft.fees.filter((f) => f.label.trim() || f.amount.trim());
    if (fees.some((f) => !/^\d+$/.test(f.amount.trim()))) {
      toast.error(t("badAmount"));
      return;
    }
    save.mutate(
      {
        requirements: draft.requirements.map((r) => r.trim()).filter(Boolean),
        dates: draft.dates.filter((d) => d.label.trim() || d.value.trim()),
        fees: fees.map((f) => ({ label: f.label, amount: Number(f.amount.trim()) })),
      },
      { onSuccess: () => toast.success(t("saved")), onError: (e) => toast.error(describeError(e)) },
    );
  };

  return (
    <div className="space-y-7">
      <ListEditor
        title={t("requirements")}
        addLabel={t("addRequirement")}
        rows={draft.requirements}
        onChange={(rows) => set("requirements", rows)}
        blank=""
        render={(row, update) => (
          <Input value={row} onChange={(e) => update(e.target.value)} placeholder={t("requirementPlaceholder")} maxLength={200} />
        )}
      />
      <ListEditor
        title={t("dates")}
        addLabel={t("addDate")}
        rows={draft.dates}
        onChange={(rows) => set("dates", rows)}
        blank={{ label: "", value: "" }}
        render={(row, update) => (
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <Input value={row.label} onChange={(e) => update({ ...row, label: e.target.value })} placeholder={t("dateLabelPlaceholder")} maxLength={100} />
            <Input value={row.value} onChange={(e) => update({ ...row, value: e.target.value })} placeholder={t("dateValuePlaceholder")} maxLength={100} />
          </div>
        )}
      />
      <ListEditor
        title={t("fees")}
        addLabel={t("addFee")}
        rows={draft.fees}
        onChange={(rows) => set("fees", rows)}
        blank={{ label: "", amount: "" }}
        render={(row, update) => (
          <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_10rem]">
            <Input value={row.label} onChange={(e) => update({ ...row, label: e.target.value })} placeholder={t("feeLabelPlaceholder")} maxLength={100} />
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">৳</span>
              <Input
                value={row.amount}
                onChange={(e) => update({ ...row, amount: e.target.value })}
                inputMode="numeric"
                placeholder="0"
                aria-label={t("amount")}
                className="pl-7 tabular-nums"
              />
            </div>
          </div>
        )}
      />

      <p className="text-xs text-muted-foreground">{t("note")}</p>
      <div className="flex justify-end gap-2">
        {changed && (
          <Button variant="ghost" onClick={() => setDraft(toDraft(saved))} disabled={save.isPending}>
            {t("undo")}
          </Button>
        )}
        <Button onClick={submit} disabled={!changed || save.isPending}>
          {save.isPending ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}

/* One list of the section: its rows (each with a remove button) and a button to add one. */
function ListEditor<T>({
  title,
  addLabel,
  rows,
  onChange,
  blank,
  render,
}: {
  title: string;
  addLabel: string;
  rows: T[];
  onChange: (rows: T[]) => void;
  blank: T;
  render: (row: T, update: (row: T) => void) => React.ReactNode;
}) {
  const t = useTranslations("school.settings.admission");
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {rows.length === 0 && <p className="text-xs text-muted-foreground">{t("emptyList")}</p>}
      <ul className="space-y-2">
        {rows.map((row, i) => (
          <li key={i} className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1">{render(row, (next) => onChange(rows.map((r, j) => (j === i ? next : r))))}</div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
              aria-label={t("removeRow")}
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <X />
            </Button>
          </li>
        ))}
      </ul>
      <Button variant="outline" size="sm" onClick={() => onChange([...rows, blank])} disabled={rows.length >= MAX_ADMISSION_ROWS}>
        <Plus /> {addLabel}
      </Button>
    </div>
  );
}
