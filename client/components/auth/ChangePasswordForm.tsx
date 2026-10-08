"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import type { SessionType } from "@/lib/tenant";
import { changePasswordSchema, type ChangePasswordInput } from "@/zod/auth";
import { AuthCard, FormError } from "./AuthCard";
import { PasswordInput } from "./PasswordInput";

const FIELDS = [
  { name: "currentPassword", label: "Current password", autoComplete: "current-password" },
  { name: "newPassword", label: "New password", autoComplete: "new-password" },
  { name: "confirmPassword", label: "Confirm new password", autoComplete: "new-password" },
] as const;

export function ChangePasswordForm({ session }: { session: SessionType }) {
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
      toast.success("Password changed. Other devices have been logged out.");
      router.replace(safeNextPath(searchParams.get("next"), session));
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, ["currentPassword", "newPassword"]));
    }
  });

  return (
    <AuthCard
      title={isForced ? "Set a new password" : "Change password"}
      description={
        isForced
          ? "You're using a temporary password. Choose your own to continue."
          : "This logs you out on every other device."
      }
      footer={
        isForced ? (
          <button className="underline underline-offset-4" onClick={() => logout.mutate({})}>
            Log out instead
          </button>
        ) : (
          <button className="underline underline-offset-4" onClick={() => router.back()}>
            Cancel
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
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <PasswordInput autoComplete={autoComplete} {...field} />
                  </FormControl>
                  {name === "newPassword" && <FormDescription>8 to 72 characters.</FormDescription>}
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
            {changePassword.isPending ? "Saving…" : "Change password"}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}
