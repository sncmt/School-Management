"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage, getFieldErrors } from "@/lib/api/errors";
import { httpClient } from "@/lib/api/httpClient";

// Moved from app/(dashboardLayout)/admin/school/create. Still a plain demo form.
export default function NewSchoolPage() {
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
      toast.success("School created. Activate it to create its super admin.");
      setNameEn("");
      setSubdomain("");
      setEmail("");
    } catch (error) {
      setErrors(getFieldErrors(error));
      toast.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const fields = [
    { id: "nameEn", label: "School name", value: nameEn, set: setNameEn, type: "text" },
    { id: "subdomain", label: "Subdomain", value: subdomain, set: setSubdomain, type: "text" },
    { id: "email", label: "School email", value: email, set: setEmail, type: "email" },
  ];

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Create school</CardTitle>
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
            {submitting ? "Creating…" : "Create school"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
