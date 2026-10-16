"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/lib/auth/hooks";
import { todayKey } from "@/lib/school/calendar";
import type { SectionChoice } from "../SectionPicker";
import { AbsentList } from "./AbsentList";
import { MonthlyRegister } from "./MonthlyRegister";
import { RollCall } from "./RollCall";
import { TeacherAttendance } from "./TeacherAttendance";
import { TodaySummary } from "./TodaySummary";

/** Daily attendance: the day at a glance, roll calls, absentees, the month register, teachers. */
export function AttendancePage() {
  const t = useTranslations("school.attendance");
  const can = useCan();
  const tabs = [
    can("attendance:view") && "today",
    can("attendance:mark") && "rollCall",
    can("attendance:view") && "absent",
    can("attendance:view") && "register",
    can("teacher_attendance:mark") && "teachers",
  ].filter(Boolean) as string[];

  const [tab, setTab] = useState<string | undefined>();
  // shared by the tabs, so moving between them keeps the day and the section
  const [date, setDate] = useState(todayKey);
  const [section, setSection] = useState<SectionChoice>({});
  const shown = tab ?? tabs[0];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Tabs value={shown} onValueChange={setTab}>
        <TabsList>
          {tabs.map((name) => (
            <TabsTrigger key={name} value={name}>
              {t(`tabs.${name}` as "tabs.today")}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="today">
          <TodaySummary
            date={date}
            onDate={setDate}
            onOpen={(classId, sectionId) => {
              setSection({ classId, sectionId });
              setTab("rollCall");
            }}
          />
        </TabsContent>
        <TabsContent value="rollCall">
          <RollCall date={date} onDate={setDate} choice={section} onChoice={setSection} />
        </TabsContent>
        <TabsContent value="absent">
          <AbsentList date={date} onDate={setDate} />
        </TabsContent>
        <TabsContent value="register">
          <MonthlyRegister choice={section} onChoice={setSection} />
        </TabsContent>
        <TabsContent value="teachers">
          <TeacherAttendance date={date} onDate={setDate} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
