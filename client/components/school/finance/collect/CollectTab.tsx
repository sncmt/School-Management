"use client";

import { ArrowLeftRight, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/lib/auth/hooks";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { usePayments } from "@/lib/school/collection";
import { useStudent } from "@/lib/school/students";
import { PayView } from "./PayView";
import { Pager, PaymentsTable } from "./PaymentsTab";
import { StudentFeesView } from "./StudentFeesView";
import { StudentPicker } from "./StudentPicker";

/** The cashier's screen: find the student, then take a payment, see their fees or past payments. */
export function CollectTab({ studentId, onStudent }: { studentId: string | null; onStudent: (id: string | null) => void }) {
  const t = useTranslations("school.finance.collect");
  if (!studentId) {
    return (
      <Card className="max-w-3xl">
        <CardContent className="space-y-3 pt-6">
          <div className="text-sm font-medium">{t("pickTitle")}</div>
          <StudentPicker onPick={onStudent} />
        </CardContent>
      </Card>
    );
  }
  return <StudentPanel key={studentId} studentId={studentId} onChange={() => onStudent(null)} />;
}

function StudentPanel({ studentId, onChange }: { studentId: string; onChange: () => void }) {
  const t = useTranslations("school.finance.collect");
  const describeError = useErrorMessage();
  const name = useLocalizedName();
  const can = useCan();
  const student = useStudent(studentId);
  const tabs = [can("payment:create") && "pay", can("student_fee:view") && "fees", can("payment:view") && "history"].filter(Boolean) as string[];

  if (student.isPending) return <Skeleton className="h-48" />;
  if (student.isError) {
    return (
      <div className="space-y-2 py-8 text-center text-sm text-muted-foreground">
        <p>{describeError(student.error)}</p>
        <Button variant="outline" size="sm" onClick={onChange}>
          {t("change")}
        </Button>
      </div>
    );
  }

  const s = student.data;
  const current = s.enrollments[0];
  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          {s.photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed links to private storage
            <img src={s.photo} alt="" className="size-14 rounded-full object-cover" />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-full bg-muted text-lg font-semibold">{name(s).slice(0, 1)}</div>
          )}
          <div className="flex-1">
            <div className="text-lg font-semibold">{name(s)}</div>
            <div className="text-sm text-muted-foreground">
              {t("admissionNo", { no: s.admissionNo })}
              {current &&
                ` · ${current.class.name}${current.section.isDefault ? "" : ` · ${current.section.name}`}${current.rollNumber ? ` · ${t("roll", { roll: current.rollNumber })}` : ""} · ${current.academicYear.name}`}
              {s.status !== "ACTIVE" && ` · ${t(`status.${s.status}`)}`}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/students/${s.id}`}>
                <ExternalLink /> {t("profile")}
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={onChange}>
              <ArrowLeftRight /> {t("change")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={tabs[0]}>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {t(`tabs.${tab}` as "tabs.pay")}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="pay">
          <PayView studentId={studentId} />
        </TabsContent>
        <TabsContent value="fees">
          <StudentFeesView studentId={studentId} enrollments={s.enrollments} />
        </TabsContent>
        <TabsContent value="history">
          <StudentPayments studentId={studentId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StudentPayments({ studentId }: { studentId: string }) {
  const [page, setPage] = useState(1);
  const payments = usePayments({ studentId, page, limit: 20 });
  return (
    <div className="space-y-2">
      <PaymentsTable data={payments.data} isPending={payments.isPending} isFetching={payments.isFetching} error={payments.error} onRetry={() => payments.refetch()} />
      {payments.data && payments.data.meta.totalPages > 1 && <Pager page={page} totalPages={payments.data.meta.totalPages} onPage={setPage} />}
    </div>
  );
}
