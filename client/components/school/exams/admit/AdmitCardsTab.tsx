"use client";

import { Plus, Printer, Settings2, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCan } from "@/lib/auth/hooks";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useAdmitCards, useAdmitSettings, useReleaseAdmitCards, useSaveAdmitSettings } from "@/lib/school/admitCards";
import { useClasses } from "@/lib/school/classes";
import { useExams } from "@/lib/school/exams";
import { AdmitCardPrint, AdmitCardView } from "./AdmitCardView";

const ALL = "all";
// cards drawn on screen; printing takes them all
const PREVIEW = 4;

/** An exam's admit cards: by class and section, released to families, printed two a sheet. */
export function AdmitCardsTab() {
  const t = useTranslations("school.exams.admit");
  const describeError = useErrorMessage();
  const format = useFormatter();
  const name = useLocalizedName();
  const can = useCan();
  const canManage = can("exam:create");
  const exams = useExams();
  const classes = useClasses();
  const release = useReleaseAdmitCards();
  const [chosenExam, setChosenExam] = useState<string | undefined>();
  const [classId, setClassId] = useState<string>(ALL);
  const [sectionId, setSectionId] = useState<string>(ALL);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const list = exams.data?.items ?? [];
  const exam = list.find((e) => e.id === chosenExam) ?? list.at(-1);
  const examClasses = exam?.classes.map((c) => c.class).sort((a, b) => a.numericLevel - b.numericLevel) ?? [];
  const sections = classes.data?.items.find((c) => c.id === classId)?.sections.filter((s) => !s.isDefault) ?? [];
  const cards = useAdmitCards(exam?.id, {
    ...(classId !== ALL ? { classId } : {}),
    ...(classId !== ALL && sectionId !== ALL ? { sectionId } : {}),
  });

  if (exams.isPending) return <Skeleton className="h-40" />;
  if (!exam) return <p className="py-8 text-center text-sm text-muted-foreground">{t("noExams")}</p>;

  const sheet = cards.data;
  const released = !!sheet?.exam.releasedAt;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <Select
          value={exam.id}
          onValueChange={(v) => {
            setChosenExam(v);
            setClassId(ALL);
            setSectionId(ALL);
          }}
        >
          <SelectTrigger className="w-56" label={t("exam")} required>
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
        <Select
          value={classId}
          onValueChange={(v) => {
            setClassId(v);
            setSectionId(ALL);
          }}
        >
          <SelectTrigger className="w-40" label={t("class")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("allClasses")}</SelectItem>
            {examClasses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sections.length > 0 && (
          <Select value={sectionId} onValueChange={setSectionId}>
            <SelectTrigger className="w-36" label={t("section")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("allSections")}</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings2 /> {t("settings")}
            </Button>
          )}
          <Button size="sm" onClick={() => window.print()} disabled={!sheet || sheet.cards.length === 0}>
            <Printer /> {t("print")}
          </Button>
        </div>
      </div>

      {/* families see the cards in the app once released */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4">
        <div className="text-sm">
          <div className="font-medium">{released ? t("released") : t("notReleased")}</div>
          <div className="text-xs text-muted-foreground">{released ? t("releasedHint") : t("notReleasedHint")}</div>
        </div>
        {canManage && sheet && (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Switch
              checked={released}
              disabled={release.isPending}
              onCheckedChange={(v) =>
                release.mutate(
                  { examId: exam.id, released: v },
                  { onSuccess: () => toast.success(v ? t("releasedToast") : t("hiddenToast")), onError: (e) => toast.error(describeError(e)) },
                )
              }
            />
            {t("showFamilies")}
          </label>
        )}
      </div>

      {cards.isPending ? (
        <Skeleton className="h-96" />
      ) : cards.error ? (
        <p className="rounded-2xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">{describeError(cards.error)}</p>
      ) : sheet!.cards.length === 0 ? (
        <p className="rounded-2xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t("count", { cards: format.number(sheet!.cards.length), sheets: format.number(Math.ceil(sheet!.cards.length / 2)) })}
            {sheet!.cards.some((c) => !c.seat) && ` · ${t("noSeat", { count: sheet!.cards.filter((c) => !c.seat).length })}`}
            {` · ${t("printHint")}`}
          </p>
          <div className="space-y-4 overflow-x-auto rounded-md bg-muted/40 p-3">
            {sheet!.cards.slice(0, PREVIEW).map((card) => (
              <AdmitCardView key={card.enrollmentId} sheet={sheet!} card={card} />
            ))}
            {sheet!.cards.length > PREVIEW && <p className="text-center text-xs text-muted-foreground">{t("more", { count: sheet!.cards.length - PREVIEW })}</p>}
          </div>
          <AdmitCardPrint sheet={sheet!} />
        </>
      )}

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

/** The rules and signature lines printed on every admit card. */
function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("school.exams.admit.settingsDialog");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {open && <SettingsForm onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function SettingsForm({ onDone }: { onDone: () => void }) {
  const describeError = useErrorMessage();
  const settings = useAdmitSettings();
  if (settings.isPending) return <Skeleton className="h-48" />;
  if (settings.error) return <p className="text-sm text-muted-foreground">{describeError(settings.error)}</p>;
  return <SettingsFields key={settings.dataUpdatedAt} initial={settings.data} onDone={onDone} />;
}

function SettingsFields({ initial, onDone }: { initial: { rules: string; signatures: string[] }; onDone: () => void }) {
  const t = useTranslations("school.exams.admit.settingsDialog");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const save = useSaveAdmitSettings();
  const [rules, setRules] = useState(initial.rules);
  const [signatures, setSignatures] = useState(initial.signatures);
  const blank = signatures.some((s) => !s.trim());

  const submit = () =>
    save.mutate(
      { rules, signatures: signatures.map((s) => s.trim()) },
      {
        onSuccess: () => {
          toast.success(t("saved"));
          onDone();
        },
        onError: (e) => toast.error(describeError(e)),
      },
    );

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="admit-rules">{t("rules")}</Label>
        <Textarea id="admit-rules" rows={6} value={rules} onChange={(e) => setRules(e.target.value)} maxLength={1500} />
        <p className="text-xs text-muted-foreground">{t("rulesHint")}</p>
      </div>
      <div className="space-y-1.5">
        <Label>{t("signatures")}</Label>
        {signatures.map((s, i) => (
          <div key={i} className="flex gap-2">
            <Input value={s} maxLength={40} onChange={(e) => setSignatures((list) => list.map((x, j) => (j === i ? e.target.value : x)))} aria-label={t("signatureN", { n: i + 1 })} />
            <Button variant="ghost" size="icon" onClick={() => setSignatures((list) => list.filter((_, j) => j !== i))} aria-label={t("removeSignature")}>
              <Trash2 />
            </Button>
          </div>
        ))}
        {signatures.length < 3 && (
          <Button variant="outline" size="sm" onClick={() => setSignatures((list) => [...list, ""])}>
            <Plus /> {t("addSignature")}
          </Button>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone} disabled={save.isPending}>
          {tCommon("cancel")}
        </Button>
        <Button onClick={submit} disabled={save.isPending || blank}>
          {save.isPending ? t("saving") : t("save")}
        </Button>
      </DialogFooter>
    </div>
  );
}
