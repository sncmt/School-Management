"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Send } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { FormError } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useSendContact } from "@/lib/marketing/contact";
import { CHOOSE_PACKAGE_EVENT, PACKAGES, type Billing, type ChoosePackageDetail } from "@/lib/marketing/packages";
import { contactSchema, type ContactForm as ContactValues } from "@/zod/contact";

// the package select's value: "STANDARD_YEARLY"; this one means "not sure yet"
const NO_PACKAGE = "NONE";

const EMPTY: ContactValues = { name: "", school: "", phone: "", email: "", plan: "", message: "", website: "" };

/** The marketing contact form: a school's details and the package it likes, emailed to the platform. */
export function ContactForm() {
  const t = useTranslations("marketing.contact.form");
  const tPricing = useTranslations("marketing.pricing");
  const format = useFormatter();
  const describeError = useErrorMessage();
  const send = useSendContact();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ContactValues>({ resolver: zodResolver(contactSchema), defaultValues: EMPTY });
  const { setValue } = form;

  // a package card's button fills the package in
  useEffect(() => {
    const onChoose = (e: Event) => {
      const { id, billing } = (e as CustomEvent<ChoosePackageDetail>).detail;
      setValue("plan", `${id}_${billing}`);
    };
    window.addEventListener(CHOOSE_PACKAGE_EVENT, onChoose);
    return () => window.removeEventListener(CHOOSE_PACKAGE_EVENT, onChoose);
  }, [setValue]);

  const packageOptions = PACKAGES.flatMap((pkg) =>
    (["MONTHLY", "YEARLY"] as Billing[]).map((billing) => ({
      value: `${pkg.id}_${billing}`,
      label: t("packageOption", {
        name: tPricing(`packages.${pkg.id}.name`),
        billing: tPricing(billing === "MONTHLY" ? "monthly" : "yearly"),
        price: format.number(pkg.price[billing]),
      }),
    })),
  );

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const [pkg, billing] = values.plan ? values.plan.split("_") : [];
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
      <form onSubmit={onSubmit} className="relative grid gap-5 sm:grid-cols-2" noValidate>
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
          <p className="text-xs text-muted-foreground">{t("privacy")}</p>
          <Button
            type="submit"
            disabled={send.isPending}
            className="group h-12 w-full rounded-full bg-mk-ink px-7 text-[15px] text-white hover:bg-mk-violet sm:w-auto dark:bg-mk-amber dark:text-mk-ink dark:hover:bg-white"
          >
            {send.isPending ? t("sending") : t("send")}
            <Send className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Button>
        </div>
      </form>
    </Form>
  );
}
