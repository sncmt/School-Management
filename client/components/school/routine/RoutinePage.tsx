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
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
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
