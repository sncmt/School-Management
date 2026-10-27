import {
  CalendarCheck,
  Fingerprint,
  Globe,
  GraduationCap,
  LayoutGrid,
  MessageSquareText,
  Smartphone,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MkHeading } from "./MkHeading";

/*
 * What the platform does, as a bento grid: one card per area, each with a small drawing of it
 * above the words. Cards of different widths keep the page from reading like a list.
 */
export async function Features() {
  const t = await getTranslations("marketing.features");

  return (
    <section id="features" className="relative scroll-mt-16 bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <MkHeading index="01" eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <FeatureCard className="lg:col-span-4" icon={CalendarCheck} title={t("attendance.title")} body={t("attendance.body")}>
            <AttendanceArt smsLabel={t("attendance.sms")} />
          </FeatureCard>
          <FeatureCard className="lg:col-span-2" icon={GraduationCap} title={t("results.title")} body={t("results.body")}>
            <ResultArt gpaLabel={t("results.gpa")} />
          </FeatureCard>
          <FeatureCard className="lg:col-span-2" icon={Wallet} title={t("fees.title")} body={t("fees.body")}>
            <ReceiptArt receipt={t("fees.receipt")} total={t("fees.total")} paid={t("fees.paid")} />
          </FeatureCard>
          <FeatureCard className="lg:col-span-2" icon={MessageSquareText} title={t("sms.title")} body={t("sms.body")}>
            <SmsArt first={t("sms.first")} second={t("sms.second")} />
          </FeatureCard>
          <FeatureCard className="lg:col-span-2" icon={Smartphone} title={t("app.title")} body={t("app.body")}>
            <PhoneArt />
          </FeatureCard>
          <FeatureCard className="lg:col-span-3" icon={Globe} title={t("website.title")} body={t("website.body")}>
            <WebsiteArt url={t("website.url")} />
          </FeatureCard>
          <FeatureCard className="md:col-span-2 lg:col-span-3" icon={LayoutGrid} title={t("more.title")} body={t("more.body")}>
            <ul className="flex flex-wrap gap-2">
              {(["routine", "homework", "admit", "idCard", "seatPlan", "promotion", "expense", "roles", "bangla"] as const).map((key) => (
                <li
                  key={key}
                  className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors group-hover:border-mk-violet/30"
                >
                  {t(`more.items.${key}`)}
                </li>
              ))}
            </ul>
          </FeatureCard>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-mk-violet/30 hover:shadow-[0_20px_50px_-20px_color-mix(in_oklch,var(--mk-violet)_35%,transparent)] sm:p-7",
        className,
      )}
    >
      {/* a violet light that wakes up on hover */}
      <span aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-56 rounded-full bg-mk-violet/0 blur-3xl transition-colors duration-500 group-hover:bg-mk-violet/15" />
      <div aria-hidden className="relative mb-6 flex min-h-36 flex-1 items-center">
        {children}
      </div>
      <h3 className="relative flex items-center gap-2.5 text-lg font-bold tracking-tight">
        <span className="flex size-8 items-center justify-center rounded-lg bg-mk-ink text-mk-amber dark:bg-white/10">
          <Icon className="size-4" />
        </span>
        {title}
      </h3>
      <p className="relative mt-2.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </article>
  );
}

// ------------------------------------------------------------------ drawings

// a week of attendance for five students: present, late, absent
const WEEK: ("p" | "l" | "a")[][] = [
  ["p", "p", "p", "p", "p", "p"],
  ["p", "l", "p", "p", "p", "p"],
  ["p", "p", "a", "p", "p", "p"],
  ["p", "p", "p", "p", "l", "p"],
  ["p", "p", "p", "p", "p", "a"],
];
const DOT = { p: "bg-emerald-400", l: "bg-amber-400", a: "bg-rose-400" };

function AttendanceArt({ smsLabel }: { smsLabel: string }) {
  return (
    <div className="flex w-full flex-col items-stretch gap-5 sm:flex-row sm:items-center">
      <div className="flex-1 space-y-2.5 rounded-2xl border bg-background p-4">
        {WEEK.map((days, row) => (
          <div key={row} className="flex items-center gap-3">
            <span className={cn("size-6 shrink-0 rounded-full", ["bg-indigo-200", "bg-rose-200", "bg-amber-200", "bg-sky-200", "bg-emerald-200"][row])} />
            <span className="h-2 w-20 shrink-0 rounded-full bg-muted" />
            <span className="ml-auto flex gap-1.5">
              {days.map((day, i) => (
                <span key={i} className={cn("size-3.5 rounded-[4px]", DOT[day])} />
              ))}
            </span>
          </div>
        ))}
      </div>
      <div className="flex shrink-0 flex-row items-center gap-4 sm:w-44 sm:flex-col">
        <span className="relative flex size-20 items-center justify-center rounded-3xl bg-mk-ink text-mk-mint shadow-xl">
          <span className="absolute inset-0 animate-ping rounded-3xl bg-mk-mint/20 [animation-duration:2.5s] motion-reduce:hidden" />
          <Fingerprint className="size-10" strokeWidth={1.5} />
        </span>
        <span className="rounded-xl border bg-background px-3 py-2 text-xs font-medium shadow-sm">
          <span className="mr-1.5 inline-block size-2 rounded-full bg-rose-400" />
          {smsLabel}
        </span>
      </div>
    </div>
  );
}

function ResultArt({ gpaLabel }: { gpaLabel: string }) {
  const rows = [
    ["w-16", "A+"],
    ["w-20", "A+"],
    ["w-12", "A"],
    ["w-16", "A+"],
  ];
  return (
    <div className="mx-auto w-full max-w-60 rounded-2xl border bg-background p-4 shadow-sm">
      <div className="flex items-end justify-between">
        <span className="text-[11px] text-muted-foreground">{gpaLabel}</span>
        <span className="mk-gradient-text text-3xl leading-none font-black tracking-tight">5.00</span>
      </div>
      <ul className="mt-4 space-y-2">
        {rows.map(([width, grade], i) => (
          <li key={i} className="flex items-center justify-between">
            <span className={cn("h-2 rounded-full bg-muted", width)} />
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{grade}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReceiptArt({ receipt, total, paid }: { receipt: string; total: string; paid: string }) {
  return (
    <div className="relative mx-auto w-full max-w-60 rounded-2xl border bg-background p-4 shadow-sm">
      <p className="text-[11px] font-semibold text-muted-foreground">{receipt} #1024</p>
      <div className="mt-3 space-y-2">
        {["w-24", "w-20", "w-28"].map((w, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className={cn("h-2 rounded-full bg-muted", w)} />
            <span className="h-2 w-8 rounded-full bg-muted" />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-dashed pt-3">
        <span className="text-xs font-semibold">{total}</span>
        <span className="text-base font-bold">৳2,500</span>
      </div>
      <span className="absolute top-3 right-3 rotate-[-12deg] rounded-md border-2 border-emerald-500 px-2 py-0.5 text-[11px] font-black tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
        {paid}
      </span>
    </div>
  );
}

function SmsArt({ first, second }: { first: string; second: string }) {
  return (
    <div className="w-full space-y-2.5">
      <p className="max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5 text-xs leading-relaxed">{first}</p>
      <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-mk-ink px-3.5 py-2.5 text-xs leading-relaxed text-white dark:bg-mk-violet/30">
        {second}
      </p>
    </div>
  );
}

function PhoneArt() {
  return (
    <div className="mx-auto h-40 w-24 rounded-[20px] border-4 border-mk-ink bg-background p-1.5 shadow-xl dark:border-white/20">
      <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-mk-ink/80 dark:bg-white/30" />
      <div className="rounded-md bg-[linear-gradient(135deg,var(--mk-violet),var(--mk-amber))] p-1.5">
        <span className="block h-1.5 w-8 rounded-full bg-white/70" />
        <span className="mt-1 block h-1 w-5 rounded-full bg-white/50" />
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-1">
        {["bg-emerald-200", "bg-amber-200", "bg-sky-200", "bg-rose-200"].map((c) => (
          <span key={c} className={cn("h-6 rounded", c)} />
        ))}
      </div>
      <span className="mt-1.5 block h-1.5 w-full rounded-full bg-muted" />
      <span className="mt-1 block h-1.5 w-2/3 rounded-full bg-muted" />
    </div>
  );
}

function WebsiteArt({ url }: { url: string }) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border bg-background shadow-sm">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <span className="flex gap-1">
          {["bg-rose-300", "bg-amber-300", "bg-emerald-300"].map((c) => (
            <span key={c} className={cn("size-2 rounded-full", c)} />
          ))}
        </span>
        <span className="mx-auto truncate rounded bg-muted px-2.5 py-0.5 text-[10px] text-muted-foreground">{url}</span>
      </div>
      <div className="flex items-center justify-between bg-[oklch(0.42_0.11_165)] px-3 py-2">
        <span className="flex items-center gap-1.5">
          <span className="size-4 rounded-full bg-white/90" />
          <span className="h-1.5 w-14 rounded-full bg-white/80" />
        </span>
        <span className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1 w-6 rounded-full bg-white/60" />
          ))}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-3 p-3">
        <div className="col-span-2 space-y-1.5 self-center">
          <span className="block h-2.5 w-full rounded-full bg-foreground/80" />
          <span className="block h-2.5 w-2/3 rounded-full bg-foreground/80" />
          <span className="block h-1.5 w-full rounded-full bg-muted" />
          <span className="mt-2 block h-4 w-14 rounded bg-[oklch(0.42_0.11_165)]" />
        </div>
        <div className="col-span-3 aspect-[4/3] rounded-lg bg-[linear-gradient(135deg,oklch(0.85_0.08_170),oklch(0.75_0.1_230))]" />
      </div>
    </div>
  );
}
