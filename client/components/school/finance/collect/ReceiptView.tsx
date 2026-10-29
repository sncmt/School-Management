"use client";

import { useFormatter, useTranslations } from "next-intl";
import { bangladeshDay } from "@/lib/dates";
import { useLocalizedName } from "@/lib/i18n/names";
import type { Receipt } from "@/lib/school/collection";
import { useMoney } from "@/lib/school/finance";
import { useFeeLabel } from "../shared";

/*
 * One copy of a money receipt, sized for half an A4 page (190 mm wide), so a student
 * copy and an office copy print on one sheet.
 */
export function ReceiptView({ receipt, copy }: { receipt: Receipt; copy?: "student" | "office" }) {
  const t = useTranslations("school.finance.receipt");
  const format = useFormatter();
  const name = useLocalizedName();
  const money = useMoney();
  const feeLabel = useFeeLabel();
  const cancelled = receipt.status === "CANCELLED";
  const e = receipt.enrollment;

  return (
    <div className="relative mx-auto w-[190mm] space-y-3 overflow-hidden border border-neutral-400 bg-white p-5 text-[13px] leading-snug text-neutral-900">
      {cancelled && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-12 rounded border-4 border-rose-600/60 px-6 py-1 text-4xl font-bold tracking-widest text-rose-600/60">
            {t("cancelledStamp")}
          </span>
        </div>
      )}

      <header className="flex items-center gap-3 border-b border-neutral-300 pb-2">
        {receipt.school?.logo && (
          // eslint-disable-next-line @next/next/no-img-element -- signed links to private storage
          <img src={receipt.school.logo} alt="" className="size-12 object-contain" />
        )}
        <div className="flex-1">
          <div className="text-base font-bold">{receipt.school ? name(receipt.school) : ""}</div>
          {receipt.school?.address && <div className="text-neutral-600">{receipt.school.address}</div>}
          {receipt.school?.phone && <div className="text-neutral-600">{t("phone", { phone: receipt.school.phone })}</div>}
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold uppercase tracking-wide">{t("title")}</div>
          {copy && <div className="text-neutral-500">{t(copy === "student" ? "studentCopy" : "officeCopy")}</div>}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
        <Row label={t("receiptNo")} value={<span className="font-mono font-semibold">{receipt.receiptNo}</span>} />
        <Row
          label={t("date")}
          value={format.dateTime(new Date(`${bangladeshDay(receipt.paidAt)}T00:00:00Z`), { dateStyle: "medium", timeZone: "UTC" })}
        />
        <Row label={t("student")} value={<span className="font-semibold">{name(receipt.student)}</span>} />
        <Row label={t("admissionNo")} value={receipt.student.admissionNo} />
        {e && (
          <>
            <Row label={t("class")} value={`${e.class.name}${e.section.isDefault ? "" : ` · ${e.section.name}`} · ${e.academicYear.name}`} />
            <Row label={t("roll")} value={e.rollNumber ?? "—"} />
          </>
        )}
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-neutral-100">
            <th className="w-8 border border-neutral-300 px-2 py-1 text-left">#</th>
            <th className="border border-neutral-300 px-2 py-1 text-left">{t("particulars")}</th>
            <th className="w-32 border border-neutral-300 px-2 py-1 text-right">{t("amount")}</th>
          </tr>
        </thead>
        <tbody>
          {receipt.allocations.map((line, i) => (
            <tr key={line.id}>
              <td className="border border-neutral-300 px-2 py-0.5 tabular-nums">{format.number(i + 1)}</td>
              <td className="border border-neutral-300 px-2 py-0.5">{feeLabel(line.studentFee, receipt.enrollment?.academicYear.id)}</td>
              <td className="border border-neutral-300 px-2 py-0.5 text-right tabular-nums">{money(line.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td colSpan={2} className="border border-neutral-300 px-2 py-1 text-right">
              {t("total")}
            </td>
            <td className="border border-neutral-300 px-2 py-1 text-right tabular-nums">{money(receipt.amount)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="flex items-end justify-between gap-4 pt-6">
        <div className="space-y-0.5 text-neutral-600">
          <div>
            {t("paidBy")}: {t(`methods.${receipt.method}`)}
            {receipt.transactionRef && ` · ${t("ref", { ref: receipt.transactionRef })}`}
          </div>
          {cancelled && receipt.cancelReason && <div className="text-rose-700">{t("cancelReason", { reason: receipt.cancelReason })}</div>}
        </div>
        <div className="w-48 border-t border-neutral-500 pt-1 text-center">
          {receipt.receivedByName ? (
            <div className="font-medium">{receipt.receivedByName}</div>
          ) : (
            receipt.method === "ONLINE" && <div className="font-medium">{t("receivedOnline")}</div>
          )}
          <div className="text-neutral-600">{t("receivedBy")}</div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="w-24 shrink-0 text-neutral-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}
