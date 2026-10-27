"use client";

import { CircleCheck, CreditCard, IdCard, Users } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalizedName } from "@/lib/i18n/names";
import { useErrorMessage } from "@/lib/i18n/useErrorMessage";
import { useFamilyHome, type AttendanceMark, type FamilyChild } from "@/lib/school/family";
import { useMoney } from "@/lib/school/finance";
import { cn } from "@/lib/utils";
import { NoticesPanel, UpcomingPanel } from "../dashboard/panels";
import { useFeeLabel } from "../finance/shared";
import { CheckBadge, DueLabel } from "../homework/shared";
import { StudentAvatar } from "../students/StudentAvatar";
import { Button } from "@/components/ui/button";
import { FamilyAdmitCardDialog } from "./FamilyAdmitCardDialog";
import { PayFeesDialog } from "./PayFeesDialog";

/** The family login's home: each child at a glance, then notices and holidays. */
export function FamilyHome() {
  const describeError = useErrorMessage();
  const { data, isPending, error } = useFamilyHome();

  return (
    <div className="space-y-6">
      {isPending ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : error ? (
        <p className="rounded-2xl border border-border/70 bg-card p-8 text-center text-sm text-muted-foreground">{describeError(error)}</p>
      ) : (
        <ChildrenGrid items={data.children} mainYearId={data.academicYear?.id} canPayOnline={data.onlinePayment.enabled} />
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <NoticesPanel className="lg:col-span-2" />
        {data && <UpcomingPanel items={data.upcoming} />}
      </div>
    </div>
  );
}

/** The children on this account; also shown on the staff dashboard of a teacher who is a parent here. */
export function ChildrenGrid({ items, mainYearId, canPayOnline = false }: { items: FamilyChild[]; mainYearId?: string; canPayOnline?: boolean }) {
  const t = useTranslations("school.family");
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/70 bg-card p-10 text-center text-sm text-muted-foreground">
        <Users className="size-8 text-muted-foreground/50" />
        {t("noChildren")}
      </div>
    );
  }
  return (
    <div className={cn("grid gap-5", items.length > 1 && "lg:grid-cols-2")}>
      {items.map((child) => (
        <ChildCard key={child.id} child={child} mainYearId={mainYearId} canPayOnline={canPayOnline} />
      ))}
    </div>
  );
}

// the status palette, each with its word (never colour alone)
const MARKS: { key: keyof FamilyChild["attendance"]["month"]; mark: AttendanceMark; dot: string }[] = [
  { key: "present", mark: "PRESENT", dot: "bg-[#0ca30c]" },
  { key: "late", mark: "LATE", dot: "bg-[#fab219]" },
  { key: "absent", mark: "ABSENT", dot: "bg-[#d03b3b]" },
  { key: "leave", mark: "LEAVE", dot: "bg-muted-foreground/40" },
];

const MAX_FEES = 4;

function ChildCard({ child, mainYearId, canPayOnline }: { child: FamilyChild; mainYearId?: string; canPayOnline: boolean }) {
  const t = useTranslations("school.family");
  const format = useFormatter();
  const name = useLocalizedName();
  const money = useMoney();
  const feeLabel = useFeeLabel();
  const e = child.enrollment;
  const today = child.attendance.today;
  const month = child.attendance.month;
  const days = month.present + month.late + month.absent + month.leave;
  const owed = Number(child.dues.total) > 0;
  const [admitExam, setAdmitExam] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const placement = e
    ? [
        e.class.name,
        !e.section.isDefault ? t("section", { name: e.section.name }) : null,
        e.group ? name(e.group) : null,
        e.rollNumber ? t("roll", { roll: e.rollNumber }) : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <header className="flex items-center gap-4 border-b bg-brand-soft/60 px-5 py-4">
        <StudentAvatar photo={child.photo} className="size-14 border-2 border-card" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold">{name(child)}</h2>
          <p className="truncate text-sm text-muted-foreground">{placement ?? t("notEnrolled")}</p>
          <p className="text-xs text-muted-foreground">
            {t("admissionNo", { no: child.admissionNo })}
            {e && ` · ${e.academicYear.name}`}
          </p>
        </div>
        {child.status !== "ACTIVE" && (
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{t(`status.${child.status}`)}</span>
        )}
      </header>

      <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {/* attendance */}
        <div className="space-y-4 p-5">
          <div>
            <div className="text-xs font-medium text-muted-foreground">{t("today")}</div>
            {today ? (
              <div className="mt-1 flex items-center gap-2 text-base font-semibold">
                <span className={cn("size-2.5 rounded-full", MARKS.find((m) => m.mark === today.status)?.dot)} />
                {t(`marks.${today.status}`)}
                {today.checkInAt && (
                  <span className="text-xs font-normal text-muted-foreground">
                    {t("checkIn", { time: format.dateTime(new Date(today.checkInAt), { hour: "numeric", minute: "2-digit", timeZone: "Asia/Dhaka" }) })}
                  </span>
                )}
              </div>
            ) : (
              <div className="mt-1 text-sm text-muted-foreground">{t("notTaken")}</div>
            )}
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">{t("thisMonth")}</div>
            {days === 0 ? (
              <div className="mt-1 text-sm text-muted-foreground">{t("noDays")}</div>
            ) : (
              <>
                <div className="mt-2 flex h-2 gap-[2px] overflow-hidden rounded-full">
                  {MARKS.map((m) => (month[m.key] > 0 ? <div key={m.key} className={m.dot} style={{ flexGrow: month[m.key] }} /> : null))}
                </div>
                <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {MARKS.map((m) => (
                    <li key={m.key} className="flex items-center gap-2">
                      <span className={cn("size-2 rounded-full", m.dot)} />
                      <span className="flex-1 text-muted-foreground">{t(`marks.${m.mark}`)}</span>
                      <span className="font-medium tabular-nums">{format.number(month[m.key])}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        {/* fees */}
        <div className="p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium text-muted-foreground">{t("feesDue")}</div>
            <Link href="/fees" className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">
              {t("allPayments")}
            </Link>
          </div>
          {owed ? (
            <>
              <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{money(child.dues.total)}</div>
              <ul className="mt-3 space-y-1.5 text-sm">
                {child.dues.fees.slice(0, MAX_FEES).map((fee) => (
                  <li key={fee.id} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-muted-foreground">{feeLabel(fee, mainYearId)}</span>
                    <span className="shrink-0 font-medium tabular-nums">{money(fee.due)}</span>
                  </li>
                ))}
              </ul>
              {child.dues.fees.length > MAX_FEES && (
                <p className="mt-1.5 text-xs text-muted-foreground">{t("moreFees", { count: child.dues.fees.length - MAX_FEES })}</p>
              )}
              {canPayOnline ? (
                <Button size="sm" className="mt-3" onClick={() => setPaying(true)}>
                  <CreditCard /> {t("pay.button")}
                </Button>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">{t("payAtSchool")}</p>
              )}
            </>
          ) : (
            <div className="mt-2 flex items-center gap-2 text-sm font-medium text-[#0a850a] dark:text-[#3cc73c]">
              <CircleCheck className="size-4" /> {t("noDues")}
            </div>
          )}
        </div>
      </div>

      {/* admit cards the school has released */}
      {child.admitCards.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t bg-brand-soft/30 px-5 py-3">
          <span className="text-xs font-medium text-muted-foreground">{t("admitCards")}</span>
          {child.admitCards.map((exam) => (
            <button
              key={exam.id}
              type="button"
              onClick={() => setAdmitExam(exam.id)}
              className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs font-medium hover:bg-muted"
            >
              <IdCard className="size-3.5" /> {name(exam)}
            </button>
          ))}
          <FamilyAdmitCardDialog query={admitExam ? { studentId: child.id, examId: admitExam } : null} onClose={() => setAdmitExam(null)} />
        </div>
      )}

      {/* homework due from today */}
      {e && (
        <div className="border-t p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium text-muted-foreground">{t("homeworkDue")}</div>
            <Link href="/homework" className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline">
              {t("allHomework")}
            </Link>
          </div>
          {child.homework.total === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">{t("noHomework")}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {child.homework.items.map((hw) => (
                <li key={hw.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="text-muted-foreground">{name(hw.subject)}: </span>
                    {hw.title}
                  </span>
                  {hw.check ? <CheckBadge status={hw.check.status} className="shrink-0" /> : <DueLabel dueDate={hw.dueDate} className="shrink-0 text-xs" />}
                </li>
              ))}
              {child.homework.total > child.homework.items.length && (
                <li className="text-xs text-muted-foreground">{t("moreHomework", { count: child.homework.total - child.homework.items.length })}</li>
              )}
            </ul>
          )}
        </div>
      )}
      <PayFeesDialog student={paying ? { id: child.id, name: name(child) } : null} onClose={() => setPaying(false)} />
    </section>
  );
}
