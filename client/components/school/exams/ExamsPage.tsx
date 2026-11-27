"use client";

import {
  Armchair,
  Award,
  Check,
  ChevronDown,
  FileBadge,
  FileChartColumn,
  IdCard,
  ListChecks,
  PencilLine,
  Ruler,
  Settings2,
  SlidersHorizontal,
  Split,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PageHero } from "@/components/layout/PageHero";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/lib/auth/hooks";
import { useExams } from "@/lib/school/exams";
import { cn } from "@/lib/utils";
import { AdmitCardsTab } from "./admit/AdmitCardsTab";
import { ExamsTab } from "./ExamsTab";
import { FinalResultsTab } from "./final/FinalResultsTab";
import { GradingScales } from "./GradingScales";
import { MarksTab } from "./marks/MarksTab";
import { OptionalSubjects } from "./OptionalSubjects";
import { CardSettingsTab } from "./results/CardSettingsTab";
import { ResultsTab } from "./results/ResultsTab";
import { ResultSettings } from "./ResultSettings";
import { SeatingTab } from "./seating/SeatingTab";

const ICONS: Record<string, LucideIcon> = {
  exams: ListChecks,
  marks: PencilLine,
  results: FileChartColumn,
  final: Award,
  seating: Armchair,
  admit: IdCard,
  card: FileBadge,
  optional: Split,
  scales: Ruler,
  settings: SlidersHorizontal,
};
// the parts used for every exam are tabs (exam work, then exam day); the ones set once a year
// sit in the Setup menu at the strip's end
const DAILY = ["exams", "marks", "results", "final", "seating", "admit"];
const EXAM_DAY = "seating";
const SETUP = ["card", "optional", "scales", "settings"];

/*
 * Exams and results: the header panel, then the tab strip: the everyday parts as tabs, the
 * set-once parts in a Setup menu. The open part is in the address (/exams?tab=marks), so Back,
 * reloads and links return to it.
 */
export function ExamsPage() {
  const t = useTranslations("school.exams");
  const can = useCan();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
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

  const asked = params.get("tab");
  const tab = asked && tabs.includes(asked) ? asked : tabs[0];
  const setTab = (next: string) => {
    const query = new URLSearchParams(params);
    if (next === tabs[0]) query.delete("tab");
    else query.set("tab", next);
    const qs = query.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // set by "Enter marks" on an exam: the Marks tab opens on that exam and class
  const [marksStart, setMarksStart] = useState<{ examId: string; classId: string; at: number } | undefined>();

  // the classes of this year's exams still taking marks (the same list the Exams tab loads)
  const { data: exams } = useExams(undefined, { enabled: can("exam:view") });
  const marksDue = exams?.items.reduce((n, e) => n + e.classes.filter((c) => c.status === "MARKS_ENTRY").length, 0) ?? 0;

  const label = (name: string) => t(`tabs.${name}` as "tabs.scales");
  const daily = DAILY.filter((name) => tabs.includes(name));
  const setup = SETUP.filter((name) => tabs.includes(name));
  const inSetup = setup.includes(tab);

  return (
    <div className="space-y-2">
      <PageHero title={t("title")} description={t("description")} />

      <Tabs value={tab} onValueChange={setTab} className="gap-2">
        <TabsList
          variant="strip"
          end={
            setup.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={t("setup.label")}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-lg border border-border/70 bg-muted/60 px-2.5 text-[15px] font-semibold whitespace-nowrap outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:px-3 data-[state=open]:bg-card",
                    // a set-once part is open: the button shows which, in the accent
                    inSetup && "border-navy/30 bg-brand-soft text-navy hover:bg-brand-soft",
                  )}
                >
                  <Settings2 className="size-4 text-muted-foreground" />
                  <span className={cn("max-sm:hidden", inSetup && "max-sm:inline max-sm:max-w-28 max-sm:truncate")}>
                    {inSetup ? label(tab) : t("setup.label")}
                  </span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[min(19rem,calc(100vw-1.5rem))] p-1.5">
                  {setup.map((name) => {
                    const Icon = ICONS[name];
                    return (
                      <DropdownMenuItem key={name} onSelect={() => setTab(name)} className="items-center gap-3 rounded-lg p-2">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-navy">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[15px] font-semibold">{label(name)}</span>
                          <span className="block text-[13px] text-muted-foreground">{t(`setup.hints.${name}` as "setup.hints.card")}</span>
                        </span>
                        {tab === name && <Check className="size-4 text-navy" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          }
        >
          {daily.map((name) => {
            const Icon = ICONS[name];
            return (
              <span key={name} className="contents">
                {/* a hairline before the exam-day parts */}
                {name === EXAM_DAY && daily.indexOf(name) > 0 && <span aria-hidden className="mx-1.5 h-5 w-px shrink-0 self-center bg-border" />}
                <TabsTrigger value={name}>
                  <Icon />
                  {label(name)}
                  {name === "marks" && marksDue > 0 && (
                    <span className="rounded-full bg-amber-50 px-2 py-px text-[12px] font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      {t("setup.marksDue", { count: marksDue })}
                    </span>
                  )}
                </TabsTrigger>
              </span>
            );
          })}
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
          <ResultSettings canManage={canManageGrading} onOpenScales={() => setTab("scales")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
