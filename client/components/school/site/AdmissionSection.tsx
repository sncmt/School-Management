import { Banknote, CalendarDays, CircleCheck, ClipboardList, type LucideIcon } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import type { Admission } from "@/lib/site";
import { SectionHeading } from "./SectionHeading";

/** The homepage's admission section: requirements, dates and fees, as the school wrote them in its settings. */
export async function AdmissionSection({ admission }: { admission: Admission }) {
  const [t, format] = await Promise.all([getTranslations("schoolHome.admission"), getFormatter()]);
  const { requirements, dates, fees } = admission;

  return (
    <section id="admission" className="scroll-mt-20 border-y bg-card">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
        <SectionHeading eyebrow={t("eyebrow")} title={t("title")} subtitle={t("subtitle")} />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {requirements.length > 0 && (
            <AdmissionCard icon={ClipboardList} title={t("requirements")}>
              <ul className="space-y-2.5">
                {requirements.map((item, i) => (
                  <li key={i} className="flex gap-2.5 text-sm">
                    <CircleCheck className="mt-0.5 size-4 shrink-0 text-brand" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </AdmissionCard>
          )}
          {dates.length > 0 && (
            <AdmissionCard icon={CalendarDays} title={t("dates")}>
              <Rows rows={dates.map((d) => [d.label, d.value])} />
            </AdmissionCard>
          )}
          {fees.length > 0 && (
            <AdmissionCard icon={Banknote} title={t("fees")}>
              <Rows rows={fees.map((f) => [f.label, `৳ ${format.number(f.amount)}`])} strong />
            </AdmissionCard>
          )}
        </div>
      </div>
    </section>
  );
}

function AdmissionCard({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border bg-background p-6 shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-all hover:-translate-y-1 hover:shadow-xl">
      {/* a gold line across the top that grows on hover */}
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 origin-left scale-x-25 bg-sidebar-primary transition-transform duration-500 group-hover:scale-x-100" />
      <h3 className="mb-5 flex items-center gap-3 text-lg font-semibold">
        <span className="flex size-11 items-center justify-center rounded-xl bg-school-sidebar text-white shadow-md shadow-school-sidebar/20">
          <Icon className="size-5" />
        </span>
        {title}
      </h3>
      {children}
    </div>
  );
}

/* label on the left, its value on the right, a hairline between rows */
function Rows({ rows, strong }: { rows: [string, string][]; strong?: boolean }) {
  return (
    <dl className="divide-y text-sm">
      {rows.map(([label, value], i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className={strong ? "shrink-0 font-semibold tabular-nums" : "text-right font-medium"}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
