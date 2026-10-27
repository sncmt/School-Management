import { Bell, CalendarCheck, FileText, LayoutDashboard, MessageSquare, Settings, Users, Wallet, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

/*
 * A drawing of the school dashboard for the hero, made of plain boxes so it stays sharp, light
 * and in the visitor's language. Always light: it is a picture of the app, not part of the page.
 */

const MENU = [
  [LayoutDashboard, "dashboard"],
  [Users, "students"],
  [CalendarCheck, "attendance"],
  [FileText, "exams"],
  [Wallet, "fees"],
  [MessageSquare, "messages"],
  [Settings, "settings"],
] as const satisfies readonly (readonly [LucideIcon, string])[];

// attendance over the week, percent
const WEEK = [
  ["sat", 92],
  ["sun", 95],
  ["mon", 89],
  ["tue", 97],
  ["wed", 94],
  ["thu", 96],
] as const;

export async function ProductPreview() {
  const t = await getTranslations("marketing.preview");

  const stats = [
    { label: t("statStudents"), value: "1,248", tone: "bg-indigo-50 text-indigo-600" },
    { label: t("statPresent"), value: "96%", tone: "bg-emerald-50 text-emerald-600" },
    { label: t("statFees"), value: "৳4.2L", tone: "bg-amber-50 text-amber-600" },
    { label: t("statTeachers"), value: "64", tone: "bg-violet-50 text-violet-600" },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-1.5 shadow-2xl ring-1 ring-white/5 backdrop-blur">
      <div className="overflow-hidden rounded-xl bg-slate-50 text-left text-slate-900">
        {/* window bar */}
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-rose-400" />
            <span className="size-2.5 rounded-full bg-amber-400" />
            <span className="size-2.5 rounded-full bg-emerald-400" />
          </span>
          <span className="mx-auto rounded-md bg-slate-100 px-3 py-1 text-[11px] text-slate-500">{t("url")}</span>
          <span className="w-12" />
        </div>

        <div className="flex">
          {/* menu */}
          <div className="hidden w-44 shrink-0 flex-col gap-1 bg-mk-ink-2 p-3 sm:flex">
            <div className="mb-3 flex items-center gap-2 px-1">
              <span className="size-6 rounded-md bg-[linear-gradient(135deg,var(--mk-violet),var(--mk-amber))]" />
              <span className="h-2 w-16 rounded-full bg-white/30" />
            </div>
            {MENU.map(([Icon, key], i) => (
              <span
                key={key}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${i === 0 ? "bg-white/10 font-semibold text-white" : "text-white/60"}`}
              >
                <Icon className={`size-3.5 ${i === 0 ? "text-mk-amber" : ""}`} />
                {t(`menu.${key}`)}
              </span>
            ))}
          </div>

          {/* page */}
          <div className="min-w-0 flex-1 p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{t("greeting")}</p>
                <p className="text-[11px] text-slate-500">{t("today")}</p>
              </div>
              <span className="flex size-7 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
                <Bell className="size-3.5" />
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 md:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-[10px] text-slate-500">{s.label}</p>
                  <p className="mt-1 text-lg font-bold tracking-tight">{s.value}</p>
                  <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold ${s.tone}`}>{t("trend")}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-2.5 md:grid-cols-5">
              <div className="rounded-lg border border-slate-200 bg-white p-3 md:col-span-3">
                <p className="text-[11px] font-semibold">{t("chart")}</p>
                <div className="mt-3 flex h-28 items-end gap-2.5">
                  {WEEK.map(([day, value], i) => (
                    <div key={day} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t-[3px] ${i === WEEK.length - 1 ? "bg-[linear-gradient(to_top,var(--mk-violet),oklch(0.75_0.15_290))]" : "bg-indigo-100"}`}
                        style={{ height: `${(value - 80) * 5}%` }}
                      />
                      <span className="text-[9px] text-slate-400">{t(`days.${day}`)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3 md:col-span-2">
                <p className="text-[11px] font-semibold">{t("payments")}</p>
                <ul className="mt-2.5 space-y-2.5">
                  {["৳1,500", "৳2,500", "৳1,200"].map((amount, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className={`size-6 shrink-0 rounded-full ${["bg-rose-100", "bg-sky-100", "bg-amber-100"][i]}`} />
                      <span className="flex-1 space-y-1">
                        <span className="block h-1.5 w-3/4 rounded-full bg-slate-200" />
                        <span className="block h-1.5 w-1/2 rounded-full bg-slate-100" />
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-600">{amount}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
