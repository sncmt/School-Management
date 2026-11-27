"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFamilyRole } from "@/lib/school/family";
import { FamilyHomework } from "./FamilyHomework";
import { StaffHomework } from "./StaffHomework";
import { PageHero } from "@/components/layout/PageHero";

/** Homework: the family's children's, the staff's classes', or both for a teacher who is a parent here. */
export function HomeworkPage() {
  const t = useTranslations("school.homework");
  const { ready, isFamily, isStaff } = useFamilyRole();

  if (!ready) return <Skeleton className="h-64 rounded-xl" />;

  if (!isStaff) {
    return (
      <div className="space-y-2">
        <PageHero title={t("title")} description={t("family.description")} />
        <FamilyHomework />
      </div>
    );
  }
  if (!isFamily) return <StaffHomework />;

  return (
    <Tabs defaultValue="classes">
      <TabsList>
        <TabsTrigger value="classes">{t("tabs.classes")}</TabsTrigger>
        <TabsTrigger value="children">{t("tabs.children")}</TabsTrigger>
      </TabsList>
      <TabsContent value="classes">
        <StaffHomework />
      </TabsContent>
      <TabsContent value="children" className="pt-2">
        <FamilyHomework />
      </TabsContent>
    </Tabs>
  );
}
