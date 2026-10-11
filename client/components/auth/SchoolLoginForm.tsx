"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { useSchoolLogin } from "@/lib/auth/hooks";
import { afterLoginPath } from "@/lib/auth/routes";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { schoolLoginSchema, type SchoolLoginInput, type SchoolLoginValues } from "@/zod/auth";
import { FormError } from "./AuthCard";
import { PasswordInput } from "./PasswordInput";

export function SchoolLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const describeError = useErrorMessage();
  const login = useSchoolLogin();
  const [formError, setFormError] = useState<string | null>(null);
  // kept as a flag, not text, so it follows a language switch
  const [sessionEnded, setSessionEnded] = useState(searchParams.get("reason") === "expired");

  // the schema turns Bangla digits into ASCII, so input and output types differ
  const form = useForm<SchoolLoginInput, unknown, SchoolLoginValues>({
    resolver: zodResolver(schoolLoginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    console.log(values);
    setFormError(null);
    setSessionEnded(false);
    try {
      const { user } = await login.mutateAsync(values);
      router.replace(afterLoginPath("SCHOOL", user.mustChangePassword, searchParams.get("next")));
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, ["identifier", "password"], describeError));
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError ?? (sessionEnded ? t("sessionEnded") : null)} />

        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t("emailOrPhone")}</FormLabel>
              <FormControl>
                <Input autoComplete="username" autoFocus {...field} />
              </FormControl>
              <FormDescription>{t("emailOrPhoneHint")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t("password")}</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={login.isPending || login.isSuccess}>
          {login.isPending ? t("loggingIn") : t("logIn")}
        </Button>
      </form>
    </Form>
  );
}
