"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useForm, useWatch, type FieldPath, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { PhotoField } from "@/components/data/PhotoField";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applyServerErrors } from "@/lib/auth/formErrors";
import { useCan } from "@/lib/auth/hooks";
import { dayKey } from "@/lib/dates";
import { todayKey } from "@/lib/school/calendar";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useAcademicYears } from "@/lib/school/academicYears";
import { useClasses } from "@/lib/school/classes";
import { useGroups } from "@/lib/school/groups";
import {
  localPhone,
  RELIGIONS,
  useAdmitStudent,
  useSetStudentPhoto,
  useUpdateStudent,
  type FamilyAccount,
  type Religion,
  type StudentDetail,
  type StudentProfileBody,
} from "@/lib/school/students";
import type { Gender } from "@/lib/school/teachers";
import {
  admitStudentSchema,
  editStudentSchema,
  type StudentFormInput,
  type StudentFormValues,
} from "@/zod/student";
import { useSchoolLanguage } from "../NameFields";
import { AdmissionTypeField } from "./AdmissionTypeField";
import { FamilyCredentialsDialog, type FamilyCredentials } from "./FamilyCredentialsDialog";

const REQUIRED = new Set<FieldPath<StudentFormInput>>([
  "nameEn", "nameBn", "gender", "religion", "fatherName", "motherName", "classId", "sectionId", "admissionDate",
]);

const NO_GROUP = "none"; // Select can't hold an empty value

const FIELDS: FieldPath<StudentFormInput>[] = [
  "nameEn", "nameBn", "gender", "religion", "dob", "fatherName", "motherName", "guardianName", "guardianPhone",
  "phone", "email", "whatsApp", "presentAddress", "permanentAddress", "admissionNo", "admissionDate", "classId", "sectionId",
  "groupId", "rollNumber",
];

const initialValues = (student?: StudentDetail): StudentFormInput => ({
  nameEn: student?.nameEn ?? "",
  nameBn: student?.nameBn ?? "",
  gender: student?.gender ?? "",
  religion: student?.religion ?? "",
  dob: student?.dob ? dayKey(student.dob) : "",
  fatherName: student?.fatherName ?? "",
  motherName: student?.motherName ?? "",
  guardianName: student?.guardianName ?? "",
  guardianPhone: localPhone(student?.guardianPhone ?? null),
  phone: localPhone(student?.phone ?? null),
  email: student?.email ?? "",
  whatsApp: student?.whatsApp ?? "",
  presentAddress: student?.presentAddress ?? "",
  permanentAddress: student?.permanentAddress ?? "",
  admissionNo: student?.admissionNo ?? "",
  academicYearId: "",
  classId: "",
  sectionId: "",
  groupId: "",
  rollNumber: "",
  // admitting: new to the school; switch to Old when entering students who were already here
  admissionType: "NEW",
  admissionDate: student ? dayKey(student.admissionDate) : todayKey(),
});

/** Admit a student, or edit one (everything but the class placement, which has its own dialog). */
export function StudentForm({ student }: { student?: StudentDetail }) {
  const isEdit = !!student;
  const t = useTranslations("school.students.form");
  const tCommon = useTranslations("common");
  const tGender = useTranslations("genders");
  const tReligion = useTranslations("religions");
  const describeError = useErrorMessage();
  const localName = useLocalizedName();
  const language = useSchoolLanguage();
  const router = useRouter();
  const canChangeDate = useCan()("student:change_admission_date");

  const classes = useClasses();
  const years = useAcademicYears();
  // the years a student can join: the current one and any not ended yet (next year, in December)
  const today = todayKey();
  const openYears = (years.data ?? []).filter((y) => dayKey(y.endDate) >= today).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const currentYear = classes.data?.academicYear ?? years.data?.find((y) => y.isCurrent) ?? null;
  const groups = useGroups();
  const admit = useAdmitStudent();
  const update = useUpdateStudent();
  const setPhoto = useSetStudentPhoto();

  const [formError, setFormError] = useState<string | null>(null);
  const [photo, setPhotoFile] = useState<File | null>(null);
  const [credentials, setCredentials] = useState<{ value: FamilyCredentials; next: string } | null>(null);
  const saving = admit.isPending || update.isPending || setPhoto.isPending;

  const form = useForm<StudentFormInput, unknown, StudentFormValues>({
    resolver: zodResolver(isEdit ? editStudentSchema : admitStudentSchema) as Resolver<
      StudentFormInput,
      unknown,
      StudentFormValues
    >,
    defaultValues: initialValues(student),
  });

  const classId = useWatch({ control: form.control, name: "classId" });
  const chosenClass = classes.data?.items.find((c) => c.id === classId);
  const yearId = useWatch({ control: form.control, name: "academicYearId" });
  const chosenYear = openYears.find((y) => y.id === yearId) ?? currentYear;
  // a class without sections has only its automatic one, picked for you
  const realSections = chosenClass?.sections.filter((s) => !s.isDefault) ?? [];
  const noYear = !isEdit && classes.data && !classes.data.academicYear;

  const chooseClass = (id: string) => {
    form.setValue("classId", id, { shouldValidate: form.formState.isSubmitted });
    const sections = classes.data?.items.find((c) => c.id === id)?.sections ?? [];
    const onlyDefault = sections.length > 0 && sections.every((s) => s.isDefault);
    form.setValue("sectionId", onlyDefault ? sections[0].id : "", { shouldValidate: form.formState.isSubmitted });
  };

  // the photo goes up once the student exists; if it fails the student is still saved
  const uploadPhoto = async (studentId: string, name: string) => {
    if (!photo) return;
    try {
      await setPhoto.mutateAsync({ studentId, file: photo });
    } catch (error) {
      toast.warning(tCommon("photoUploadFailed", { name, error: describeError(error) }));
    }
  };

  // after saving: show a new login's password first, else go straight on
  const finish = (account: FamilyAccount | null, name: string, next: string) => {
    if (account?.status === "CREATED" && account.password) {
      setCredentials({
        value: { name, phone: localPhone(account.loginPhone), password: account.password },
        next,
      });
      return;
    }
    if (account?.status === "LINKED") {
      toast.info(t("linked", { phone: localPhone(account.loginPhone), count: account.siblingsInSchool }));
    }
    router.push(next);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const { academicYearId, classId, sectionId, groupId, rollNumber, admissionType, admissionDate, ...rest } = values;
    const profile = { ...rest, gender: rest.gender as Gender, religion: rest.religion as Religion } satisfies StudentProfileBody;
    // when editing, the admission date goes only when it changed (it needs its own permission)
    const dateChange = student && admissionDate !== dayKey(student.admissionDate) ? { admissionDate } : {};

    try {
      if (student) {
        const result = await update.mutateAsync({ studentId: student.id, body: { ...profile, ...dateChange } });
        const name = localName(result.student);
        await uploadPhoto(student.id, name);
        toast.success(t("updated", { name }));
        finish(result.account, name, `/students/${student.id}`);
      } else {
        const result = await admit.mutateAsync({
          ...profile,
          admissionDate,
          enrollment: { ...(academicYearId ? { academicYearId } : {}), classId, sectionId, groupId, rollNumber, admissionType },
        });
        const name = localName(result.student);
        await uploadPhoto(result.student.id, name);
        toast.success(t("admitted", { name, admissionNo: result.student.admissionNo }));
        for (const warning of result.warnings) toast.warning(warning);
        finish(result.account, name, `/students/${result.student.id}`);
      }
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, FIELDS, describeError));
      // the server names enrollment fields "enrollment.classId"…: show those at the top
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  const textField = (
    name: FieldPath<StudentFormInput>,
    label: ReactNode,
    props: React.ComponentProps<"input"> = {},
    hint?: string,
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel required={required(name)}>{label}</FormLabel>
          <FormControl>
            <Input {...props} {...field} />
          </FormControl>
          {hint && <FormDescription>{hint}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const selectField = (
    name: FieldPath<StudentFormInput>,
    label: ReactNode,
    options: { value: string; label: string }[],
    extra: { placeholder?: string; onChange?: (value: string) => void; emptyValue?: string; disabled?: boolean } = {},
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel required={required(name)}>{label}</FormLabel>
          <Select
            value={field.value || extra.emptyValue || ""}
            onValueChange={(v) => {
              const value = v === extra.emptyValue ? "" : v;
              if (extra.onChange) extra.onChange(value);
              else field.onChange(value);
            }}
            disabled={extra.disabled}
          >
            <FormControl>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={extra.placeholder ?? t("choose")} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((o) => (
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
  );

  // the rest are optional; a student being edited always keeps an admission number
  const required = (name: FieldPath<StudentFormInput>) =>
    REQUIRED.has(name) || (isEdit && name === "admissionNo");

  const backHref = student ? `/students/${student.id}` : "/students";
  const nameOrder = language === "BN" ? (["nameBn", "nameEn"] as const) : (["nameEn", "nameBn"] as const);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={backHref}>
          <ArrowLeft /> {student ? localName(student) : t("back")}
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">{isEdit ? t("editTitle") : t("title")}</h1>
        <p className="text-sm text-muted-foreground">{isEdit ? t("editDescription") : t("description")}</p>
      </div>

      {noYear && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <span>
            {t("noYear")}{" "}
            <Link href="/academic-years" className="font-medium underline">
              {t("noYearLink")}
            </Link>
          </span>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <FormError message={formError} />

          <Section title={t("sections.student")}>
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("photo")}</p>
              <PhotoField currentUrl={student?.photo} file={photo} onChange={setPhotoFile} alt={t("photo")} />
            </div>
            {/* both names are required; the school's language comes first */}
            <div className="grid gap-4 sm:grid-cols-2">
              {nameOrder.map((field, i) => (
                <div key={field}>
                  {textField(field, t(field), { autoFocus: !isEdit && i === 0, lang: field === "nameBn" ? "bn" : "en" })}
                </div>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {selectField(
                "gender",
                t("gender"),
                (["MALE", "FEMALE", "OTHER"] as const).map((g) => ({ value: g, label: tGender(g) })),
              )}
              {selectField(
                "religion",
                t("religion"),
                RELIGIONS.map((r) => ({ value: r, label: tReligion(r) })),
              )}
              {textField("dob", t("dob"), { type: "date", max: new Date().toISOString().slice(0, 10) })}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {isEdit && textField("admissionNo", t("admissionNo"))}
              {textField(
                "admissionDate",
                t("admissionDate"),
                { type: "date", max: todayKey(), disabled: isEdit && !canChangeDate },
                isEdit && !canChangeDate ? t("admissionDateLocked") : t("admissionDateHint"),
              )}
            </div>
          </Section>

          {!isEdit && (
            <Section title={t("sections.admission", { year: chosenYear?.name ?? "" })}>
              <div className="grid gap-4 sm:grid-cols-2">
                {openYears.length > 1 &&
                  selectField(
                    "academicYearId",
                    t("academicYear"),
                    openYears.map((y) => ({ value: y.id, label: y.isCurrent ? t("currentYearOption", { year: y.name }) : y.name })),
                    // the current year is sent as "" (the server's default)
                    { emptyValue: currentYear?.id },
                  )}
                {selectField(
                  "classId",
                  t("class"),
                  (classes.data?.items ?? []).map((c) => ({ value: c.id, label: c.name })),
                  { onChange: chooseClass, disabled: classes.isPending },
                )}
                {realSections.length > 0
                  ? selectField(
                      "sectionId",
                      t("section"),
                      realSections.map((s) => ({ value: s.id, label: s.name })),
                    )
                  : (
                    <div className="grid gap-2">
                      <Label required>{t("section")}</Label>
                      <p className="flex h-9 items-center text-sm text-muted-foreground">
                        {chosenClass ? t("wholeClass") : t("chooseClassFirst")}
                      </p>
                    </div>
                  )}
                {selectField(
                  "groupId",
                  t("group"),
                  [
                    { value: NO_GROUP, label: t("noGroup") },
                    ...(groups.data?.items ?? []).map((g) => ({ value: g.id, label: localName(g) })),
                  ],
                  { emptyValue: NO_GROUP },
                )}
                {textField("rollNumber", t("rollNumber"), { inputMode: "numeric" })}
              </div>
              <AdmissionTypeField control={form.control} name="admissionType" hint={t("admissionTypeHint")} />
              {textField("admissionNo", t("admissionNo"), {}, t("admissionNoHint"))}
            </Section>
          )}

          <Section title={t("sections.family")}>
            <div className="grid gap-4 sm:grid-cols-2">
              {textField("fatherName", t("fatherName"))}
              {textField("motherName", t("motherName"))}
              {textField("guardianName", t("guardianName"), {}, t("guardianNameHint"))}
              {textField("guardianPhone", t("guardianPhone"), { type: "tel", inputMode: "tel" })}
            </div>
          </Section>

          <Section title={t("sections.contact")}>
            {textField(
              "phone",
              t("phone"),
              { type: "tel", inputMode: "tel", placeholder: "01712345678" },
              isEdit && student?.phone ? t("phoneEditHint") : t("phoneHint"),
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {textField("email", t("email"), { type: "email", autoCapitalize: "none" })}
              {textField("whatsApp", t("whatsApp"), { type: "tel", inputMode: "tel" })}
            </div>
            <AddressFields form={form} />
          </Section>

          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link href={backHref}>{tCommon("cancel")}</Link>
            </Button>
            <Button type="submit" disabled={saving || !!noYear}>
              {saving ? t("saving") : isEdit ? t("save") : t("submit")}
            </Button>
          </div>
        </form>
      </Form>

      <FamilyCredentialsDialog
        credentials={credentials?.value ?? null}
        onClose={() => {
          const next = credentials?.next;
          setCredentials(null);
          if (next) router.push(next);
        }}
      />
    </div>
  );
}

/* Present and permanent address, with "same as present" to copy it across. */
function AddressFields({ form }: { form: ReturnType<typeof useForm<StudentFormInput, unknown, StudentFormValues>> }) {
  const t = useTranslations("school.students.form");
  const present = useWatch({ control: form.control, name: "presentAddress" });
  const permanent = useWatch({ control: form.control, name: "permanentAddress" });
  const same = !!present.trim() && present === permanent;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        control={form.control}
        name="presentAddress"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("presentAddress")}</FormLabel>
            <FormControl>
              <Textarea rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="permanentAddress"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between gap-2">
              <FormLabel>{t("permanentAddress")}</FormLabel>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="size-3.5 accent-primary "
                  checked={same}
                  disabled={!present.trim()}
                  onChange={(e) => form.setValue("permanentAddress", e.target.checked ? present : "")}
                />
                {t("sameAsPresent")}
              </label>
            </div>
            <FormControl>
              <Textarea rows={3} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
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
