"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/lib/auth/hooks";
import { BellSchedules } from "./BellSchedules";
import { ClassRoutine, type SectionChoice } from "./ClassRoutine";
import { SpecialHours } from "./SpecialHours";
import { Substitutes } from "./Substitutes";
import { TeacherRoutine } from "./TeacherRoutine";
import { Workload } from "./Workload";
import { PageHero } from "@/components/layout/PageHero";

/** The class routine: timetables, teachers' weeks, substitutes, bell schedules and special hours. */
export function RoutinePage() {
  const t = useTranslations("school.routine");
  const can = useCan();
  const canManage = can("routine:manage");
  const [tab, setTab] = useState("class");
  // kept here so switching tabs doesn't lose them
  const [section, setSection] = useState<SectionChoice>({});
  const [teacherId, setTeacherId] = useState<string | undefined>();

  return (
    <div className="space-y-2">
      <PageHero title={t("title")} description={t("description")} />

      <Tabs value={tab} onValueChange={setTab} className="gap-2">
        <TabsList variant="strip">
          <TabsTrigger value="class">{t("tabs.class")}</TabsTrigger>
          <TabsTrigger value="teacher">{t("tabs.teacher")}</TabsTrigger>
          <TabsTrigger value="workload">{t("tabs.workload")}</TabsTrigger>
          <TabsTrigger value="substitutes">{t("tabs.substitutes")}</TabsTrigger>
          <TabsTrigger value="bell">{t("tabs.bell")}</TabsTrigger>
          {can("schedule:view") && <TabsTrigger value="special">{t("tabs.special")}</TabsTrigger>}
        </TabsList>
        <TabsContent value="class">
          <ClassRoutine choice={section} onChoice={setSection} canManage={canManage} />
        </TabsContent>
        <TabsContent value="teacher">
          <TeacherRoutine teacherId={teacherId} onTeacher={setTeacherId} />
        </TabsContent>
        <TabsContent value="workload">
          <Workload
            onTeacher={(id) => {
              setTeacherId(id);
              setTab("teacher");
            }}
          />
        </TabsContent>
        <TabsContent value="substitutes">
          <Substitutes choice={section} onChoice={setSection} canManage={canManage} />
        </TabsContent>
        <TabsContent value="special">
          <SpecialHours canManage={can("schedule:manage")} />
        </TabsContent>
        <TabsContent value="bell">
          <BellSchedules canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
