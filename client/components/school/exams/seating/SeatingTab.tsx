"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/lib/auth/hooks";
import { DutiesTab } from "./DutiesTab";
import { RoomsTab } from "./RoomsTab";
import { SeatPlanTab } from "./SeatPlanTab";

/** Exam seating: each exam's seat plan, its invigilators, and the school's rooms. */
export function SeatingTab() {
  const t = useTranslations("school.exams.seating");
  const can = useCan();
  const canManage = can("exam:seat_plan");
  return (
    <Tabs defaultValue="plan">
      {/* inside the Exams tabs: the small chip tabs */}
      <TabsList variant="chip">
        <TabsTrigger value="plan">{t("tabs.plan")}</TabsTrigger>
        <TabsTrigger value="duties">{t("tabs.duties")}</TabsTrigger>
        <TabsTrigger value="rooms">{t("tabs.rooms")}</TabsTrigger>
      </TabsList>
      <TabsContent value="plan">
        <SeatPlanTab canManage={canManage} />
      </TabsContent>
      <TabsContent value="duties">
        <DutiesTab canManage={canManage} />
      </TabsContent>
      <TabsContent value="rooms">
        <RoomsTab canManage={canManage} />
      </TabsContent>
    </Tabs>
  );
}
