"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { CSSProperties, ReactNode } from "react";
import { useLocalizedName } from "@/lib/i18n/names";
import type { ResultCard, ResultCards } from "@/lib/school/results";
import { cn } from "@/lib/utils";

/*
 * One student's result card, drawn from the school's card settings. Sized for an A4 page
 * (190 mm wide inside the print margins), so the screen and the printout match.
 */
export function ResultCardView({ data, card }: { data: Omit<ResultCards, "cards">; card: ResultCard }) {
  const t = useTranslations("school.exams.card");
  const format = useFormatter();
  const name = useLocalizedName();
  const s = data.settings;
  const accent = s.accentColor;
  const compact = s.layout === "COMPACT";
  const modern = s.layout === "MODERN";
  const graded = data.gradingReference?.resultSystem !== "MARKS_ONLY";

  const num = (v: string | number | null | undefined, fraction = 2) =>
    v === null || v === undefined ? "—" : format.number(Number(v), { maximumFractionDigits: fraction });
  const gpa = (v: string | null) => (v === null ? "—" : format.number(Number(v), { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const ordinal = (n: number, of: number) => t("positionOf", { n: format.number(n), of: format.number(of) });

  const showHighest = s.highestMarks !== "NONE";
  // a final result card: a column per component (Half-yearly 30%, Annual 70%)
  const components = s.showComponents ? (data.components ?? []) : [];
  const columns = [
    s.showCode && "code",
    "subject",
    s.showFullMarks && "full",
    s.showPassMarks && "pass",
    ...components.map((c) => `component:${c.id}`),
    "marks",
    showHighest && "highest",
    graded && s.showGrade && "grade",
    graded && s.showPoint && "point",
  ].filter(Boolean) as string[];

  const scale = data.gradingReference?.classScale ?? null;
  const title = s.title || t("defaultTitle");
  const cell = compact ? "px-1.5 py-0.5" : "px-2 py-1";

  return (
    <div
      className={cn(
        "mx-auto w-[190mm] bg-white text-[13px] leading-snug text-neutral-900",
        compact ? "space-y-2 p-4" : "space-y-3 p-6",
        s.layout === "CLASSIC" && "border-2",
        modern && "border-l-[10px]",
      )}
      style={{ borderColor: accent } as CSSProperties}
    >
      {/* ------------------------------------------------------------ header */}
      <header className={cn("flex items-center gap-3", s.layout === "CLASSIC" ? "justify-center text-center" : "")}>
        {s.showLogo && data.school?.logo && (
          // eslint-disable-next-line @next/next/no-img-element -- signed links to private storage
          <img src={data.school.logo} alt="" className={cn("object-contain", compact ? "size-12" : "size-16")} />
        )}
        <div className={cn(s.layout === "CLASSIC" && "flex-none")}>
          <div className={cn("font-bold", compact ? "text-base" : "text-xl")} style={{ color: accent }}>
            {data.school ? name(data.school) : ""}
          </div>
          {s.showAddress && data.school?.address && <div className="text-neutral-600">{data.school.address}</div>}
          <div className="text-neutral-600">
            {name(data.exam)} · {data.academicYear.name}
          </div>
        </div>
      </header>

      <div
        className={cn("text-center font-semibold tracking-wide", compact ? "py-0.5 text-xs" : "py-1 text-sm", modern ? "rounded" : "")}
        style={{ backgroundColor: accent, color: "#fff" }}
      >
        {title}
      </div>

      {/* ---------------------------------------------------- student details */}
      <section className="flex gap-3">
        <dl className={cn("grid flex-1 grid-cols-[auto_1fr_auto_1fr] gap-x-3", compact ? "gap-y-0" : "gap-y-0.5")}>
          <Info label={t("name")}>
            <span className="font-semibold">{name(card.student)}</span>
          </Info>
          <Info label={t("class")}>
            {data.class.name}
            {!card.section.isDefault && ` · ${t("section")} ${card.section.name}`}
          </Info>
          <Info label={t("roll")}>{card.rollNumber ?? "—"}</Info>
          {s.showAdmissionNo ? <Info label={t("admissionNo")}>{card.student.admissionNo}</Info> : <Info label="">{""}</Info>}
          {card.group && <Info label={t("group")}>{name(card.group)}</Info>}
          {s.showParents && (
            <>
              <Info label={t("father")}>{card.student.fatherName}</Info>
              <Info label={t("mother")}>{card.student.motherName}</Info>
            </>
          )}
        </dl>
        {s.showPhoto && (
          <div className={cn("flex-none overflow-hidden border bg-neutral-50", compact ? "h-20 w-16" : "h-24 w-20")}>
            {card.student.photo && (
              // eslint-disable-next-line @next/next/no-img-element -- signed links to private storage
              <img src={card.student.photo} alt="" className="size-full object-cover" />
            )}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------ subject table */}
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ backgroundColor: modern ? `${accent}1a` : "#f5f5f5" }}>
            {columns.map((c) => (
              <th key={c} className={cn("border border-neutral-300 font-semibold", cell, c === "subject" ? "text-left" : "text-center")}>
                {c.startsWith("component:") ? <ComponentHeader component={components.find((x) => `component:${x.id}` === c)!} /> : t(`columns.${c}` as "columns.subject")}
                {c === "highest" && (
                  <span className="block font-normal text-neutral-500">{t(s.highestMarks === "SECTION" ? "inSection" : "inClass")}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {card.subjects.map((line) => {
            const failed = !line.passed && !line.excluded;
            return (
              <SubjectRows
                key={line.subjectId}
                columns={columns}
                cell={cell}
                failed={failed}
                cells={{
                  code: line.code ?? "",
                  subject: (
                    <>
                      <span className="font-medium">{name(line)}</span>
                      {line.isOptional && <span className="text-neutral-500"> ({t("optional")})</span>}
                      {s.showParts && line.parts && line.parts.length > 0 && !line.isAbsent && (
                        <span className="block text-[12px] text-neutral-500">
                          {line.parts.map((p) => `${p.name} ${num(p.marks)}/${num(p.fullMarks)}`).join(" · ")}
                        </span>
                      )}
                    </>
                  ),
                  full: num(line.fullMarks),
                  pass: num(line.passMarks),
                  marks: line.isAbsent ? t("absent") : num(line.marks),
                  highest: num(s.highestMarks === "SECTION" ? line.highestInSection : line.highestInClass),
                  grade: line.excluded ? "—" : (line.grade ?? "—"),
                  point: line.excluded || line.point === null ? "—" : gpa(line.point),
                  ...Object.fromEntries(
                    (line.components ?? []).map((c) => [`component:${c.componentId}`, c.percentage === null ? "—" : `${num(c.percentage)}%`]),
                  ),
                }}
                papers={
                  line.papers?.map((p) => ({
                    key: p.subjectId,
                    subject: <span className="pl-3 text-neutral-600">{name(p)}</span>,
                    full: num(p.fullMarks),
                    marks: p.isAbsent ? t("absent") : num(p.marks),
                  })) ?? []
                }
              />
            );
          })}
        </tbody>
      </table>

      {/* ------------------------------------------------------------ summary */}
      <section className={cn("grid gap-3", s.showGradingTable && graded && scale ? "grid-cols-[1fr_auto]" : "grid-cols-1")}>
        <div className="space-y-2">
          <div className={cn("grid gap-2", modern ? "grid-cols-4" : "grid-cols-2 sm:grid-cols-4")}>
            <Stat label={t("total")} value={`${num(card.totalMarks)} / ${num(card.fullMarks)}`} accent={accent} modern={modern} />
            <Stat label={t("percentage")} value={`${num(card.percentage)}%`} accent={accent} modern={modern} />
            {graded && <Stat label={t("gpa")} value={gpa(card.gpa)} accent={accent} modern={modern} big={modern} />}
            {graded && <Stat label={t("grade")} value={card.grade ?? "—"} accent={accent} modern={modern} />}
            <Stat
              label={t("result")}
              value={card.passed ? t("passed") : t("failed", { count: card.failedSubjects })}
              accent={card.passed ? accent : "#be123c"}
              modern={modern}
            />
            {(s.position === "SECTION" || s.position === "BOTH") && !card.section.isDefault && (
              <Stat label={t("sectionPosition")} value={ordinal(card.position.section, card.position.sectionOutOf)} accent={accent} modern={modern} />
            )}
            {(s.position === "CLASS" || s.position === "BOTH" || (s.position === "SECTION" && card.section.isDefault)) && (
              <Stat label={t("classPosition")} value={ordinal(card.position.class, card.position.classOutOf)} accent={accent} modern={modern} />
            )}
            {s.showAttendance && (
              <Stat
                label={t("attendance")}
                value={
                  card.attendance.workingDays
                    ? `${format.number(card.attendance.present)} / ${format.number(card.attendance.workingDays)}${card.attendance.percentage !== null ? ` (${num(card.attendance.percentage, 0)}%)` : ""}`
                    : "—"
                }
                accent={accent}
                modern={modern}
              />
            )}
          </div>
          {s.showRemarks && (
            <div className="rounded border border-neutral-300 p-2">
              <div className="text-[12px] font-semibold uppercase text-neutral-500">{t("remarks")}</div>
              <div className="min-h-8">{card.remark ?? ""}</div>
            </div>
          )}
        </div>

        {s.showGradingTable && graded && scale && (
          <table className="h-fit border-collapse text-[12px]">
            <thead>
              <tr className="bg-neutral-100">
                <th className="border border-neutral-300 px-1.5">{t("marksRange")}</th>
                <th className="border border-neutral-300 px-1.5">{t("columns.grade")}</th>
                <th className="border border-neutral-300 px-1.5">{t("columns.point")}</th>
              </tr>
            </thead>
            <tbody>
              {scale.markBands.map((b, i) => {
                const upper = i === 0 ? 100 : scale.markBands[i - 1].minPercent;
                return (
                  <tr key={b.grade}>
                    <td className="border border-neutral-300 px-1.5 text-center tabular-nums">
                      {num(b.minPercent)}–{i === 0 ? num(100) : `<${num(upper)}`}
                    </td>
                    <td className="border border-neutral-300 px-1.5 text-center font-medium">{b.grade}</td>
                    <td className="border border-neutral-300 px-1.5 text-center tabular-nums">{gpa(String(b.point))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* -------------------------------------------------------- signatures */}
      {s.signatures.length > 0 && (
        <footer
          className={cn("grid gap-6 text-center", compact ? "pt-6" : "pt-10")}
          style={{ gridTemplateColumns: `repeat(${s.signatures.length}, minmax(0, 1fr))` }}
        >
          {s.signatures.map((label, i) => (
            <div key={i} className="border-t border-neutral-500 pt-1 text-neutral-700">
              {label}
            </div>
          ))}
        </footer>
      )}
      {(s.footerNote || data.publishedAt) && (
        <div className="flex justify-between gap-2 text-[12px] text-neutral-500">
          <span>{s.footerNote}</span>
          {data.publishedAt && <span>{t("published", { date: format.dateTime(new Date(data.publishedAt), { dateStyle: "medium" }) })}</span>}
        </div>
      )}
    </div>
  );
}

/* A component column's heading: its name and weight. */
function ComponentHeader({ component }: { component: NonNullable<ResultCards["components"]>[number] }) {
  const name = useLocalizedName();
  const format = useFormatter();
  return (
    <>
      {name(component)}
      <span className="block font-normal text-neutral-500">{format.number(Number(component.weight), { maximumFractionDigits: 2 })}%</span>
    </>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-neutral-500">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

function Stat({ label, value, accent, modern, big }: { label: string; value: string; accent: string; modern: boolean; big?: boolean }) {
  return (
    <div className={cn("rounded border px-2 py-1", modern ? "border-transparent" : "border-neutral-300")} style={modern ? { backgroundColor: `${accent}12` } : undefined}>
      <div className="text-[12px] text-neutral-500">{label}</div>
      <div className={cn("font-semibold tabular-nums", big ? "text-lg" : "text-sm")} style={{ color: accent }}>
        {value}
      </div>
    </div>
  );
}

/* A subject's row, and for combined papers (Bangla 1st + 2nd) a small row per paper under it. */
function SubjectRows({
  columns,
  cell,
  failed,
  cells,
  papers,
}: {
  columns: string[];
  cell: string;
  failed: boolean;
  cells: Record<string, ReactNode>;
  papers: { key: string; subject: ReactNode; full: string; marks: string }[];
}) {
  return (
    <>
      <tr className={cn(failed && "bg-rose-50")}>
        {columns.map((c) => (
          <td
            key={c}
            className={cn(
              "border border-neutral-300 tabular-nums",
              cell,
              c === "subject" ? "text-left" : "text-center",
              failed && (c === "marks" || c === "grade") && "font-semibold text-rose-700",
            )}
          >
            {cells[c]}
          </td>
        ))}
      </tr>
      {papers.map((p) => (
        <tr key={p.key} className="text-[12px]">
          {columns.map((c) => (
            <td key={c} className={cn("border border-neutral-200 tabular-nums text-neutral-600", cell, c === "subject" ? "text-left" : "text-center")}>
              {c === "subject" ? p.subject : c === "full" ? p.full : c === "marks" ? p.marks : ""}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
