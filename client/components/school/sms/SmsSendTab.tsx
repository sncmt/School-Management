"use client";

import { Send, Users } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useClasses } from "@/lib/school/classes";
import { smsParts, useSendSms, useSmsRecipients, type SmsSettings } from "@/lib/school/sms";

const ALL = "ALL";

/** An SMS by hand to the guardians of the whole school, a class or a section (one per phone). */
export function SmsSendTab({ settings }: { settings: SmsSettings | undefined }) {
  const t = useTranslations("school.sms.send");
  const tSms = useTranslations("school.sms");
  const format = useFormatter();
  const describeError = useErrorMessage();
  const classes = useClasses();
  const [classId, setClassId] = useState<string | undefined>();
  const [sectionId, setSectionId] = useState<string | undefined>();
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const send = useSendSms();

  const target = { classId, sectionId };
  const recipients = useSmsRecipients(target);
  const sections = classes.data?.items.find((c) => c.id === classId)?.sections.filter((s) => !s.isDefault) ?? [];
  const { parts, length, unicode } = smsParts(message.trim());
  const phones = recipients.data?.phones ?? 0;
  const off = settings ? !settings.isActive : false;

  const submit = () =>
    send.mutate(
      { ...target, message: message.trim() },
      {
        onSuccess: (r) => {
          toast.success(t("queued", { count: r.queued }));
          setMessage("");
          setConfirming(false);
        },
        onError: (e) => {
          toast.error(describeError(e));
          setConfirming(false);
        },
      },
    );

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <section className="space-y-5 rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sms-class">{t("to")}</Label>
            <Select
              value={classId ?? ALL}
              onValueChange={(v) => {
                setClassId(v === ALL ? undefined : v);
                setSectionId(undefined);
              }}
            >
              <SelectTrigger id="sms-class" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("wholeSchool")}</SelectItem>
                {classes.data?.items.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {sections.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="sms-section">{t("section")}</Label>
              <Select value={sectionId ?? ALL} onValueChange={(v) => setSectionId(v === ALL ? undefined : v)}>
                <SelectTrigger id="sms-section" className="w-full">
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
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sms-message">{t("message")}</Label>
          <Textarea id="sms-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={6} maxLength={1000} placeholder={t("placeholder")} />
          <p className="text-xs text-muted-foreground">
            {tSms("template.length", { length, count: parts })}
            {unicode && ` · ${tSms("template.unicode")}`}
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setConfirming(true)} disabled={off || !message.trim() || phones === 0 || send.isPending}>
            <Send /> {t("send")}
          </Button>
        </div>
        {off && <p className="text-right text-xs text-amber-700 dark:text-amber-400">{t("offHint")}</p>}
      </section>

      <aside className="h-fit space-y-3 rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
        <div className="flex items-center gap-2 font-semibold">
          <Users className="size-4 text-brand dark:text-sidebar-primary" /> {t("summary")}
        </div>
        {recipients.isPending ? (
          <p className="text-sm text-muted-foreground">…</p>
        ) : recipients.isError ? (
          <p className="text-sm text-muted-foreground">{describeError(recipients.error)}</p>
        ) : (
          <dl className="space-y-2 text-sm">
            <Row label={t("phones")} value={format.number(phones)} strong />
            <Row label={t("students")} value={format.number(recipients.data.students)} />
            {recipients.data.withoutPhone > 0 && <Row label={t("withoutPhone")} value={format.number(recipients.data.withoutPhone)} />}
            <div className="border-t pt-2">
              <Row label={t("totalSms")} value={format.number(phones * parts)} strong />
            </div>
          </dl>
        )}
        <p className="text-xs text-muted-foreground">{t("siblingsNote")}</p>
      </aside>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmText", { phones: format.number(phones), total: format.number(phones * parts) })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={send.isPending}>{tSms("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                submit();
              }}
              disabled={send.isPending}
            >
              {t("send")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-semibold tabular-nums" : "tabular-nums"}>{value}</dd>
    </div>
  );
}
