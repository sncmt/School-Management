"use client";

import { ArrowLeft, HandCoins, Printer } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/lib/auth/hooks";
import { useLocalizedName } from "@/lib/i18n/names";
import { useAcademicYears } from "@/lib/school/academicYears";
import { bdDayEnd, bdDayStart } from "@/lib/school/collection";
import { useMoney, useMonthName } from "@/lib/school/finance";
import { useClassDues, useCollectionReport, useStudentDues } from "@/lib/school/ledger";
import { localPhone } from "@/lib/school/students";
import { cn } from "@/lib/utils";
import { ListState } from "../shared";
import { DayRange, thisMonth } from "./DayRange";
import { Tile } from "./LedgerTab";

/** Finance reports: money collected and spent over some days, and what is owed now. */
export function ReportsTab({ onCollect }: { onCollect: (studentId: string) => void }) {
  const t = useTranslations("school.finance.reports");
  return (
    <Tabs defaultValue="collection">
      <TabsList className="no-print">
        <TabsTrigger value="collection">{t("tabs.collection")}</TabsTrigger>
        <TabsTrigger value="dues">{t("tabs.dues")}</TabsTrigger>
      </TabsList>
      <TabsContent value="collection">
        <CollectionReport />
      </TabsContent>
      <TabsContent value="dues">
        <DuesReport onCollect={onCollect} />
      </TabsContent>
    </Tabs>
  );
}

function PrintButton() {
  const t = useTranslations("school.finance.reports");
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()}>
      <Printer /> {t("print")}
    </Button>
  );
}

/* A small titled table of name -> amount, with a total row when asked. */
function AmountTable({ title, rows, total }: { title: string; rows: { key: string; label: ReactNode; amount: string }[]; total?: string }) {
  const t = useTranslations("school.finance.reports");
  const money = useMoney();
  return (
    <div className="rounded-md border">
      <div className="border-b bg-muted/40 px-3 py-2 text-sm font-medium">{title}</div>
      {rows.length === 0 ? (
        <p className="px-3 py-4 text-sm text-muted-foreground">{t("nothing")}</p>
      ) : (
        <Table>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell>{r.label}</TableCell>
                <TableCell className="text-right tabular-nums">{money(r.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
          {total !== undefined && (
            <TableFooter>
              <TableRow>
                <TableCell>{t("total")}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">{money(total)}</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- collection

function CollectionReport() {
  const t = useTranslations("school.finance.reports.collection");
  const tMethod = useTranslations("school.finance.payments.methods");
  const format = useFormatter();
  const name = useLocalizedName();
  const money = useMoney();
  const [range, setRange] = useState(thisMonth);
  const report = useCollectionReport({ from: bdDayStart(range.from), to: bdDayEnd(range.to) });
  const d = report.data;
  const day = (key: string) => format.dateTime(new Date(`${key}T00:00:00Z`), { dateStyle: "medium", timeZone: "UTC" });

  return (
    <div className="space-y-3">
      <div className="no-print flex flex-wrap items-end justify-between gap-2">
        <DayRange value={range} onChange={setRange} idPrefix="report" />
        <PrintButton />
      </div>
      <ListState isPending={report.isPending} error={report.error} onRetry={() => report.refetch()} empty={null}>
        {d && (
          <div className={cn("print-area space-y-3", report.isFetching && "opacity-60")}>
            <div>
              <h3 className="text-lg font-semibold">{t("title")}</h3>
              <p className="text-sm text-muted-foreground">
                {range.from === range.to ? day(range.from) : t("range", { from: day(range.from), to: day(range.to) })}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Tile label={t("collected")} value={money(d.collected.total)} sub={t("payments", { count: d.collected.count })} />
              <Tile label={t("spent")} value={money(d.expenses.total)} />
              <Tile label={t("net")} value={money(d.net)} sub={t("netHint")} />
              <Tile label={t("cancelled")} value={money(d.cancelled.total)} sub={t("payments", { count: d.cancelled.count })} />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <AmountTable title={t("byMethod")} rows={d.byMethod.map((m) => ({ key: m.method, label: tMethod(m.method), amount: m.amount }))} />
              <AmountTable title={t("byFeeType")} rows={d.byFeeType.map((f) => ({ key: f.feeType.id, label: name(f.feeType), amount: f.amount }))} />
              <AmountTable title={t("byFund")} rows={d.byFund.map((f) => ({ key: f.fund.id, label: name(f.fund), amount: f.amount }))} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <AmountTable title={t("byDay")} rows={d.byDay.map((x) => ({ key: x.day, label: day(x.day), amount: x.amount }))} total={d.collected.total} />
              <AmountTable
                title={t("expensesByCategory")}
                rows={d.expenses.byCategory.map((c) => ({ key: c.category ?? "", label: c.category ?? "—", amount: c.amount }))}
                total={d.expenses.total}
              />
            </div>
          </div>
        )}
      </ListState>
    </div>
  );
}

// ---------------------------------------------------------------------- dues

function DuesReport({ onCollect }: { onCollect: (studentId: string) => void }) {
  const [classId, setClassId] = useState<string | null>(null);
  const years = useAcademicYears();
  const [yearId, setYearId] = useState<string | undefined>();
  const year = years.data?.find((y) => y.id === yearId) ?? years.data?.find((y) => y.isCurrent);

  const yearSelect = (
    <Select value={year?.id ?? ""} onValueChange={setYearId}>
      <SelectTrigger className="no-print w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {years.data?.map((y) => (
          <SelectItem key={y.id} value={y.id}>
            {y.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return classId ? (
    <ClassDues yearId={year?.id} classId={classId} onBack={() => setClassId(null)} onCollect={onCollect} />
  ) : (
    <AllClassDues yearId={year?.id} yearSelect={yearSelect} onClass={setClassId} />
  );
}

function AllClassDues({ yearId, yearSelect, onClass }: { yearId?: string; yearSelect: ReactNode; onClass: (id: string) => void }) {
  const t = useTranslations("school.finance.reports.dues");
  const format = useFormatter();
  const money = useMoney();
  const dues = useClassDues(yearId);
  const d = dues.data;

  return (
    <div className="space-y-3">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {yearSelect}
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <PrintButton />
      </div>
      <ListState isPending={dues.isPending} error={dues.error} onRetry={() => dues.refetch()} empty={null}>
        {d && (
          <div className="print-area space-y-3">
            <h3 className="text-lg font-semibold">{t("title", { year: d.academicYear.name })}</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              <Tile label={t("totalDue")} value={money(d.total)} sub={t("thisYearOnly", { year: d.academicYear.name })} />
              <Tile label={t("previousDue")} value={money(d.previousTotal)} sub={t("previousHint")} />
              <Tile label={t("studentsWithDues")} value={format.number(d.studentsWithDues)} />
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columns.class")}</TableHead>
                    <TableHead className="text-right">{t("columns.students")}</TableHead>
                    <TableHead className="text-right">{t("columns.withDues")}</TableHead>
                    <TableHead className="text-right">{t("columns.due")}</TableHead>
                    <TableHead className="text-right">{t("columns.previous")}</TableHead>
                    <TableHead className="text-right">{t("columns.total")}</TableHead>
                    <TableHead className="no-print w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.classes.map((c) => (
                    <TableRow key={c.class.id}>
                      <TableCell className="font-medium">{c.class.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{format.number(c.students)}</TableCell>
                      <TableCell className="text-right tabular-nums">{format.number(c.studentsWithDues)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(c.amount)}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(c.previous) > 0 ? money(c.previous) : "—"}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{money(Number(c.amount) + Number(c.previous))}</TableCell>
                      <TableCell className="no-print text-right">
                        {c.studentsWithDues > 0 && (
                          <Button variant="ghost" size="sm" onClick={() => onClass(c.class.id)}>
                            {t("view")}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </ListState>
    </div>
  );
}

function ClassDues({
  yearId,
  classId,
  onBack,
  onCollect,
}: {
  yearId?: string;
  classId: string;
  onBack: () => void;
  onCollect: (studentId: string) => void;
}) {
  const t = useTranslations("school.finance.reports.dues");
  const format = useFormatter();
  const name = useLocalizedName();
  const money = useMoney();
  const monthName = useMonthName();
  const can = useCan();
  const dues = useStudentDues({ academicYearId: yearId, classId });
  const d = dues.data;

  return (
    <div className="space-y-3">
      <div className="no-print flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft /> {t("allClasses")}
        </Button>
        <PrintButton />
      </div>
      <ListState isPending={dues.isPending} error={dues.error} onRetry={() => dues.refetch()} empty={d?.students.length === 0 ? t("noDues") : null}>
        {d && (
          <div className="print-area space-y-3">
            <div>
              <h3 className="text-lg font-semibold">{t("classTitle", { class: d.class.name, year: d.academicYear.name })}</h3>
              <p className="text-sm text-muted-foreground">
                {t("classSummary", { count: d.students.length, amount: money(Number(d.total) + Number(d.previousTotal)) })}
                {Number(d.previousTotal) > 0 && ` ${t("classPrevious", { amount: money(d.previousTotal) })}`}
              </p>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columns.roll")}</TableHead>
                    <TableHead>{t("columns.student")}</TableHead>
                    <TableHead>{t("columns.phone")}</TableHead>
                    <TableHead>{t("columns.since")}</TableHead>
                    <TableHead className="text-right">{t("columns.fees")}</TableHead>
                    <TableHead className="text-right">{t("columns.due")}</TableHead>
                    <TableHead className="text-right">{t("columns.previous")}</TableHead>
                    <TableHead className="text-right">{t("columns.total")}</TableHead>
                    <TableHead className="no-print w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {d.students.map((s) => (
                    <TableRow key={s.student.id}>
                      <TableCell className="tabular-nums">
                        {s.section.isDefault ? "" : `${s.section.name} · `}
                        {s.rollNumber ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{name(s.student)}</div>
                        <div className="text-xs text-muted-foreground">{s.student.admissionNo}</div>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">{localPhone(s.student.guardianPhone ?? s.student.phone)}</TableCell>
                      <TableCell className="text-sm">
                        {s.oldestMonth ? `${monthName(s.oldestMonth.month, "short")} ${format.number(s.oldestMonth.year, { useGrouping: false })}` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{format.number(s.fees)}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(s.amount)}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(s.previous) > 0 ? money(s.previous) : "—"}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{money(Number(s.amount) + Number(s.previous))}</TableCell>
                      <TableCell className="no-print">
                        {can("payment:create") && (
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => onCollect(s.student.id)} aria-label={t("collect")}>
                            <HandCoins />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </ListState>
    </div>
  );
}
