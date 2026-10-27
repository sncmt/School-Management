"use client";

import { ArrowUpRight, Banknote, ClipboardCheck, GraduationCap, Megaphone, UserPlus, Users, type LucideIcon } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan, useSchoolMe } from "@/lib/auth/hooks";
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

/** The school's home: the numbers that matter today, each part shown only to those allowed to see it. */
export function DashboardPage() {
  const t = useTranslations("school.home");
  const describeError = useErrorMessage();
  const me = useSchoolMe();

  // the family login gets its children's home; staff who are also a parent here get both
  const { isFamily, isStaff } = useFamilyRole();
  const { data, isPending, error } = useDashboard(!!me && isStaff);
  const family = useFamilyHome(isFamily && isStaff);

  return (
    <div className="space-y-6">
      <WelcomeBanner name={me?.user.fullname ?? ""} year={data?.academicYear?.name} showActions={isStaff} />

      {me && isFamily && !isStaff ? (
        <FamilyHome />
      ) : (
        <>
          {family.data && family.data.children.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold">{t("yourChildren")}</h2>
              <ChildrenGrid items={family.data.children} mainYearId={family.data.academicYear?.id} canPayOnline={family.data.onlinePayment.enabled} />
            </section>
          )}
          {!me || isPending || !data ? (
            error ? (
              <p className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">{describeError(error)}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-[154px] rounded-2xl" />
                ))}
              </div>
            )
          ) : (
            <Dashboard data={data} />
          )}
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ welcome

/* The greeting on the school's own colour, with the jobs people come here to do. */
function WelcomeBanner({ name, year, showActions }: { name: string; year?: string; showActions: boolean }) {
  const t = useTranslations("school.home");
  const format = useFormatter();
  const can = useCan();
  const now = useNow({ updateInterval: 60_000 });

  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Dhaka" }).format(now));
  const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  const actions = (
    [
      can("payment:create") && { href: "/fees", icon: Banknote, label: t("actions.collect") },
      can("attendance:mark") && { href: "/attendance", icon: ClipboardCheck, label: t("actions.attendance") },
      can("student:create") && { href: "/students/new", icon: UserPlus, label: t("actions.addStudent") },
      can("notice:create") && { href: "/notices", icon: Megaphone, label: t("actions.notice") },
    ].filter(Boolean) as { href: string; icon: LucideIcon; label: string }[]
  ).slice(0, showActions ? 4 : 0);

  return (
    <section className="dark relative isolate overflow-hidden rounded-2xl bg-school-sidebar px-6 py-6 text-white sm:px-8 sm:py-7">
      {/* dots fading in from the right, and a warm light in the corner */}
      <div aria-hidden className="site-dots absolute inset-0 -z-10 text-white/[0.07] [mask-image:linear-gradient(to_left,black,transparent_65%)]" />
      <div aria-hidden className="absolute -top-24 -right-16 -z-10 size-72 rounded-full bg-sidebar-primary/25 blur-3xl" />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/65">
            {format.dateTime(now, { dateStyle: "full", timeZone: "Asia/Dhaka" })}
            {year && (
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/85 ring-1 ring-white/15">{t("year", { name: year })}</span>
            )}
          </p>
          <h1 className="mt-2 truncate text-2xl font-bold tracking-tight sm:text-[1.75rem]">{t(`greeting.${greeting}`, { name })}</h1>
          <p className="mt-1 text-sm text-white/70">{t("banner")}</p>
        </div>

        {actions.length > 0 && (
          <nav aria-label={t("actions.label")} className="flex flex-wrap gap-2">
            {actions.map((a, i) => (
              <Link
                key={a.href}
                href={a.href}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
                  i === 0
                    ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-white hover:text-school-sidebar"
                    : "bg-white/10 text-white ring-1 ring-white/15 hover:bg-white hover:text-school-sidebar",
                )}
              >
                <a.icon className="size-4" />
                {a.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ the staff dashboard

function Dashboard({ data }: { data: DashboardSummary }) {
  const t = useTranslations("school.home");
  const format = useFormatter();
  const money = useMoney();
  const n = (v: number) => format.number(v);
  const percent = (v: number) => `${format.number(v, { maximumFractionDigits: 1 })}%`;

  const cards: ReactNode[] = [];
  if (data.students) {
    const { total, boys, girls } = data.students;
    cards.push(
      <Kpi key="s" href="/students" icon={Users} tint="bg-brand-soft text-brand" label={t("stats.students")} value={n(total)} sub={t("stats.boysGirls", { boys: n(boys), girls: n(girls) })}>
        <SplitBar parts={[{ value: boys, className: "bg-brand" }, { value: girls, className: "bg-sidebar-primary" }]} />
      </Kpi>,
    );
  }
  if (data.teachers) {
    const { working, onLeave } = data.teachers;
    cards.push(
      <Kpi
        key="t"
        href="/teachers"
        icon={GraduationCap}
        tint="bg-violet-500/10 text-violet-600 dark:text-violet-400"
        label={t("stats.teachers")}
        value={n(working)}
        sub={onLeave > 0 ? t("stats.onLeave", { count: onLeave }) : t("stats.allWorking")}
      >
        <SplitBar parts={[{ value: working, className: "bg-violet-500" }, { value: onLeave, className: "bg-muted-foreground/30" }]} />
      </Kpi>,
    );
  }
  if (data.attendance) {
    const p = data.attendance.presentPercent;
    cards.push(
      <Kpi
        key="a"
        href="/attendance"
        icon={ClipboardCheck}
        tint="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        label={t("stats.attendance")}
        value={p === null ? "—" : percent(p)}
        sub={t("stats.sectionsTaken", { taken: n(data.attendance.sectionsTaken), total: n(data.attendance.sections) })}
      >
        <SplitBar parts={[{ value: p ?? 0, className: "bg-emerald-500" }, { value: p === null ? 100 : 100 - p, className: "bg-muted" }]} />
      </Kpi>,
    );
  }
  if (data.money) {
    cards.push(
      <Kpi
        key="m"
        href="/fees"
        icon={Banknote}
        tint="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        label={t("stats.collected")}
        value={money(data.money.thisMonth.collected)}
        sub={t("stats.today", { amount: money(data.money.today.collected) })}
      >
        <Sparkline values={data.money.months.map((m) => Number(m.collected))} />
      </Kpi>,
    );
  }

  const hasRail = !!(data.attendance || data.upcoming || data.recentPayments);

  return (
    <div className="space-y-6">
      {cards.length > 0 && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards}</div>}

      <div className={cn("grid items-start gap-6", hasRail && "xl:grid-cols-3")}>
        {/* the main column: money, notices, duties */}
        <div className="space-y-6 xl:col-span-2">
          {data.money && (
            <Panel title={t("chart.title")} description={t("chart.subtitle")} action={<PanelLink href="/finance">{t("openFinance")}</PanelLink>}>
              <dl className="mb-6 grid grid-cols-3 divide-x rounded-xl border bg-muted/30">
                <Figure label={t("chart.collectedThisMonth")} value={money(data.money.thisMonth.collected)} dot="bg-[#2a78d6] dark:bg-[#3987e5]" />
                <Figure label={t("chart.spentThisMonth")} value={money(data.money.thisMonth.spent)} dot="bg-[#eb6834] dark:bg-[#d95926]" />
                <Figure label={t("chart.dueNow")} value={money(data.money.dueNow)} />
              </dl>
              <FeesChart months={data.money.months} />
            </Panel>
          )}
          <NoticesPanel />
          {/* a teacher's own invigilation duties, when there are any coming up */}
          <MyDutiesPanel />
        </div>

        {/* the rail: today, the calendar, the latest money in */}
        {hasRail && (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-1">
            {data.attendance && <AttendancePanel attendance={data.attendance} />}
            {data.recentPayments && <PaymentsPanel items={data.recentPayments} />}
            {data.upcoming && (
              <Panel title={t("calendar.title")} action={<PanelLink href="/calendar">{t("openCalendar")}</PanelLink>}>
                <MiniCalendar />
              </Panel>
            )}
            {data.upcoming && <UpcomingPanel items={data.upcoming} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ pieces

/* A headline number for the dashboard: what it is, the number, a small picture of it and a line under it. */
function Kpi({
  href,
  icon: Icon,
  tint,
  label,
  value,
  sub,
  children,
}: {
  href: string;
  icon: LucideIcon;
  tint: string;
  label: string;
  value: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-border/70 bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-[0_14px_34px_-18px_rgb(15_23_42/0.35)]"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2.5 text-[13px] font-medium text-muted-foreground">
          <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", tint)}>
            <Icon className="size-4" />
          </span>
          <span className="truncate">{label}</span>
        </span>
        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
      </span>
      <span className="mt-4 truncate text-[1.75rem] leading-none font-semibold tracking-tight tabular-nums">{value}</span>
      <span aria-hidden className="mt-4 block">
        {children}
      </span>
      <span className="mt-2.5 block truncate text-xs text-muted-foreground">{sub}</span>
    </Link>
  );
}

/* One thin bar split into parts by their size (the numbers are always in words beside it). */
function SplitBar({ parts }: { parts: { value: number; className: string }[] }) {
  const shown = parts.filter((p) => p.value > 0);
  return (
    <span className="flex h-1.5 gap-[3px] overflow-hidden rounded-full bg-muted">
      {shown.map((p, i) => (
        <span key={i} className={cn("rounded-full", p.className)} style={{ flexGrow: p.value }} />
      ))}
    </span>
  );
}

const SPARK_W = 120;
const SPARK_H = 28;

/* The last months' fees as a small line with a soft fill, the latest month dotted. */
function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? SPARK_W / (values.length - 1) : 0;
  const points = values.map((v, i) => [i * step, SPARK_H - 3 - (v / max) * (SPARK_H - 6)] as const);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  if (!last) return <span className="block h-1.5 rounded-full bg-muted" />;
  return (
    <svg viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} preserveAspectRatio="none" className="-mt-2 h-7 w-full overflow-visible text-amber-500">
      <defs>
        <linearGradient id="kpi-spark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${SPARK_H} ${line} ${SPARK_W},${SPARK_H}`} fill="url(#kpi-spark)" />
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="3" fill="currentColor" className="stroke-card" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Figure({ label, value, dot }: { label: string; value: string; dot?: string }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <dt className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
        {dot && <span className={cn("size-2 shrink-0 rounded-full", dot)} />}
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-lg font-semibold tracking-tight tabular-nums">{value}</dd>
    </div>
  );
}

// today's roll calls: a ring split by status (each with its label and number, never colour alone)
const STATUSES = [
  { key: "present", bar: "bg-[#0ca30c]", stroke: "stroke-[#0ca30c]" },
  { key: "late", bar: "bg-[#fab219]", stroke: "stroke-[#fab219]" },
  { key: "absent", bar: "bg-[#d03b3b]", stroke: "stroke-[#d03b3b]" },
  { key: "leave", bar: "bg-muted-foreground/40", stroke: "stroke-muted-foreground/40" },
] as const;

const RING_R = 42;
const RING_C = 2 * Math.PI * RING_R;

function AttendancePanel({ attendance }: { attendance: NonNullable<DashboardSummary["attendance"]> }) {
  const t = useTranslations("school.home.attendance");
  const format = useFormatter();
  const total = attendance.marked;
  const sections = t("sections", { taken: format.number(attendance.sectionsTaken), total: format.number(attendance.sections) });

  // each status's arc, one after the other round the ring
  let offset = 0;
  const arcs = STATUSES.filter((s) => attendance[s.key] > 0).map((s) => {
    const length = (attendance[s.key] / Math.max(1, total)) * RING_C;
    const arc = { ...s, length, offset };
    offset += length;
    return arc;
  });

  return (
    <Panel title={t("title")} description={sections} action={<PanelLink href="/attendance">{t("open")}</PanelLink>}>
      {total === 0 ? (
        <div className="flex min-h-44 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <ClipboardCheck className="size-8 text-muted-foreground/40" />
          <p>{t("none")}</p>
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <div className="relative size-32 shrink-0">
            <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
              <circle cx="50" cy="50" r={RING_R} fill="none" strokeWidth="10" className="stroke-muted" />
              {arcs.map((a) => (
                <circle
                  key={a.key}
                  cx="50"
                  cy="50"
                  r={RING_R}
                  fill="none"
                  strokeWidth="10"
                  className={a.stroke}
                  strokeDasharray={`${a.length} ${RING_C - a.length}`}
                  strokeDashoffset={-a.offset}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold tracking-tight tabular-nums">
                {attendance.presentPercent === null ? "—" : `${format.number(attendance.presentPercent, { maximumFractionDigits: 1 })}%`}
              </span>
              <span className="text-[11px] text-muted-foreground">{t("present")}</span>
            </div>
          </div>
          <ul className="min-w-0 flex-1 space-y-2.5 text-sm">
            {STATUSES.map((s) => (
              <li key={s.key} className="flex items-center gap-2">
                <span className={cn("size-2.5 shrink-0 rounded-full", s.bar)} />
                <span className="flex-1 truncate text-muted-foreground">{t(s.key)}</span>
                <span className="font-semibold tabular-nums">{format.number(attendance[s.key])}</span>
              </li>
            ))}
            <li className="border-t pt-2.5 text-xs text-muted-foreground">{t("presentOf", { count: format.number(total) })}</li>
          </ul>
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
        <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <Banknote className="size-8 text-muted-foreground/40" />
          {t("none")}
        </div>
      ) : (
        <ul className="-mx-2 space-y-0.5">
          {items.map((p) => {
            const cancelled = p.status === "CANCELLED";
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setReceipt(p.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60"
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      cancelled ? "bg-muted text-muted-foreground" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                    )}
                  >
                    {name(p.student).slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-sm font-medium", cancelled && "text-muted-foreground line-through")}>{name(p.student)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {t("receipt", { no: p.receiptNo })} · {format.relativeTime(new Date(p.paidAt), now)}
                      {cancelled && ` · ${t("cancelled")}`}
                    </span>
                  </span>
                  <span className={cn("shrink-0 text-sm font-semibold tabular-nums", cancelled ? "text-muted-foreground line-through" : "text-emerald-700 dark:text-emerald-400")}>
                    {money(p.amount)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <ReceiptDialog paymentId={receipt} onClose={() => setReceipt(null)} />
    </Panel>
  );
}
