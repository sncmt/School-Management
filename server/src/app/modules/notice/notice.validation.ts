import { z } from "zod";
import { NoticeAudience, NoticeCategory } from "../../../../generated/prisma/enums";
import { idSchema } from "../../shared/financeSchemas";

const target = z.object({
  classId: idSchema("Class"),
  // left out: the whole class
  sectionId: z.string().trim().min(1).optional(),
});

const noticeFields = {
  title: z.string({ error: "Title is required!" }).trim().min(3, "Title is required!").max(200),
  // plain text: blank lines between paragraphs, **bold**, "- " list items
  body: z.string({ error: "Write the notice" }).trim().min(1, "Write the notice").max(10_000),
  category: z.enum(NoticeCategory).default("GENERAL"),
  audience: z.enum(NoticeAudience).default("EVERYONE"),
  // families' notices only: these classes / sections (none = every family)
  targets: z.array(target).max(50).default([]),
  isPublic: z.boolean().default(false),
  pinned: z.boolean().default(false),
  // null / left out: as soon as it is published
  publishAt: z.coerce.date().nullable().optional(),
  // null / left out: it stays on the board
  expiresAt: z.coerce.date().nullable().optional(),
};

const rules = (d: { audience?: string; targets?: unknown[]; publishAt?: Date | null; expiresAt?: Date | null }, ctx: z.RefinementCtx) => {
  if (d.targets && d.targets.length > 0 && d.audience !== undefined && d.audience !== "FAMILIES") {
    ctx.addIssue({ code: "custom", path: ["targets"], message: "Classes can only be chosen for a notice to families" });
  }
  if (d.publishAt && d.expiresAt && d.expiresAt <= d.publishAt) {
    ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "The end must be after the start" });
  }
};

const createNotice = z
  .strictObject({
    ...noticeFields,
    // true: publish now (needs notice:publish); false: a draft
    publish: z.boolean().default(false),
  })
  .superRefine(rules);

// every field optional; targets, when sent, replace the old ones
const updateNotice = z
  .strictObject({
    title: noticeFields.title.optional(),
    body: noticeFields.body.optional(),
    category: z.enum(NoticeCategory).optional(),
    audience: z.enum(NoticeAudience).optional(),
    targets: z.array(target).max(50).optional(),
    isPublic: z.boolean().optional(),
    pinned: z.boolean().optional(),
    publishAt: z.coerce.date().nullable().optional(),
    expiresAt: z.coerce.date().nullable().optional(),
  })
  .superRefine(rules)
  .refine((d) => Object.keys(d).length > 0, { message: "Provide at least one field to update" });

const publishNotice = z.strictObject({
  // left out: now
  publishAt: z.coerce.date().nullable().optional(),
});

const noticeIdParams = z.object({ noticeId: idSchema("Notice id") });
const attachmentParams = z.object({ noticeId: idSchema("Notice id"), attachmentId: idSchema("Attachment id") });

const page = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};

const listQuery = z.object({
  // LIVE: on the board now; SCHEDULED: published for later; EXPIRED: past its end; DRAFT
  state: z.enum(["LIVE", "SCHEDULED", "EXPIRED", "DRAFT"]).optional(),
  category: z.enum(NoticeCategory).optional(),
  audience: z.enum(NoticeAudience).optional(),
  search: z.string().trim().min(1).max(100).optional(),
  ...page,
});

const boardQuery = z.object({ ...page, category: z.enum(NoticeCategory).optional() });

export const NoticeValidation = { createNotice, updateNotice, publishNotice, noticeIdParams, attachmentParams, listQuery, boardQuery };

export type CreateNoticePayload = z.infer<typeof createNotice>;
export type UpdateNoticePayload = z.infer<typeof updateNotice>;
export type NoticeListQuery = z.infer<typeof listQuery>;
export type NoticeBoardQuery = z.infer<typeof boardQuery>;
