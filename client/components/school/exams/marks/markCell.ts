import { toAsciiDigits } from "@/lib/i18n/digits";
import type { MarkInput, MarkPart } from "@/lib/school/marks";

/** What one mark looks like while it's being typed. */
export type CellDraft = { absent: boolean; total: string; parts: Record<string, string> };

export type CellSubject = { fullMarks: string; parts: MarkPart[] };

// "A", "a", "Ab", "অ" typed in a total box mean absent
const ABSENT = /^(a|ab|abs|absent|অ|অনু)$/i;

const clean = (n: number) => String(Number(n.toFixed(2)));

/** A saved mark as text boxes. */
export const toDraft = (
  subject: CellSubject,
  saved: { entered: boolean; isAbsent: boolean; parts: Record<string, number> | null; total: string | null },
): CellDraft => ({
  absent: saved.entered && saved.isAbsent,
  total: saved.entered && !saved.isAbsent && saved.total !== null ? clean(Number(saved.total)) : "",
  parts: Object.fromEntries(
    subject.parts.map((p) => [p.name, saved.parts && saved.parts[p.name] !== undefined ? clean(saved.parts[p.name]) : ""]),
  ),
});

export const sameDraft = (a: CellDraft, b: CellDraft) =>
  a.absent === b.absent && a.total === b.total && JSON.stringify(a.parts) === JSON.stringify(b.parts);

export const isBlank = (d: CellDraft) => !d.absent && d.total.trim() === "" && Object.values(d.parts).every((v) => v.trim() === "");

/** A typed total, with "A" meaning absent. */
export const typeTotal = (draft: CellDraft, text: string): CellDraft =>
  ABSENT.test(text.trim()) ? { ...draft, absent: true, total: "" } : { ...draft, absent: false, total: text };

const parse = (text: string) => {
  const v = toAsciiDigits(text.trim());
  return /^\d+(\.\d{1,2})?$/.test(v) ? Number(v) : null;
};

export type CellCheck =
  | { ok: true; input: MarkInput | null } // null: left blank, nothing to save
  | { ok: false; error: "number" | "tooHigh" | "partMissing"; max?: number; part?: string };

/** Checks a draft against its subject: absent, or the total, or every part, within full marks. */
export const checkDraft = (subject: CellSubject, d: CellDraft): CellCheck => {
  if (d.absent) return { ok: true, input: { isAbsent: true } };
  if (isBlank(d)) return { ok: true, input: null };

  if (subject.parts.length > 0) {
    const parts: Record<string, number> = {};
    for (const p of subject.parts) {
      const text = d.parts[p.name] ?? "";
      if (text.trim() === "") return { ok: false, error: "partMissing", part: p.name };
      const v = parse(text);
      if (v === null) return { ok: false, error: "number", part: p.name };
      if (v > Number(p.fullMarks)) return { ok: false, error: "tooHigh", max: Number(p.fullMarks), part: p.name };
      parts[p.name] = v;
    }
    return { ok: true, input: { isAbsent: false, parts } };
  }

  const v = parse(d.total);
  if (v === null) return { ok: false, error: "number" };
  if (v > Number(subject.fullMarks)) return { ok: false, error: "tooHigh", max: Number(subject.fullMarks) };
  return { ok: true, input: { isAbsent: false, total: v } };
};

/** The sum of the parts typed so far (for showing a total next to them). */
export const partsTotal = (d: CellDraft) => {
  const values = Object.values(d.parts).map(parse);
  return values.every((v) => v !== null) ? clean(values.reduce<number>((s, v) => s + (v ?? 0), 0)) : null;
};
