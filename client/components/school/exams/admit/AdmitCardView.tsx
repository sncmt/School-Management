"use client";

import { UserRound } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocalizedName } from "@/lib/i18n/names";
import type { AdmitCard, AdmitCardSheet } from "@/lib/school/admitCards";

/*
 * One admit card: half an A4 sheet (190 x 134 mm inside the print margins), in the result
 * card's colour, so the screen and the printout match. Two go on a sheet, with a cut line.
 */

const CARD_HEIGHT = "134mm";

export function AdmitCardView({ sheet, card }: { sheet: Omit<AdmitCardSheet, "cards">; card: AdmitCard }) {
  const t = useTranslations("school.exams.admit.card");
  const format = useFormatter();
  const name = useLocalizedName();
  const accent = sheet.design.accentColor;
  const day = (d: string) => format.dateTime(new Date(`${d}T00:00:00Z`), { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const period = card.firstDay && card.lastDay ? (card.firstDay === card.lastDay ? day(card.firstDay) : `${day(card.firstDay)} – ${day(card.lastDay)}`) : null;

  return (
    <div
      className="mx-auto flex w-[190mm] flex-col overflow-hidden border-2 bg-white px-[6mm] py-[4mm] text-[10.5px] leading-snug text-neutral-900"
      style={{ borderColor: accent, height: CARD_HEIGHT }}
    >
      <header className="flex items-center justify-center gap-3 text-center">
        {sheet.design.showLogo && sheet.school?.logo && (
          // eslint-disable-next-line @next/next/no-img-element -- signed links to private storage
          <img src={sheet.school.logo} alt="" className="size-14 object-contain" />
        )}
        <div>
          <div className="text-lg font-bold" style={{ color: accent }}>
            {sheet.school ? name(sheet.school) : ""}
          </div>
          {sheet.design.showAddress && sheet.school?.address && <div className="text-neutral-600">{sheet.school.address}</div>}
          <div className="text-neutral-700">
            {name(sheet.exam)} · {sheet.exam.academicYear.name}
          </div>
        </div>
      </header>

      <div className="mx-auto mt-[2mm] rounded-full px-5 py-0.5 text-[12px] font-semibold tracking-[0.15em] text-white uppercase" style={{ backgroundColor: accent }}>
        {t("title")}
      </div>

      <div className="mt-[3mm] flex gap-[5mm]">
        <dl className="grid flex-1 grid-cols-[auto_1fr_auto_1fr] content-start gap-x-3 gap-y-[1.6mm]">
          <Row label={t("name")} wide>
            <span className="text-[12.5px] font-bold">{name(card.student)}</span>
          </Row>
          <Row label={t("father")} wide>
            {card.student.fatherName}
          </Row>
          <Row label={t("mother")} wide>
            {card.student.motherName}
          </Row>
          <Row label={t("class")}>{card.class.name}</Row>
          <Row label={t("roll")}>
            <span className="text-[12.5px] font-bold">{card.rollNumber ?? "—"}</span>
          </Row>
          <Row label={t("section")}>{card.section.isDefault ? "—" : card.section.name}</Row>
          <Row label={t("admissionNo")}>{card.student.admissionNo}</Row>
          {card.group && (
            <Row label={t("group")} wide>
              {name(card.group)}
            </Row>
          )}
          {period && (
            <Row label={t("dates")} wide>
              {period}
            </Row>
          )}
          {card.seat && (
            <Row label={t("seat")} wide>
              <span className="font-bold" style={{ color: accent }}>
                {t("roomSeat", { room: card.seat.room, seat: format.number(card.seat.seatNo) })}
              </span>
              {card.seat.building && <span className="text-neutral-600"> · {card.seat.building}</span>}
            </Row>
          )}
        </dl>
        <div className="flex h-[38mm] w-[30mm] shrink-0 items-center justify-center overflow-hidden border border-neutral-400 bg-neutral-50">
          {card.student.photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed links to private storage
            <img src={card.student.photo} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-[9px] text-neutral-500">
              <UserRound className="size-6" />
              {t("photo")}
            </span>
          )}
        </div>
      </div>

      {sheet.rules.length > 0 && (
        <div className="mt-[3mm]">
          <div className="font-semibold" style={{ color: accent }}>
            {t("rules")}
          </div>
          <ol className="mt-0.5 list-decimal space-y-0.5 pl-4 text-[9.5px] text-neutral-700">
            {sheet.rules.slice(0, 6).map((rule, i) => (
              <li key={i}>{rule}</li>
            ))}
          </ol>
        </div>
      )}

      {/* the signatures sit at the foot of the card */}
      <footer className="mt-auto flex justify-between gap-6 pt-[6mm]">
        {sheet.signatures.map((label, i) => (
          <div key={i} className="min-w-[38mm] border-t border-neutral-500 pt-0.5 text-center text-[9.5px] text-neutral-700">
            {label}
          </div>
        ))}
      </footer>
    </div>
  );
}

function Row({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <>
      <dt className="text-neutral-600">{label}</dt>
      <dd className={wide ? "col-span-3 font-medium" : "font-medium"}>{children}</dd>
    </>
  );
}

/** The printed copy: two cards a sheet with a dashed cut line, under <body> so nothing moves it. */
export function AdmitCardPrint({ sheet }: { sheet: AdmitCardSheet }) {
  const pages = Array.from({ length: Math.ceil(sheet.cards.length / 2) }, (_, i) => sheet.cards.slice(i * 2, i * 2 + 2));
  return createPortal(
    <div className="print-area hidden bg-white print:block">
      {pages.map((pair, i) => (
        <div key={i} className="print-page space-y-[4mm]">
          {pair.map((card, j) => (
            <div key={card.enrollmentId} className="space-y-[4mm]">
              {j === 1 && <div className="border-t border-dashed border-neutral-400" />}
              <AdmitCardView sheet={sheet} card={card} />
            </div>
          ))}
        </div>
      ))}
    </div>,
    document.body,
  );
}
