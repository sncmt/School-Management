"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FormError } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { withSign } from "@/lib/i18n/currency";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useSendContact } from "@/lib/marketing/contact";
import { CUSTOM_PACKAGE, packageChoice, priceOf, type Billing, type PublicPackage } from "@/lib/marketing/packages";
import { contactSchema, type ContactForm as ContactValues } from "@/zod/contact";

// the package select's value: packageChoice(), "STANDARD:YEARLY"; this one means "not sure yet"
const NO_PACKAGE = "NONE";

const EMPTY: ContactValues = { name: "", school: "", phone: "", email: "", plan: "", message: "", website: "" };

/**
 * The marketing contact form: an institution's details and the package it likes, emailed to the
 * platform. `plan` is the package chosen on the packages section (the contact page's link), if any.
 */
export function ContactForm({ packages, plan = "" }: { packages: PublicPackage[]; plan?: string }) {
  const t = useTranslations("marketing.contact.form");
  const tPricing = useTranslations("marketing.pricing");
  const format = useFormatter();
  const locale = useLocale();
  const describeError = useErrorMessage();
  const send = useSendContact();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ContactValues>({ resolver: zodResolver(contactSchema), defaultValues: { ...EMPTY, plan } });

  const packageOptions = [
    ...packages.flatMap((pkg) =>
      (["MONTHLY", "YEARLY"] as Billing[]).map((billing) => ({
        value: packageChoice(pkg.code, billing),
        label: t("packageOption", {
          name: pkg.name,
          billing: tPricing(billing === "MONTHLY" ? "monthly" : "yearly"),
          price: withSign(locale, format.number(priceOf(pkg, billing))),
        }),
      })),
    ),
    // Custom: its price is agreed with each institution
    { value: packageChoice(CUSTOM_PACKAGE.code), label: t("customOption") },
  ];

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const [pkg, billing] = values.plan ? values.plan.split(":") : [];
    try {
      await send.mutateAsync({
        name: values.name,
        school: values.school,
        phone: values.phone,
        email: values.email || undefined,
        package: pkg,
        billing,
        message: values.message || undefined,
        website: values.website || undefined,
      });
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, ["name", "school", "phone", "email", "message"], describeError));
    }
  });

  if (send.isSuccess) {
    return (
      <div className="animate-in fade-in zoom-in-95 flex h-full flex-col items-center justify-center gap-4 py-16 text-center duration-500">
        <span className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-8" />
        </span>
        <h3 className="text-xl font-bold">{t("sentTitle")}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{t("sentBody")}</p>
        <Button
          variant="outline"
          className="mt-2 rounded-full"
          onClick={() => {
            form.reset(EMPTY);
            send.reset();
          }}
        >
          {t("another")}
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="relative grid grid-cols-1 gap-5 sm:grid-cols-2" noValidate>
        {formError && (
          <div className="sm:col-span-2">
            <FormError message={formError} />
          </div>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t("name")}</FormLabel>
              <FormControl>
                <Input autoComplete="name" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="school"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t("school")}</FormLabel>
              <FormControl>
                <Input autoComplete="organization" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel required>{t("phone")}</FormLabel>
              <FormControl>
                <Input type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("email")}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" className="h-11" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="plan"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>{t("package")}</FormLabel>
              <Select value={field.value || NO_PACKAGE} onValueChange={(v) => field.onChange(v === NO_PACKAGE ? "" : v)}>
                <FormControl>
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_PACKAGE}>{t("notSure")}</SelectItem>
                  {packageOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>{t("message")}</FormLabel>
              <FormControl>
                <Textarea rows={4} placeholder={t("messagePlaceholder")} className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* a trap for bots: people never see or reach it */}
        <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
          <label>
            Website
            <input tabIndex={-1} autoComplete="off" {...form.register("website")} />
          </label>
        </div>

        <div className="flex flex-col-reverse items-center gap-4 sm:col-span-2 sm:flex-row sm:justify-between">
          <p className="text-sm text-hp-quiet">{t("privacy")}</p>
          <Button
            type="submit"
            disabled={send.isPending}
            className="h-12 w-full rounded-xl bg-hp-brand px-7 text-base font-semibold text-white hover:bg-hp-brand-ink sm:w-auto"
          >
            {send.isPending ? t("sending") : t("send")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
