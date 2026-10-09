"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useForm, type FieldPath, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useCreateSchool, useUpdateSchool, type SchoolDetail } from "@/lib/platform/schools";
import { ROOT_DOMAIN } from "@/lib/tenant";
import {
  createSchoolSchema,
  updateSchoolSchema,
  type CreateSchoolValues,
  type SchoolFormInput,
  type UpdateSchoolValues,
} from "@/zod/school";

type Props = { mode: "create" } | { mode: "edit"; school: SchoolDetail };

type SchoolFormValues = CreateSchoolValues | UpdateSchoolValues;

const FIELDS: FieldPath<SchoolFormInput>[] = [
  "nameEn", "nameBn", "subdomain", "email", "phone", "website", "address", "language", "monthlyFee", "discount",
];

// the form edits text; the server's Decimal values arrive as strings like "2500.00"
const decimalText = (value: string | null) => (value == null ? "" : String(Number(value)));

const initialValues = (school?: SchoolDetail): SchoolFormInput => ({
  nameEn: school?.nameEn ?? "",
  nameBn: school?.nameBn ?? "",
  subdomain: school?.subdomain ?? "",
  email: school?.email ?? "",
  phone: school?.phone ?? "",
  website: school?.website ?? "",
  address: school?.address ?? "",
  language: school?.language ?? "BN",
  monthlyFee: decimalText(school?.monthlyFee ?? null),
  discount: school ? decimalText(school.discount) : "",
});

/** Create a school, or edit one (everything but its subdomain). */
export function SchoolForm(props: Props) {
  const isEdit = props.mode === "edit";
  const school = isEdit ? props.school : undefined;
  const t = useTranslations("platform.schoolForm");
  const tCommon = useTranslations("common");
  const tLanguage = useTranslations("languages");
  const describeError = useErrorMessage();
  const router = useRouter();
  const createSchool = useCreateSchool();
  const updateSchool = useUpdateSchool();
  const [formError, setFormError] = useState<string | null>(null);

  // the school email is the super admin's login, so it's fixed once they exist
  const emailLocked = isEdit && !!school?.activationDate;
  const backHref = school ? `/schools/${school.id}` : "/schools";
  const saving = createSchool.isPending || updateSchool.isPending;

  const form = useForm<SchoolFormInput, unknown, SchoolFormValues>({
    // both schemas read the same inputs; they differ in what they send
    resolver: (isEdit ? zodResolver(updateSchoolSchema) : zodResolver(createSchoolSchema)) as Resolver<
      SchoolFormInput,
      unknown,
      SchoolFormValues
    >,
    defaultValues: initialValues(school),
  });

  const subdomain = form.watch("subdomain").trim().toLowerCase() || "yourschool";

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (school) {
        await updateSchool.mutateAsync({ schoolId: school.id, body: values as UpdateSchoolValues });
        toast.success(t("saved"));
        router.push(`/schools/${school.id}`);
      } else {
        const created = await createSchool.mutateAsync(values as CreateSchoolValues);
        toast.success(t("created", { name: created.nameEn }));
        // its page has the Activate button
        router.push(`/schools/${created.id}`);
      }
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, FIELDS, describeError));
    }
  });

  const optional = (label: string) => (
    <>
      {label} <span className="font-normal text-muted-foreground">({tCommon("optional")})</span>
    </>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={backHref}>
          <ArrowLeft /> {school ? school.nameEn : t("back")}
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">{isEdit ? t("editTitle") : t("title")}</h1>
        <p className="text-sm text-muted-foreground">{isEdit ? t("editDescription") : t("description")}</p>
      </div>

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormError message={formError} />

          <Section title={t("sections.school")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="nameEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("nameEn")}</FormLabel>
                    <FormControl>
                      <Input autoFocus={!isEdit} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nameBn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{optional(t("nameBn"))}</FormLabel>
                    <FormControl>
                      <Input lang="bn" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="subdomain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("subdomain")}</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input autoCapitalize="none" spellCheck={false} {...field} disabled={isEdit} />
                      <span className="shrink-0 text-sm text-muted-foreground">.{ROOT_DOMAIN}</span>
                    </div>
                  </FormControl>
                  <FormDescription>
                    {isEdit ? t("subdomainLocked") : t("subdomainHint", { url: `${subdomain}.${ROOT_DOMAIN}` })}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("language")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full sm:w-60">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="BN">{tLanguage("BN")}</SelectItem>
                      <SelectItem value="EN">{tLanguage("EN")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>{t("languageHint")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          <Section title={t("sections.contact")}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("email")}</FormLabel>
                  <FormControl>
                    <Input type="email" autoCapitalize="none" {...field} disabled={emailLocked} />
                  </FormControl>
                  <FormDescription>{emailLocked ? t("emailLocked") : t("emailHint")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{optional(t("phone"))}</FormLabel>
                    <FormControl>
                      <Input type="tel" inputMode="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{optional(t("website"))}</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{optional(t("address"))}</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          <Section title={t("sections.billing")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="monthlyFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{optional(t("monthlyFee"))}</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{optional(t("discount"))}</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Section>

          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link href={backHref}>{tCommon("cancel")}</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              {isEdit ? (saving ? t("saving") : t("save")) : saving ? t("submitting") : t("submit")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}
