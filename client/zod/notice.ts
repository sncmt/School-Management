import { z } from "zod";
import { NOTICE_AUDIENCES, NOTICE_CATEGORIES } from "@/lib/school/notices";

// Mirrors createNotice in server/src/app/modules/notice/notice.validation.ts.
// Messages are translation keys; <FormMessage> shows them in the current language.

export type NoticeFormValues = {
  title: string;
  body: string;
  category: (typeof NOTICE_CATEGORIES)[number];
  audience: (typeof NOTICE_AUDIENCES)[number];
  // families' notices: every family, or only the chosen classes
  allFamilies: boolean;
  // each chosen class: no sections = the whole class
  places: { classId: string; sectionIds: string[] }[];
  isPublic: boolean;
  pinned: boolean;
  // datetime-local values ("2026-10-18T09:00", the browser's time); "" = not set
  publishAt: string;
  expiresAt: string;
};

export const noticeFormSchema = z
  .object({
    title: z.string().trim().min(3, "validation.noticeTitleRequired").max(200, "validation.max200"),
    body: z.string().trim().min(1, "validation.noticeBodyRequired").max(10_000, "validation.noticeBodyTooLong"),
    category: z.enum(NOTICE_CATEGORIES),
    audience: z.enum(NOTICE_AUDIENCES),
    allFamilies: z.boolean(),
    places: z.array(z.object({ classId: z.string(), sectionIds: z.array(z.string()) })),
    isPublic: z.boolean(),
    pinned: z.boolean(),
    publishAt: z.string(),
    expiresAt: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.audience === "FAMILIES" && !v.allFamilies && v.places.length === 0) {
      ctx.addIssue({ code: "custom", path: ["places"], message: "validation.chooseClasses" });
    }
    if (v.publishAt && v.expiresAt && v.expiresAt <= v.publishAt) {
      ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "validation.endAfterStart" });
    }
  });

/** "2026-10-18T09:00" in the browser's time, from an ISO date. */
export const toLocalInput = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** An ISO date from a datetime-local value; null when empty. */
export const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);
