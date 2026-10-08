"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { useChangePassword, useLogout, useMe } from "@/lib/auth/hooks";
import { safeNextPath } from "@/lib/auth/routes";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import type { SessionType } from "@/lib/tenant";
import { changePasswordSchema, type ChangePasswordInput } from "@/zod/auth";
import { AuthCard, FormError } from "./AuthCard";
import { PasswordInput } from "./PasswordInput";

const FIELDS = [
  { name: "currentPassword", label: "current", autoComplete: "current-password" },
  { name: "newPassword", label: "new", autoComplete: "new-password" },
  { name: "confirmPassword", label: "confirm", autoComplete: "new-password" },
] as const;

export function ChangePasswordForm({ session }: { session: SessionType }) {
  const t = useTranslations("auth.changePassword");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: me } = useMe();
  const changePassword = useChangePassword();
  const logout = useLogout(session);
  const [formError, setFormError] = useState<string | null>(null);

  const isForced = !!me?.user.mustChangePassword;

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = form.handleSubmit(async ({ currentPassword, newPassword }) => {
    setFormError(null);
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      toast.success(t("success"));
      router.replace(safeNextPath(searchParams.get("next"), session));
    } catch (error) {
      setFormError(
        applyServerErrors(error, form.setError, ["currentPassword", "newPassword"], describeError),
      );
    }
  });

  return (
    <AuthCard
      title={isForced ? t("titleForced") : t("title")}
      description={isForced ? t("descriptionForced") : t("description")}
      footer={
        isForced ? (
          <button className="underline underline-offset-4" onClick={() => logout.mutate({})}>
            {t("logOutInstead")}
          </button>
        ) : (
          <button className="underline underline-offset-4" onClick={() => router.back()}>
            {tCommon("cancel")}
          </button>
        )
      }
    >
      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormError message={formError} />

          {FIELDS.map(({ name, label, autoComplete }) => (
            <FormField
              key={name}
              control={form.control}
              name={name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(label)}</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete={autoComplete} {...field} />
                  </FormControl>
                  {name === "newPassword" && <FormDescription>{t("newHint")}</FormDescription>}
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}

          <Button
            type="submit"
            className="w-full"
            disabled={changePassword.isPending || changePassword.isSuccess}
          >
            {changePassword.isPending ? t("saving") : t("submit")}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}
