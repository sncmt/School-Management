"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { smsParts, useUpdateSmsTemplate, type SmsLanguage, type SmsTemplate } from "@/lib/school/sms";
import { cn } from "@/lib/utils";

/** Edits an automatic SMS's wording in Bangla and English; an emptied or reset text goes back to the default. */
export function SmsTemplateDialog({ template, language, onClose }: { template: SmsTemplate | null; language: SmsLanguage; onClose: () => void }) {
  const t = useTranslations("school.sms");
  const describeError = useErrorMessage();
  const update = useUpdateSmsTemplate();
  const [tab, setTab] = useState<SmsLanguage>(language);
  const [texts, setTexts] = useState<Record<SmsLanguage, string>>({ BN: "", EN: "" });
  const area = useRef<HTMLTextAreaElement>(null);

  // a fresh copy each time a template is opened
  useEffect(() => {
    if (template) {
      setTexts({ BN: template.bodyBn, EN: template.bodyEn });
      setTab(language);
    }
  }, [template, language]);

  if (!template) return null;

  const text = texts[tab];
  const { parts, length, unicode } = smsParts(text);
  const unknown = [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((p) => !template.placeholders.includes(p));
  const setText = (value: string) => setTexts((all) => ({ ...all, [tab]: value }));
  // the server names each event's placeholders; every one of them has a label here
  const label = (name: string) => t(`placeholders.${name}` as "placeholders.student");

  // puts {name} where the cursor is
  const insert = (name: string) => {
    const el = area.current;
    const token = `{${name}}`;
    if (!el) return setText(text + token);
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    setText(text.slice(0, start) + token + text.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  // only what changed is sent; the default text is saved as "no wording of our own"
  const bodyFor = (lang: SmsLanguage) => {
    const value = texts[lang].trim();
    const before = lang === "BN" ? template.bodyBn : template.bodyEn;
    if (value === before.trim()) return undefined;
    return value === "" || value === template.defaults[lang] ? null : value;
  };

  const save = () => {
    const body = { bodyBn: bodyFor("BN"), bodyEn: bodyFor("EN") };
    if (body.bodyBn === undefined && body.bodyEn === undefined) return onClose();
    update.mutate(
      { event: template.event, body },
      {
        onSuccess: () => {
          toast.success(t("template.saved"));
          onClose();
        },
        onError: (e) => toast.error(describeError(e)),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t(`events.${template.event}.title`)}</DialogTitle>
          <DialogDescription>{t(`events.${template.event}.when`)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Tabs value={tab} onValueChange={(v) => setTab(v as SmsLanguage)}>
              <TabsList variant="chip">
                <TabsTrigger value="BN">{t("languages.BN")}</TabsTrigger>
                <TabsTrigger value="EN">{t("languages.EN")}</TabsTrigger>
              </TabsList>
            </Tabs>
            {text !== template.defaults[tab] && (
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setText(template.defaults[tab])}>
                <RotateCcw className="size-3.5" /> {t("template.reset")}
              </Button>
            )}
          </div>

          <Textarea
            ref={area}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            maxLength={1000}
            lang={tab === "BN" ? "bn" : "en"}
            aria-label={t("template.text")}
            aria-invalid={unknown.length > 0 || undefined}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className={cn("text-muted-foreground", parts > 2 && "font-medium text-amber-700 dark:text-amber-400")}>
              {t("template.length", { length, count: parts })}
              {unicode && ` · ${t("template.unicode")}`}
            </span>
            {unknown.length > 0 && (
              <span className="font-medium text-destructive">{t("template.unknown", { names: unknown.map((u) => `{${u}}`).join(", ") })}</span>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{t("template.placeholders")}</p>
            <div className="flex flex-wrap gap-1.5">
              {template.placeholders.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => insert(name)}
                  className="rounded-full bg-navy-soft px-2.5 py-1 text-xs text-navy ring-1 ring-navy/10 ring-inset hover:bg-navy/10"
                  title={label(name)}
                >
                  {`{${name}}`} <span className="text-navy/70">· {label(name)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button onClick={save} disabled={update.isPending || unknown.length > 0}>
            {t("template.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
