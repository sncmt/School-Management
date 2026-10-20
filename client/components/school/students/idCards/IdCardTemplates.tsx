"use client";

import { School, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CSSProperties, ReactNode } from "react";
import { useLocalizedName } from "@/lib/i18n/names";
import { localMobile, type IdCard, type IdCardSchool, type IdCardSettings, type IdCardYear } from "@/lib/school/idCards";
import { cn } from "@/lib/utils";

/*
 * The ID card templates: all portrait, drawn at the real card size (CR80, 54 x 85.6 mm), so
 * the screen and the printout match. Every template shows the same things: the school with
 * its address, the photo, name, father's name, class, section, roll, mobile number and the
 * academic year; each in its own design.
 */

export const CARD_WIDTH = 54;
export const CARD_HEIGHT = 85.6;

export type CardProps = { school: IdCardSchool | null; settings: IdCardSettings; year: IdCardYear; card: IdCard };

function Frame({ className, style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-[3mm] bg-white leading-tight text-neutral-900 ring-1 ring-neutral-300", className)}
      style={{ width: `${CARD_WIDTH}mm`, height: `${CARD_HEIGHT}mm`, ...style }}
    >
      {children}
    </div>
  );
}

function Logo({ school, size, light }: { school: IdCardSchool | null; size: string; light?: boolean }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-full", light ? "bg-white" : "bg-neutral-100")} style={{ width: size, height: size }}>
      {school?.logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed links to private storage
        <img src={school.logo} alt="" className="size-[85%] object-contain" />
      ) : (
        <School className="size-[60%] text-neutral-500" />
      )}
    </span>
  );
}

function Photo({ card, width, height, className, style }: { card: IdCard; width: string; height: string; className?: string; style?: CSSProperties }) {
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden bg-neutral-100", className)} style={{ width, height, ...style }}>
      {card.student.photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed links to private storage
        <img src={card.student.photo} alt="" className="size-full object-cover" />
      ) : (
        <UserRound className="size-1/2 text-neutral-400" />
      )}
    </span>
  );
}

/* The school's name with its address under it (each kept to two lines). */
function SchoolName({ school, nameClass, addressClass, style }: { school: IdCardSchool | null; nameClass: string; addressClass: string; style?: CSSProperties }) {
  const name = useLocalizedName();
  return (
    <div className="min-w-0">
      <div className={cn("line-clamp-2 font-bold", nameClass)} style={style}>
        {school ? name(school) : ""}
      </div>
      {school?.address && <div className={cn("mt-[0.4mm] line-clamp-2", addressClass)}>{school.address}</div>}
    </div>
  );
}

type Fact = { label: string; value: string };

/* The facts under the name; the year only where a template has no place of its own for it. */
function useFacts({ card, settings, year }: Pick<CardProps, "card" | "settings" | "year">, withYear = false): Fact[] {
  const t = useTranslations("school.idCards.card");
  return [
    { label: t("father"), value: card.student.fatherName },
    { label: t("class"), value: card.class.name },
    ...(card.section.isDefault ? [] : [{ label: t("section"), value: card.section.name }]),
    { label: t("roll"), value: card.rollNumber ?? "—" },
    ...(settings.showAdmissionNo ? [{ label: t("admissionNo"), value: card.student.admissionNo }] : []),
    { label: t("mobile"), value: localMobile(card.student.mobile) ?? "—" },
    ...(withYear ? [{ label: t("year"), value: year.name }] : []),
  ];
}

/* Label: value rows. */
function FactRows({ facts, size = "5.4pt", labelWidth = "11mm" }: { facts: Fact[]; size?: string; labelWidth?: string }) {
  return (
    <dl className="space-y-[0.6mm]" style={{ fontSize: size }}>
      {facts.map((f) => (
        <div key={f.label} className="flex gap-[1mm]">
          <dt className="shrink-0 text-neutral-500" style={{ width: labelWidth }}>
            {f.label}
          </dt>
          <dd className="min-w-0 truncate font-semibold">: {f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ------------------------------------------------------------------ fronts

/* A coloured header with the school, a framed photo in the middle, a coloured foot with the year. */
function Classic({ school, settings, year, card }: CardProps) {
  const t = useTranslations("school.idCards.card");
  const name = useLocalizedName();
  const facts = useFacts({ card, settings, year });
  const accent = settings.accentColor;
  return (
    <Frame>
      <header className="flex h-[22mm] flex-col items-center px-[3mm] pt-[2mm] text-center text-white" style={{ backgroundColor: accent }}>
        {settings.showLogo && <Logo school={school} size="7mm" light />}
        <div className="mt-[0.8mm]">
          <SchoolName school={school} nameClass="text-[6.6pt]" addressClass="text-[4.5pt] opacity-90" />
        </div>
      </header>
      <div className="py-[0.7mm] text-center text-[5pt] font-semibold tracking-[0.22em] uppercase" style={{ color: accent, backgroundColor: `${accent}14` }}>
        {t("title")}
      </div>
      <div className="mt-[2mm] flex justify-center">
        <Photo card={card} width="19mm" height="23mm" className="rounded-[1mm] border-[0.5mm]" style={{ borderColor: accent }} />
      </div>
      <div className="mt-[1.2mm] mb-[1.8mm] line-clamp-2 px-[3mm] text-center text-[7.6pt] font-bold" style={{ color: accent }}>
        {name(card.student)}
      </div>
      <div className="mt-[1.2mm] px-[4mm]">
        <FactRows facts={facts} />
      </div>
      <footer className="absolute inset-x-0 bottom-0 flex h-[4.5mm] items-center justify-center text-[5.4pt] font-semibold text-white" style={{ backgroundColor: accent }}>
        {t("validFor", { year: year.name })}
      </footer>
    </Frame>
  );
}

/* A curved coloured top with the school, a round photo on the curve, the name centred. */
function Modern({ school, settings, year, card }: CardProps) {
  const t = useTranslations("school.idCards.card");
  const name = useLocalizedName();
  const facts = useFacts({ card, settings, year });
  const accent = settings.accentColor;
  return (
    <Frame>
      <div className="absolute inset-x-0 top-0 h-[31mm] rounded-b-[50%_9mm]" style={{ backgroundColor: accent }} />
      <div className="relative flex flex-col items-center px-[3mm] pt-[2mm] text-center text-white">
        {settings.showLogo && <Logo school={school} size="6.5mm" light />}
        <div className="mt-[0.6mm]">
          <SchoolName school={school} nameClass="text-[6.4pt]" addressClass="text-[4.4pt] opacity-90" />
        </div>
        <div className="mt-[0.6mm] text-[4.6pt] tracking-[0.2em] uppercase opacity-90">{t("title")}</div>
      </div>
      <div className="absolute inset-x-0 top-[23.5mm] flex justify-center">
        <Photo card={card} width="21mm" height="21mm" className="rounded-full border-[0.8mm] border-white shadow" />
      </div>
      <div className="absolute inset-x-0 top-[46mm] px-[3.5mm] text-center">
        <div className="mb-[1.8mm] line-clamp-2 text-[7.8pt] font-bold" style={{ color: accent }}>
          {name(card.student)}
        </div>
        <div className="mt-[1.2mm] text-left">
          <FactRows facts={facts} labelWidth="10.5mm" />
        </div>
      </div>
      <footer className="absolute inset-x-0 bottom-0 flex h-[5mm] items-center justify-center text-[5.4pt] font-semibold text-white" style={{ backgroundColor: accent }}>
        {t("validFor", { year: year.name })}
      </footer>
    </Frame>
  );
}

/* White, a coloured stripe down the side, the photo beside the name, the year at the foot. */
function Minimal({ school, settings, year, card }: CardProps) {
  const t = useTranslations("school.idCards.card");
  const name = useLocalizedName();
  const facts = useFacts({ card, settings, year }).filter((f) => f.label !== t("class") && f.label !== t("roll"));
  const accent = settings.accentColor;
  return (
    <Frame className="border-l-[3.5mm]" style={{ borderLeftColor: accent }}>
      <div className="flex h-full flex-col px-[3mm] pt-[3mm] pb-[2.5mm]">
        <header className="flex items-start gap-[1.5mm]">
          {settings.showLogo && <Logo school={school} size="7mm" />}
          <SchoolName school={school} nameClass="text-[6.4pt]" addressClass="text-[4.4pt] text-neutral-500" style={{ color: accent }} />
        </header>
        <div className="mt-[2mm] border-t pt-[1.2mm] text-[4.8pt] tracking-[0.2em] text-neutral-500 uppercase" style={{ borderColor: `${accent}55` }}>
          {t("title")}
        </div>
        <div className="mt-[1.8mm] flex gap-[2mm]">
          <Photo card={card} width="18mm" height="22mm" className="rounded-[1.5mm]" />
          <div className="min-w-0 flex-1">
            <div className="mb-[1.8mm] line-clamp-3 text-[8pt] font-bold">{name(card.student)}</div>
            <div className="mt-[1.5mm] space-y-[0.8mm] text-[5.4pt]">
              <div>
                <span className="text-neutral-500">{t("class")} </span>
                <span className="font-semibold">{card.class.name}</span>
              </div>
              <div className="inline-block rounded px-[1.5mm] py-[0.3mm] font-bold text-white" style={{ backgroundColor: accent }}>
                {t("roll")} {card.rollNumber ?? "—"}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-[2.5mm]">
          <FactRows facts={facts} />
        </div>
        <div className="mt-auto flex items-center gap-[1.5mm]">
          <span className="h-px flex-1" style={{ backgroundColor: `${accent}55` }} />
          <span className="text-[5.4pt] font-semibold" style={{ color: accent }}>
            {t("validFor", { year: year.name })}
          </span>
        </div>
      </div>
    </Frame>
  );
}

/* All in colour: the school on top, a white panel for the photo and the facts. */
function Bold({ school, settings, year, card }: CardProps) {
  const t = useTranslations("school.idCards.card");
  const name = useLocalizedName();
  const facts = useFacts({ card, settings, year });
  const accent = settings.accentColor;
  return (
    <Frame style={{ backgroundColor: accent }}>
      <div className="flex flex-col items-center px-[3mm] pt-[2.2mm] text-center text-white">
        {settings.showLogo && <Logo school={school} size="6.5mm" light />}
        <div className="mt-[0.6mm]">
          <SchoolName school={school} nameClass="text-[6.4pt]" addressClass="text-[4.4pt] opacity-90" />
        </div>
      </div>
      <div className="absolute inset-x-[2.5mm] top-[25mm] bottom-[6.5mm] rounded-[2mm] bg-white" />
      <div className="absolute inset-x-0 top-[21mm] flex justify-center">
        <Photo card={card} width="19mm" height="23mm" className="rounded-[1.5mm] border-[0.7mm] border-white shadow" />
      </div>
      <div className="absolute inset-x-[4.5mm] top-[45.5mm]">
        <div className="mb-[1.8mm] line-clamp-2 text-center text-[7.6pt] font-bold" style={{ color: accent }}>
          {name(card.student)}
        </div>
        <div className="mt-[1mm]">
          <FactRows facts={facts} size="5.3pt" labelWidth="10.5mm" />
        </div>
      </div>
      <footer className="absolute inset-x-0 bottom-0 flex h-[6.5mm] flex-col items-center justify-center text-white">
        <span className="text-[4.6pt] tracking-[0.2em] uppercase opacity-90">{t("title")}</span>
        <span className="text-[6pt] font-bold">{year.name}</span>
      </footer>
    </Frame>
  );
}

/* White with a coloured ribbon, the photo on a coloured block, the facts in small boxes. */
function Elegant({ school, settings, year, card }: CardProps) {
  const t = useTranslations("school.idCards.card");
  const name = useLocalizedName();
  const facts = useFacts({ card, settings, year });
  const accent = settings.accentColor;
  return (
    <Frame>
      <div className="absolute inset-x-0 top-0 h-[1.2mm]" style={{ backgroundColor: accent }} />
      <header className="flex flex-col items-center px-[3mm] pt-[2.6mm] text-center">
        {settings.showLogo && <Logo school={school} size="7mm" />}
        <div className="mt-[0.8mm]">
          <SchoolName school={school} nameClass="text-[6.6pt]" addressClass="text-[4.4pt] text-neutral-500" style={{ color: accent }} />
        </div>
      </header>
      <div className="mt-[1.5mm] py-[0.8mm] text-center text-[5pt] font-semibold tracking-[0.25em] text-white uppercase" style={{ backgroundColor: accent }}>
        {t("title")}
      </div>
      <div className="mt-[2.5mm] flex justify-center">
        <div className="relative">
          <span className="absolute top-[1.2mm] left-[1.2mm] h-[23mm] w-[19mm] rounded-[1.5mm]" style={{ backgroundColor: `${accent}40` }} />
          <Photo card={card} width="19mm" height="23mm" className="relative rounded-[1.5mm] ring-[0.3mm] ring-white" />
        </div>
      </div>
      <div className="mt-[2mm] mb-[1.8mm] line-clamp-2 px-[3mm] text-center text-[7.6pt] font-bold">{name(card.student)}</div>
      <dl className="mt-[1.5mm] grid grid-cols-2 gap-[0.8mm] px-[3mm]">
        {facts.map((f) => (
          <div key={f.label} className="min-w-0 rounded-[0.8mm] px-[1.2mm] py-[0.5mm]" style={{ backgroundColor: `${accent}10` }}>
            <dt className="text-[3.9pt] tracking-wide text-neutral-500 uppercase">{f.label}</dt>
            <dd className="truncate text-[5.3pt] font-semibold">{f.value}</dd>
          </div>
        ))}
      </dl>
      <footer className="absolute inset-x-[4mm] bottom-[2mm] flex items-center gap-[1.5mm]">
        <span className="h-[0.3mm] flex-1" style={{ backgroundColor: accent }} />
        <span className="text-[5.4pt] font-semibold" style={{ color: accent }}>
          {year.name}
        </span>
        <span className="h-[0.3mm] flex-1" style={{ backgroundColor: accent }} />
      </footer>
    </Frame>
  );
}

const FRONTS = { CLASSIC: Classic, MODERN: Modern, MINIMAL: Minimal, BOLD: Bold, ELEGANT: Elegant } as const;

export function IdCardFront(props: CardProps) {
  const Front = FRONTS[props.settings.template] ?? Classic;
  return <Front {...props} />;
}

// ------------------------------------------------------------------- back

/* The back, the same for every template: the school, its contacts, the note and a signature. */
export function IdCardBack({ school, settings, year }: Omit<CardProps, "card">) {
  const t = useTranslations("school.idCards.card");
  const accent = settings.accentColor;
  return (
    <Frame>
      <div className="absolute inset-x-0 top-0 h-[1.5mm]" style={{ backgroundColor: accent }} />
      <div className="flex h-full flex-col items-center px-[4mm] pt-[6mm] pb-[4mm] text-center">
        {settings.showLogo && <Logo school={school} size="10mm" />}
        <div className="mt-[1.2mm]">
          <SchoolName school={school} nameClass="text-[7pt]" addressClass="text-[5pt] text-neutral-600" style={{ color: accent }} />
        </div>
        <div className="mt-[0.6mm] space-y-[0.3mm] text-[5pt] text-neutral-600">
          {(school?.phone || school?.email) && <div>{[school.phone && localMobile(school.phone), school.email].filter(Boolean).join(" · ")}</div>}
          {school?.website && <div>{school.website}</div>}
        </div>
        {settings.backText && <p className="mt-[4mm] text-[5.3pt] leading-snug text-neutral-800">{settings.backText}</p>}
        <div className="mt-auto flex w-full items-end justify-between gap-[3mm]">
          <span className="text-[5pt] text-neutral-500">{t("validFor", { year: year.name })}</span>
          <span className="min-w-[22mm] border-t border-neutral-500 pt-[0.4mm] text-center text-[5pt] text-neutral-700">{settings.signatureLabel}</span>
        </div>
      </div>
    </Frame>
  );
}
