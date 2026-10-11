"use client";

import { useTranslations } from "next-intl";
import { useLocalizedName } from "@/lib/i18n/names";
import type { Enrollment } from "@/lib/school/students";

/** "Six · A · Roll 12": where a student sits in a year. */
export const usePlacementLabel = () => {
  const t = useTranslations("school.students");
  const name = useLocalizedName();
  return (enrollment: Enrollment) =>
    [
      enrollment.class.name,
      !enrollment.section.isDefault && enrollment.section.name,
      enrollment.group && name(enrollment.group),
      enrollment.rollNumber && t("roll", { roll: enrollment.rollNumber }),
    ]
      .filter(Boolean)
      .join(" · ");
};
