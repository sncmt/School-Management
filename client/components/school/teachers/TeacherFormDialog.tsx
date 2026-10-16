"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
import { PhotoField } from "@/components/data/PhotoField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { applyServerErrors } from "@/lib/auth/formErrors";
import { dayKey } from "@/lib/dates";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useCreateTeacher, useSetTeacherPhoto, useUpdateTeacher, type Teacher } from "@/lib/school/teachers";
import { teacherFormSchema, type TeacherFormInput, type TeacherFormValues } from "@/zod/teacher";
import { useSchoolLanguage } from "../NameFields";
import type { TeacherCredentials } from "./TeacherCredentialsDialog";

// the rest are optional
const REQUIRED = new Set<FieldPath<TeacherFormInput>>(["nameEn", "nameBn", "phone"]);

const NO_GENDER = "none"; // Select can't hold an empty value

const FIELDS: FieldPath<TeacherFormInput>[] = [
  "nameEn", "nameBn", "phone", "designation", "mpoIndex", "joiningDate", "qualification", "specialization", "gender", "nid",
];

// "+8801712345678" -> "01712345678": how people type it
const localPhone = (phone: string | null) => (phone ?? "").replace(/^\+?880/, "0");

type Props = {
  open: boolean;
  // null: adding a new teacher
  teacher: Teacher | null;
  onClose: () => void;
  // a new login was made: show its temporary password
  onCredentials: (credentials: TeacherCredentials) => void;
};

export function TeacherFormDialog({ open, teacher, onClose, onCredentials }: Props) {
  const t = useTranslations("school.teachers.form");
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{teacher ? t("editTitle") : t("addTitle")}</DialogTitle>
          <DialogDescription>{teacher ? t("accountNote") : t("addDescription")}</DialogDescription>
        </DialogHeader>
        {open && (
          <TeacherForm key={teacher?.id ?? "new"} teacher={teacher} onDone={onClose} onCredentials={onCredentials} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function TeacherForm({
  teacher,
  onDone,
  onCredentials,
}: {
  teacher: Teacher | null;
  onDone: () => void;
  onCredentials: (credentials: TeacherCredentials) => void;
}) {
  const t = useTranslations("school.teachers.form");
  const tGender = useTranslations("genders");
  const tCommon = useTranslations("common");
  const describeError = useErrorMessage();
  const localName = useLocalizedName();
  const language = useSchoolLanguage();
  const create = useCreateTeacher();
  const update = useUpdateTeacher();
  const setPhoto = useSetTeacherPhoto();
  const [formError, setFormError] = useState<string | null>(null);
  const [photo, setPhotoFile] = useState<File | null>(null);
  const saving = create.isPending || update.isPending || setPhoto.isPending;

  // the photo goes up once the teacher exists; if it fails the teacher is still saved
  const uploadPhoto = async (teacherId: string, name: string) => {
    if (!photo) return;
    try {
      await setPhoto.mutateAsync({ teacherId, file: photo });
    } catch (error) {
      toast.warning(tCommon("photoUploadFailed", { name, error: describeError(error) }));
    }
  };

  const form = useForm<TeacherFormInput, unknown, TeacherFormValues>({
    resolver: zodResolver(teacherFormSchema),
    defaultValues: {
      nameEn: teacher?.nameEn ?? "",
      nameBn: teacher?.nameBn ?? "",
      phone: localPhone(teacher?.membership.user.phone ?? null),
      designation: teacher?.designation ?? "",
      mpoIndex: teacher?.mpoIndex ?? "",
      joiningDate: teacher?.joiningDate ? dayKey(teacher.joiningDate) : "",
      qualification: teacher?.qualification ?? "",
      specialization: teacher?.specialization ?? "",
      gender: teacher?.gender ?? "",
      nid: teacher?.nid ?? "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      // "" fields: "not given" when adding, "clear it" when editing (the server reads them so)
      if (teacher) {
        await update.mutateAsync({ teacherId: teacher.id, body: values });
        const name = localName(values);
        await uploadPhoto(teacher.id, name);
        toast.success(t("updated", { name }));
      } else {
        const result = await create.mutateAsync(values);
        const name = localName(result.teacher);
        await uploadPhoto(result.teacher.id, name);
        if (result.account.password) {
          onCredentials({ name, phone: localPhone(result.account.loginPhone), password: result.account.password });
        } else {
          toast.success(t(result.rejoined ? "rejoined" : "linked", { name }));
        }
      }
      onDone();
    } catch (error) {
      setFormError(applyServerErrors(error, form.setError, FIELDS, describeError));
    }
  });


  const textField = (name: FieldPath<TeacherFormInput>, label: ReactNode, props: React.ComponentProps<"input"> = {}) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel required={REQUIRED.has(name)}>{label}</FormLabel>
          <FormControl>
            <Input {...props} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormError message={formError} />

        <fieldset className="space-y-4">
          <legend className="mb-2 text-sm font-semibold">{t("sections.person")}</legend>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("photo")}</p>
            <PhotoField currentUrl={teacher?.photo} file={photo} onChange={setPhotoFile} alt={t("photo")} />
          </div>
          {/* both names are required; the school's language comes first */}
          <div className="grid gap-4 sm:grid-cols-2">
            {(language === "BN" ? (["nameBn", "nameEn"] as const) : (["nameEn", "nameBn"] as const)).map((field, i) => (
              <div key={field}>{textField(field, t(field), { autoFocus: i === 0, lang: field === "nameBn" ? "bn" : "en" })}</div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {textField("phone", t("phone"), { type: "tel", inputMode: "tel", placeholder: "01712345678" })}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("gender")}</FormLabel>
                  <Select value={field.value || NO_GENDER} onValueChange={(v) => field.onChange(v === NO_GENDER ? "" : v)}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={NO_GENDER}>{t("noGender")}</SelectItem>
                      {(["MALE", "FEMALE", "OTHER"] as const).map((g) => (
                        <SelectItem key={g} value={g}>
                          {tGender(g)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {textField("nid", t("nid"), { inputMode: "numeric" })}
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-2 text-sm font-semibold">{t("sections.work")}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {textField("designation", t("designation"), { placeholder: t("designationPlaceholder") })}
            {textField("joiningDate", t("joiningDate"), { type: "date" })}
            {textField("qualification", t("qualification"))}
            {textField("specialization", t("specialization"))}
            {textField("mpoIndex", t("mpoIndex"))}
          </div>
          {teacher && <FormDescription>{t("accountNote")}</FormDescription>}
        </fieldset>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone} disabled={saving}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
