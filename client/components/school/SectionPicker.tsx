"use client";

import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClasses, type SchoolClass } from "@/lib/school/classes";

export type SectionChoice = { classId?: string; sectionId?: string };

/** The section a class shows by default: its first named section, or its automatic one. */
export const defaultSectionOf = (c: SchoolClass | undefined) =>
  c?.sections.find((s) => !s.isDefault)?.id ?? c?.sections[0]?.id;

/**
 * The class and section chosen (or the first of each), worked out from what's been picked.
 * A class without sections uses its automatic one, and no section picker is shown.
 */
export const useSectionChoice = (choice: SectionChoice) => {
  const classes = useClasses();
  const chosenClass = classes.data?.items.find((c) => c.id === choice.classId) ?? classes.data?.items[0];
  const sectionId = choice.sectionId ?? defaultSectionOf(chosenClass);
  const section = chosenClass?.sections.find((s) => s.id === sectionId);
  return { classes, chosenClass, sectionId, section };
};

/** Class, then section (when the class has named sections). */
export function SectionPicker({ choice, onChange }: { choice: SectionChoice; onChange: (choice: SectionChoice) => void }) {
  const t = useTranslations("school.sectionPicker");
  const { classes, chosenClass, sectionId } = useSectionChoice(choice);
  const realSections = chosenClass?.sections.filter((s) => !s.isDefault) ?? [];

  return (
    <>
      <Select
        value={chosenClass?.id ?? ""}
        onValueChange={(classId) =>
          onChange({ classId, sectionId: defaultSectionOf(classes.data?.items.find((c) => c.id === classId)) })
        }
      >
        <SelectTrigger className="w-40" aria-label={t("class")}>
          <SelectValue placeholder={t("class")} />
        </SelectTrigger>
        <SelectContent>
          {classes.data?.items.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {realSections.length > 0 && (
        <Select value={sectionId ?? ""} onValueChange={(id) => onChange({ classId: chosenClass?.id, sectionId: id })}>
          <SelectTrigger className="w-32" aria-label={t("section")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {realSections.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {t("sectionName", { name: s.name })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </>
  );
}
