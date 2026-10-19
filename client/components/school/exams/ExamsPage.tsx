"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/lib/auth/hooks";
import { ExamsTab } from "./ExamsTab";
import { FinalResultsTab } from "./final/FinalResultsTab";
import { GradingScales } from "./GradingScales";
import { MarksTab } from "./marks/MarksTab";
import { OptionalSubjects } from "./OptionalSubjects";
import { CardSettingsTab } from "./results/CardSettingsTab";
import { ResultsTab } from "./results/ResultsTab";
import { ResultSettings } from "./ResultSettings";
import { SeatingTab } from "./seating/SeatingTab";
import { AdmitCardsTab } from "./admit/AdmitCardsTab";

/** Exams and results: grading, result settings, exams, marks and results. */
export function ExamsPage() {
  const t = useTranslations("school.exams");
  const can = useCan();
  const canManageGrading = can("grading:manage");
  const tabs = [
    can("exam:view") && "exams",
    can("exam:view") && "marks",
    can("exam:view_result") && "results",
    can("exam:view_result") && "final",
    can("exam:view_result") && "card",
    can("exam:view") && "optional",
    can("exam:view") && "seating",
    can("exam:view") && "admit",
    can("grading:view") && "scales",
    can("grading:view") && "settings",
  ].filter(Boolean) as string[];
  const [tab, setTab] = useState<string | undefined>();
  // set by "Enter marks" on an exam: the Marks tab opens on that exam and class
  const [marksStart, setMarksStart] = useState<{ examId: string; classId: string; at: number } | undefined>();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Tabs value={tab ?? tabs[0]} onValueChange={setTab}>
        <TabsList>
          {tabs.map((name) => (
            <TabsTrigger key={name} value={name}>
              {t(`tabs.${name}` as "tabs.scales")}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="exams">
          <ExamsTab
            canManage={can("exam:create")}
            onEnterMarks={(examId, classId) => {
              setMarksStart({ examId, classId, at: Date.now() });
              setTab("marks");
            }}
          />
        </TabsContent>
        <TabsContent value="marks">
          <MarksTab key={marksStart?.at} start={marksStart} />
        </TabsContent>
        <TabsContent value="results">
          <ResultsTab />
        </TabsContent>
        <TabsContent value="final">
          <FinalResultsTab />
        </TabsContent>
        <TabsContent value="card">
          <CardSettingsTab canManage={can("grading:manage")} />
        </TabsContent>
        <TabsContent value="optional">
          <OptionalSubjects canManage={can("exam:create")} />
        </TabsContent>
        <TabsContent value="admit">
          <AdmitCardsTab />
        </TabsContent>
        <TabsContent value="seating">
          <SeatingTab />
        </TabsContent>
        <TabsContent value="scales">
          <GradingScales canManage={canManageGrading} />
        </TabsContent>
        <TabsContent value="settings">
          <ResultSettings canManage={canManageGrading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
