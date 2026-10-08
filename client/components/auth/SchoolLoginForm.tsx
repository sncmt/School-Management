"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { schoolLoginSchema, type SchoolLoginInput } from "@/zod/auth";
import { FormError } from "./AuthCard";
import { PasswordInput } from "./PasswordInput";

export function SchoolLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useSchoolLogin();
  const [formError, setFormError] = useState<string | null>(
    searchParams.get("reason") === "expired" ? "Your session has ended. Please log in again." : null,
  );

  const form = useForm<SchoolLoginInput>({
    resolver: zodResolver(schoolLoginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    console.log(values);
    setFormError(null);
    try {
      const { user } = await login.mutateAsync(values);
      router.replace(afterLoginPath("SCHOOL", user.mustChangePassword, searchParams.get("next")));
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, ["identifier", "password"]));
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />

        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email or mobile number</FormLabel>
              <FormControl>
                <Input autoComplete="username" autoFocus {...field} />
              </FormControl>
              <FormDescription>Admins use the school email. Everyone else uses their mobile number.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={login.isPending || login.isSuccess}>
          {login.isPending ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </Form>
  );
}
