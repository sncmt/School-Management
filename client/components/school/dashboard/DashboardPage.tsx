"use client";

import type { LucideIcon } from "lucide-react";
import { Banknote, ClipboardCheck, GraduationCap, Users } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSchoolMe } from "@/lib/auth/hooks";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useDashboard, type DashboardSummary } from "@/lib/school/dashboard";
import { useMoney } from "@/lib/school/finance";
import { cn } from "@/lib/utils";
import { useFamilyHome, useFamilyRole } from "@/lib/school/family";
import { ChildrenGrid, FamilyHome } from "../family/FamilyHome";
import { ReceiptDialog } from "../finance/collect/ReceiptDialog";
import { FeesChart } from "./FeesChart";
import { MiniCalendar } from "./MiniCalendar";
import { MyDutiesPanel, NoticesPanel, Panel, PanelLink, UpcomingPanel } from "./panels";
import { SubscriptionPanel } from "./SubscriptionPanel";

/** The school's home: the numbers that matter today, each part shown only to those allowed to see it. */
export function DashboardPage() {
  const t = useTranslations("school.home");
  const describeError = useErrorMessage();
  const me = useSchoolMe();
  const format = useFormatter();
  const now = useNow();

  // the family login gets its children's home; staff who are also a parent here get both
  const { isFamily, isStaff } = useFamilyRole();
  const { data, isPending, error } = useDashboard(!!me && isStaff);
  const family = useFamilyHome(isFamily && isStaff);

  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Dhaka" }).format(now));
  const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t(`greeting.${greeting}`, { name: me?.user.fullname ?? "" })}</h1>
        <p className="text-sm text-muted-foreground">{format.dateTime(now, { dateStyle: "full", timeZone: "Asia/Dhaka" })}</p>
      </div>

      {me && isFamily && !isStaff ? (
        <FamilyHome />
      ) : (
        <>
          {/* the school's subscription and its payment history: the super admin only, first thing they see */}
          {me?.isSuperAdmin && <SubscriptionPanel />}
          {family.data && family.data.children.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold">{t("yourChildren")}</h2>
              <ChildrenGrid items={family.data.children} mainYearId={family.data.academicYear?.id} canPayOnline={family.data.onlinePayment.enabled} />
            </section>
          )}
          <StaffDashboard data={data} isPending={!me || isPending} error={error} describeError={describeError} />
        </>
      )}
    </div>
  );
}

function StaffDashboard({
  data,
  isPending,
  error,
  describeError,
}: {
  data: DashboardSummary | undefined;
  isPending: boolean;
  error: unknown;
  describeError: (e: unknown) => string;
}) {
  return (
    <>
      {isPending || !data ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <p className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">{describeError(error)}</p>
      ) : (
        <Dashboard data={data} />
      )}
    </>
  );
}

function Dashboard({ data }: { data: DashboardSummary }) {
  const t = useTranslations("school.home");
  const format = useFormatter();
  const money = useMoney();
  const n = (v: number) => format.number(v);

  const cards: ReactNode[] = [];
  if (data.students)
    cards.push(
      <StatCard key="s" icon={Users} tone="emerald" label={t("stats.students")} value={n(data.students.total)} sub={t("stats.boysGirls", { boys: n(data.students.boys), girls: n(data.students.girls) })} href="/students" />,
    );
  if (data.teachers)
    cards.push(
      <StatCard key="t" icon={GraduationCap} tone="blue" label={t("stats.teachers")} value={n(data.teachers.working)} sub={data.teachers.onLeave > 0 ? t("stats.onLeave", { count: data.teachers.onLeave }) : t("stats.allWorking")} href="/teachers" />,
    );
  if (data.attendance)
    cards.push(
      <StatCard
        key="a"
        icon={ClipboardCheck}
        tone="amber"
        label={t("stats.attendance")}
        value={data.attendance.presentPercent === null ? "—" : `${format.number(data.attendance.presentPercent, { maximumFractionDigits: 1 })}%`}
        sub={t("stats.sectionsTaken", { taken: n(data.attendance.sectionsTaken), total: n(data.attendance.sections) })}
        href="/attendance"
      />,
    );
  if (data.money)
    cards.push(
      <StatCard key="m" icon={Banknote} tone="violet" label={t("stats.collected")} value={money(data.money.thisMonth.collected)} sub={t("stats.today", { amount: money(data.money.today.collected) })} href="/fees" />,
    );

  return (
    <div className="space-y-6">
      {cards.length > 0 && <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{cards}</div>}

      {(data.money || data.attendance) && (
        <div className="grid gap-5 lg:grid-cols-3">
          {data.money && (
            <Panel
              title={t("chart.title")}
              className="lg:col-span-2"
              action={<PanelLink href="/finance">{t("openFinance")}</PanelLink>}
            >
              <div className="mb-5 flex flex-wrap gap-x-8 gap-y-2">
                <Figure label={t("chart.collectedThisMonth")} value={money(data.money.thisMonth.collected)} />
                <Figure label={t("chart.spentThisMonth")} value={money(data.money.thisMonth.spent)} />
                <Figure label={t("chart.dueNow")} value={money(data.money.dueNow)} />
              </div>
              <FeesChart months={data.money.months} />
            </Panel>
          )}
          {data.attendance && <AttendancePanel attendance={data.attendance} className={data.money ? "" : "lg:col-span-3"} />}
        </div>
      )}

      {/* a teacher's own invigilation duties, when there are any coming up */}
      <MyDutiesPanel />

      <NoticesPanel />

      {(data.upcoming || data.recentPayments) && (
        <div className="grid gap-5 lg:grid-cols-3">
          {data.upcoming && (
            <Panel title={t("calendar.title")} action={<PanelLink href="/calendar">{t("openCalendar")}</PanelLink>}>
              <MiniCalendar />
            </Panel>
          )}
          {data.upcoming && <UpcomingPanel items={data.upcoming} />}
          {data.recentPayments && <PaymentsPanel items={data.recentPayments} />}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ pieces

const TONES = {
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400",
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400",
};

/* A headline number: the icon and what it is on the left, the number on the right. */
function StatCard({ icon: Icon, tone, label, value, sub, href }: { icon: LucideIcon; tone: keyof typeof TONES; label: string; value: string; sub: string; href: string }) {
  return (
    <Link href={href} className="group flex items-center gap-5 rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-shadow hover:shadow-md">
      <div className="flex w-24 shrink-0 flex-col items-center gap-2 text-center">
        <span className={cn("flex size-12 items-center justify-center rounded-full", TONES[tone])}>
          <Icon className="size-6" />
        </span>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="h-14 w-px bg-border" />
      <div className="min-w-0 flex-1 text-right">
        <div className="truncate text-[28px] leading-tight font-semibold tracking-tight tabular-nums">{value}</div>
        <div className="truncate text-xs text-muted-foreground">{sub}</div>
      </div>
    </Link>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

// today's roll calls: one bar split by status (each with its label and number, never colour alone)
const STATUSES = [
  { key: "present", bar: "bg-[#0ca30c]" },
  { key: "late", bar: "bg-[#fab219]" },
  { key: "absent", bar: "bg-[#d03b3b]" },
  { key: "leave", bar: "bg-muted-foreground/40" },
] as const;

function AttendancePanel({ attendance, className }: { attendance: NonNullable<DashboardSummary["attendance"]>; className?: string }) {
  const t = useTranslations("school.home.attendance");
  const format = useFormatter();
  const total = attendance.marked;
  return (
    <Panel title={t("title")} className={className} action={<PanelLink href="/attendance">{t("open")}</PanelLink>}>
      {total === 0 ? (
        <div className="flex h-full min-h-48 flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
          <ClipboardCheck className="mb-1 size-8 text-muted-foreground/50" />
          <p>{t("none")}</p>
          <p className="text-xs">{t("sections", { taken: format.number(attendance.sectionsTaken), total: format.number(attendance.sections) })}</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <div className="text-4xl font-semibold tracking-tight tabular-nums">
              {attendance.presentPercent === null ? "—" : `${format.number(attendance.presentPercent, { maximumFractionDigits: 1 })}%`}
            </div>
            <div className="text-sm text-muted-foreground">{t("presentOf", { count: format.number(total) })}</div>
          </div>
          <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
            {STATUSES.map((s) =>
              attendance[s.key] > 0 ? <div key={s.key} className={s.bar} style={{ flexGrow: attendance[s.key] }} title={t(s.key)} /> : null,
            )}
          </div>
          <ul className="space-y-2 text-sm">
            {STATUSES.map((s) => (
              <li key={s.key} className="flex items-center gap-2">
                <span className={cn("size-2.5 rounded-full", s.bar)} />
                <span className="flex-1 text-muted-foreground">{t(s.key)}</span>
                <span className="font-medium tabular-nums">{format.number(attendance[s.key])}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{t("sections", { taken: format.number(attendance.sectionsTaken), total: format.number(attendance.sections) })}</p>
        </div>
      )}
    </Panel>
  );
}

function PaymentsPanel({ items }: { items: NonNullable<DashboardSummary["recentPayments"]> }) {
  const t = useTranslations("school.home.payments");
  const format = useFormatter();
  const name = useLocalizedName();
  const money = useMoney();
  const now = useNow({ updateInterval: 60_000 });
  const [receipt, setReceipt] = useState<string | null>(null);
  return (
    <Panel title={t("title")} action={<PanelLink href="/fees">{t("open")}</PanelLink>}>
      {items.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <Banknote className="size-8 text-muted-foreground/50" />
          {t("none")}
        </div>
      ) : (
        <ol className="relative space-y-4 border-l border-border pl-5">
          {items.map((p) => (
            <li key={p.id} className="relative">
              <span
                className={cn(
                  "absolute top-1.5 -left-[25px] size-2.5 rounded-full ring-4 ring-card",
                  p.status === "CANCELLED" ? "bg-muted-foreground/50" : "bg-[#0ca30c]",
                )}
              />
              <button type="button" onClick={() => setReceipt(p.id)} className="block w-full text-left">
                <div className="text-xs text-muted-foreground">{format.relativeTime(new Date(p.paidAt), now)}</div>
                <div className={cn("text-sm", p.status === "CANCELLED" && "text-muted-foreground line-through")}>
                  {t.rich("line", {
                    amount: money(p.amount),
                    student: name(p.student),
                    b: (chunks) => <span className="font-semibold text-foreground">{chunks}</span>,
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("receipt", { no: p.receiptNo })}
                  {p.status === "CANCELLED" && ` · ${t("cancelled")}`}
                </div>
              </button>
            </li>
          ))}
        </ol>
      )}
      <ReceiptDialog paymentId={receipt} onClose={() => setReceipt(null)} />
    </Panel>
  );
}
