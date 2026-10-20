"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/lib/auth/hooks";
import { useAcademicYears } from "@/lib/school/academicYears";
import type { CalendarEntry } from "@/lib/school/calendar";
import { EntriesTab } from "./EntriesTab";
import { EntryFormDialog, type EntryDefaults } from "./EntryFormDialog";
import { MonthView } from "./MonthView";
import { NationalHolidaysTab } from "./NationalHolidaysTab";
import { WeeklyHolidaysTab } from "./WeeklyHolidaysTab";

/** The school calendar: month view, the school's own entries, national holidays, weekly days off. */
export function CalendarPage() {
  const t = useTranslations("school.calendar");
  const can = useCan();
  const canManage = can("holiday:manage");
  const years = useAcademicYears();

  const [tab, setTab] = useState("month");
  const [yearId, setYearId] = useState<string | undefined>();
  // the add/edit dialog, shared by the month view and the list
  const [form, setForm] = useState<{ entry: CalendarEntry | null; defaults?: EntryDefaults } | null>(null);

  const yearList = years.data ?? [];
  const shownYearId = yearId ?? yearList.find((y) => y.isCurrent)?.id ?? yearList[0]?.id;
  const noYears = years.isSuccess && yearList.length === 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="month">{t("tabs.month")}</TabsTrigger>
          <TabsTrigger value="entries">{t("tabs.entries")}</TabsTrigger>
          <TabsTrigger value="national">{t("tabs.national")}</TabsTrigger>
          <TabsTrigger value="weekly">{t("tabs.weekly")}</TabsTrigger>
        </TabsList>

        <TabsContent value="month">
          <MonthView canManage={canManage && !noYears} onAdd={(defaults) => setForm({ entry: null, defaults })} />
        </TabsContent>
        <TabsContent value="entries">
          {noYears ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("noYears")}</p>
          ) : (
            <EntriesTab
              years={yearList}
              yearId={shownYearId}
              onYearChange={setYearId}
              canManage={canManage}
              onAdd={() => setForm({ entry: null })}
              onEdit={(entry) => setForm({ entry })}
            />
          )}
        </TabsContent>
        <TabsContent value="national">
          <NationalHolidaysTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="weekly">
          <WeeklyHolidaysTab canManage={canManage} />
        </TabsContent>
      </Tabs>

      <EntryFormDialog
        open={!!form}
        entry={form?.entry ?? null}
        defaults={form?.defaults}
        years={yearList}
        onClose={() => setForm(null)}
      />
    </div>
  );
}
