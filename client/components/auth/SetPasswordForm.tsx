"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { useSendPasswordCode, useSetUserPassword } from "@/lib/auth/hooks";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { setUserPasswordSchema, type SetUserPasswordInput, type SetUserPasswordValues } from "@/zod/auth";
import { FormError } from "./AuthCard";
import { PasswordInput } from "./PasswordInput";

const RESEND_SECONDS = 60;

/**
 * The school super admin setting an account's password (their own too): the new password,
 * and a 6-digit code sent to the super admin's email to confirm it.
 */
export function SetPasswordForm({
  userId,
  onDone,
  onCancel,
}: {
  userId: string;
  onDone: (result: { self: boolean }) => void;
  onCancel?: () => void;
}) {
  const t = useTranslations("auth.setPassword");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const sendCode = useSendPasswordCode();
  const setPassword = useSetUserPassword();
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  // seconds until another code may be asked for
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const form = useForm<SetUserPasswordInput, unknown, SetUserPasswordValues>({
    resolver: zodResolver(setUserPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "", code: "" },
  });

  const askForCode = () => {
    setFormError(null);
    sendCode.mutate(userId, {
      onSuccess: (r) => {
        setSentTo(r.sentTo);
        setWait(RESEND_SECONDS);
        toast.success(t("codeSent", { email: r.sentTo }));
      },
      onError: (e) => setFormError(describeError(e)),
    });
  };

  const onSubmit = form.handleSubmit(async ({ newPassword, code }) => {
    setFormError(null);
    try {
      const result = await setPassword.mutateAsync({ userId, newPassword, code });
      onDone(result);
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, ["newPassword", "code"], describeError));
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />

        {(["newPassword", "confirmPassword"] as const).map((name) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t(name)}</FormLabel>
                <FormControl>
                  <PasswordInput autoComplete="new-password" {...field} />
                </FormControl>
                {name === "newPassword" && <FormDescription>{t("newHint")}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {sentTo ? (
                <span className="flex items-center gap-1.5 text-foreground">
                  <MailCheck className="size-4 text-emerald-600" /> {t("sentTo", { email: sentTo })}
                </span>
              ) : (
                t("codeHint")
              )}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={askForCode} disabled={sendCode.isPending || wait > 0}>
              <Send />
              {sendCode.isPending ? t("sending") : wait > 0 ? t("resendIn", { seconds: wait }) : sentTo ? t("resend") : t("sendCode")}
            </Button>
          </div>
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel required>{t("code")}</FormLabel>
                <FormControl>
                  <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="w-32 tracking-widest" disabled={!sentTo} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={setPassword.isPending}>
              {tCommon("cancel")}
            </Button>
          )}
          <Button type="submit" disabled={!sentTo || setPassword.isPending}>
            {setPassword.isPending ? t("saving") : t("submit")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
