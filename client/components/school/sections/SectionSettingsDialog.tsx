"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormError } from "@/components/auth/AuthCard";
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
import { useCan } from "@/lib/auth/hooks";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { usePeriodTemplates, useWorkingTeachers } from "@/lib/school/pickers";
import { useSetSectionYearConfig, type Section, type SectionYearConfigBody } from "@/lib/school/sections";
import { sectionSettingsSchema, type SectionSettingsInput, type SectionSettingsValues } from "@/zod/section";

const NONE = "none"; // Select can't hold an empty value

type Props = {
  section: Section | null;
  year: { id: string; name: string } | null;
  onClose: () => void;
};

/** Class teacher, capacity, class hours and bell schedule of a section for one year. */
export function SectionSettingsDialog({ section, year, onClose }: Props) {
  const t = useTranslations("school.sections.settingsDialog");
  return (
    <Dialog open={!!section && !!year} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {section && year
              ? section.isDefault
                ? t("titleWholeClass", { className: section.class.name, year: year.name })
                : t("title", { className: section.class.name, section: section.name, year: year.name })
              : null}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {section && year && <SettingsForm key={section.id} section={section} yearId={year.id} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function SettingsForm({ section, yearId, onDone }: { section: Section; yearId: string; onDone: () => void }) {
  const t = useTranslations("school.sections.settingsDialog");
  const tCommon = useTranslations("common");
  const can = useCan();
  const name = useLocalizedName();
  const describeError = useErrorMessage();
  const save = useSetSectionYearConfig();
  const [formError, setFormError] = useState<string | null>(null);

  // the pickers need their own modules' view permissions
  const teachers = useWorkingTeachers(can("teacher:view"));
  const templates = usePeriodTemplates(can("routine:view"));

  const config = section.yearInfo?.config ?? null;
  const initial: SectionSettingsInput = {
    classTeacherMembershipId: config?.classTeacherMembershipId ?? "",
    capacity: config?.capacity != null ? String(config.capacity) : "",
    startTime: config?.startTime ?? "",
    endTime: config?.endTime ?? "",
    periodTemplateId: config?.periodTemplate?.id ?? "",
  };

  const form = useForm<SectionSettingsInput, unknown, SectionSettingsValues>({
    resolver: zodResolver(sectionSettingsSchema),
    defaultValues: initial,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    // only what changed; "" means "clear it"
    const orNull = (v: string) => v || null;
    const body: SectionYearConfigBody = { academicYearId: yearId };
    if (values.classTeacherMembershipId !== initial.classTeacherMembershipId) {
      body.classTeacherMembershipId = orNull(values.classTeacherMembershipId);
    }
    if (values.capacity !== (config?.capacity ?? null)) body.capacity = values.capacity;
    if (values.startTime !== initial.startTime || values.endTime !== initial.endTime) {
      body.startTime = orNull(values.startTime);
      body.endTime = orNull(values.endTime);
    }
    if (values.periodTemplateId !== initial.periodTemplateId) body.periodTemplateId = orNull(values.periodTemplateId);

    if (Object.keys(body).length === 1) return onDone(); // nothing changed

    try {
      const result = await save.mutateAsync({ sectionId: section.id, body });
      toast.success(t("saved"));
      // capacity is only a warning: the server says when it's already exceeded
      for (const warning of result.warnings) toast.warning(warning);
      onDone();
    } catch (error) {
      setFormError(describeError(error));
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={formError} />

        <FormField
          control={form.control}
          name="classTeacherMembershipId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("classTeacher")}</FormLabel>
              <Select
                value={field.value || NONE}
                onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                disabled={!can("teacher:view")}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NONE}>{t("noTeacher")}</SelectItem>
                  {/* the saved teacher, even if the list hasn't loaded it */}
                  {config?.classTeacherMembership &&
                    !teachers.data?.some((tch) => tch.membershipId === config.classTeacherMembershipId) && (
                      <SelectItem value={config.classTeacherMembership.id}>
                        {config.classTeacherMembership.teacherProfile
                          ? name(config.classTeacherMembership.teacherProfile)
                          : config.classTeacherMembership.user.fullname}
                      </SelectItem>
                    )}
                  {teachers.data?.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.membershipId}>
                      {name(teacher)}
                      {teacher.designation ? ` · ${teacher.designation}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {teachers.data?.length === 0 && <FormDescription>{t("noTeachers")}</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="capacity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("capacity")}</FormLabel>
              <FormControl>
                <Input inputMode="numeric" className="w-28" {...field} />
              </FormControl>
              <FormDescription>{t("capacityHint")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("startTime")}</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("endTime")}</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="periodTemplateId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("bellSchedule")}</FormLabel>
              <Select
                value={field.value || NONE}
                onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                disabled={!can("routine:view")}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NONE}>{t("noBellSchedule")}</SelectItem>
                  {config?.periodTemplate && !templates.data?.some((tpl) => tpl.id === config.periodTemplate!.id) && (
                    <SelectItem value={config.periodTemplate.id}>{name(config.periodTemplate)}</SelectItem>
                  )}
                  {templates.data?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {name(template)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone} disabled={save.isPending}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? t("saving") : t("save")}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
