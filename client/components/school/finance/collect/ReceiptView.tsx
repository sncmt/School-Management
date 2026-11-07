"use client";

import { useFormatter, useTranslations } from "next-intl";
import { bangladeshDay } from "@/lib/dates";
import { useLocalizedName } from "@/lib/i18n/names";
import type { Receipt } from "@/lib/school/collection";
import { useMoney } from "@/lib/school/finance";
import { cn } from "@/lib/utils";
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

function Row({ label, value, compact = false }: { label: string; value: React.ReactNode; compact?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className={cn("shrink-0 text-neutral-500", compact ? "w-20" : "w-24")}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/*
 * The same receipt on a quarter of an A4 page (A6, 105 x 148 mm): one copy, details one under
 * the other so the fees keep their width.
 */
export function ReceiptCompact({ receipt }: { receipt: Receipt }) {
  const t = useTranslations("school.finance.receipt");
  const format = useFormatter();
  const name = useLocalizedName();
  const money = useMoney();
  const feeLabel = useFeeLabel();
  const cancelled = receipt.status === "CANCELLED";
  const e = receipt.enrollment;

  return (
    <div className="relative mx-auto w-[97mm] space-y-2 overflow-hidden border border-neutral-400 bg-white p-3 text-[10.5px] leading-snug text-neutral-900">
      {cancelled && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-12 rounded border-[3px] border-rose-600/60 px-3 py-0.5 text-2xl font-bold tracking-widest text-rose-600/60">
            {t("cancelledStamp")}
          </span>
        </div>
      )}
      <header className="flex items-center gap-2 border-b border-neutral-300 pb-1.5">
        {receipt.school?.logo && (
          // eslint-disable-next-line @next/next/no-img-element -- signed links to private storage
          <img src={receipt.school.logo} alt="" className="size-9 object-contain" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-bold">{receipt.school ? name(receipt.school) : ""}</div>
          {receipt.school?.address && <div className="truncate text-neutral-600">{receipt.school.address}</div>}
          {receipt.school?.phone && <div className="text-neutral-600">{t("phone", { phone: receipt.school.phone })}</div>}
        </div>
        <div className="shrink-0 text-right text-[10px] font-semibold uppercase tracking-wide">{t("title")}</div>
      </header>

      <div className="space-y-0.5">
        <Row compact label={t("receiptNo")} value={<span className="font-mono font-semibold">{receipt.receiptNo}</span>} />
        <Row compact label={t("date")} value={format.dateTime(new Date(`${bangladeshDay(receipt.paidAt)}T00:00:00Z`), { dateStyle: "medium", timeZone: "UTC" })} />
        <Row compact label={t("student")} value={<span className="font-semibold">{name(receipt.student)}</span>} />
        <Row compact label={t("admissionNo")} value={receipt.student.admissionNo} />
        {e && (
          <Row
            compact
            label={t("class")}
            value={`${e.class.name}${e.section.isDefault ? "" : ` · ${e.section.name}`}${e.rollNumber ? ` · ${t("roll")} ${e.rollNumber}` : ""} · ${e.academicYear.name}`}
          />
        )}
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-neutral-100">
            <th className="border border-neutral-300 px-1.5 py-0.5 text-left">{t("particulars")}</th>
            <th className="w-20 border border-neutral-300 px-1.5 py-0.5 text-right">{t("amount")}</th>
          </tr>
        </thead>
        <tbody>
          {receipt.allocations.map((line) => (
            <tr key={line.id}>
              <td className="border border-neutral-300 px-1.5 py-0.5">{feeLabel(line.studentFee, receipt.enrollment?.academicYear.id)}</td>
              <td className="border border-neutral-300 px-1.5 py-0.5 text-right tabular-nums">{money(line.amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td className="border border-neutral-300 px-1.5 py-0.5 text-right">{t("total")}</td>
            <td className="border border-neutral-300 px-1.5 py-0.5 text-right tabular-nums">{money(receipt.amount)}</td>
          </tr>
        </tfoot>
      </table>

      <div className="text-neutral-600">
        {t("paidBy")}: {t(`methods.${receipt.method}`)}
        {receipt.transactionRef && ` · ${t("ref", { ref: receipt.transactionRef })}`}
      </div>
      {cancelled && receipt.cancelReason && <div className="text-rose-700">{t("cancelReason", { reason: receipt.cancelReason })}</div>}
      <div className="ml-auto w-36 border-t border-neutral-500 pt-0.5 text-center">
        {receipt.receivedByName ? (
          <div className="font-medium">{receipt.receivedByName}</div>
        ) : (
          receipt.method === "ONLINE" && <div className="font-medium">{t("receivedOnline")}</div>
        )}
        <div className="text-neutral-600">{t("receivedBy")}</div>
      </div>
    </div>
  );
}

/*
 * A token for a thermal (POS) printer: 80 mm or 58 mm paper (72 / 48 mm printed), black on
 * white, no boxes or shading (thermal printers print neither well).
 */
export function ReceiptToken({ receipt, width }: { receipt: Receipt; width: 80 | 58 }) {
  const t = useTranslations("school.finance.receipt");
  const format = useFormatter();
  const name = useLocalizedName();
  const money = useMoney();
  const feeLabel = useFeeLabel();
  const cancelled = receipt.status === "CANCELLED";
  const e = receipt.enrollment;
  const line = "my-1 border-t border-dashed border-black";

  return (
    <div className={cn("mx-auto bg-white px-1 py-2 leading-snug text-black", width === 80 ? "w-[72mm] text-[11px]" : "w-[48mm] text-[9.5px]")}>
      <div className="text-center">
        <div className={cn("font-bold", width === 80 ? "text-[13px]" : "text-[11px]")}>{receipt.school ? name(receipt.school) : ""}</div>
        {receipt.school?.address && <div>{receipt.school.address}</div>}
        {receipt.school?.phone && <div>{t("phone", { phone: receipt.school.phone })}</div>}
        <div className="mt-1 font-semibold uppercase tracking-wide">{t("title")}</div>
        {cancelled && <div className="mt-0.5 font-bold">*** {t("cancelledStamp")} ***</div>}
      </div>
      <div className={line} />
      <TokenRow label={t("receiptNo")} value={<span className="font-mono font-semibold">{receipt.receiptNo}</span>} />
      <TokenRow label={t("date")} value={format.dateTime(new Date(receipt.paidAt), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dhaka" })} />
      <TokenRow label={t("student")} value={<span className="font-semibold">{name(receipt.student)}</span>} />
      <TokenRow label={t("admissionNo")} value={receipt.student.admissionNo} />
      {e && <TokenRow label={t("class")} value={`${e.class.name}${e.section.isDefault ? "" : ` · ${e.section.name}`}${e.rollNumber ? ` · ${t("roll")} ${e.rollNumber}` : ""}`} />}
      <div className={line} />
      {receipt.allocations.map((a) => (
        <div key={a.id} className="flex justify-between gap-2">
          <span className="min-w-0">{feeLabel(a.studentFee, receipt.enrollment?.academicYear.id)}</span>
          <span className="shrink-0 tabular-nums">{money(a.amount)}</span>
        </div>
      ))}
      <div className={line} />
      <div className={cn("flex justify-between gap-2 font-bold", width === 80 ? "text-[13px]" : "text-[11px]")}>
        <span>{t("total")}</span>
        <span className="tabular-nums">{money(receipt.amount)}</span>
      </div>
      <div className={line} />
      <div>
        {t("paidBy")}: {t(`methods.${receipt.method}`)}
      </div>
      {receipt.transactionRef && <div className="break-all">{t("ref", { ref: receipt.transactionRef })}</div>}
      {cancelled && receipt.cancelReason && <div>{t("cancelReason", { reason: receipt.cancelReason })}</div>}
      <div>
        {t("receivedBy")}: {receipt.receivedByName ?? (receipt.method === "ONLINE" ? t("receivedOnline") : "")}
      </div>
      <div className="mt-2 text-center">{t("thanks")}</div>
    </div>
  );
}

function TokenRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="shrink-0">{label}</span>
      <span className="min-w-0 text-right">{value}</span>
    </div>
  );
}
