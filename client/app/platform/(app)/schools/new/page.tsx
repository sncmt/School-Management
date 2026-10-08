"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getFieldErrors } from "@/lib/api/errors";
import { httpClient } from "@/lib/api/httpClient";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";

// Moved from app/(dashboardLayout)/admin/school/create. Still a plain demo form.
export default function NewSchoolPage() {
  const t = useTranslations("platform.newSchool");
  const describeError = useErrorMessage();
  const [nameEn, setNameEn] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      await httpClient.post("/school/create", { nameEn, subdomain, email });
      toast.success(t("created"));
      setNameEn("");
      setSubdomain("");
      setEmail("");
    } catch (error) {
      setErrors(getFieldErrors(error));
      toast.error(describeError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const fields = [
    { id: "nameEn", label: t("name"), value: nameEn, set: setNameEn, type: "text" },
    { id: "subdomain", label: t("subdomain"), value: subdomain, set: setSubdomain, type: "text" },
    { id: "email", label: t("email"), value: email, set: setEmail, type: "email" },
  ];

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map(({ id, label, value, set, type }) => (
            <div key={id} className="space-y-2">
              <Label htmlFor={id}>{label}</Label>
              <Input id={id} type={type} value={value} onChange={(e) => set(e.target.value)} />
              {errors[id] && <p className="text-sm text-destructive">{errors[id]}</p>}
            </div>
          ))}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? t("creating") : t("create")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
