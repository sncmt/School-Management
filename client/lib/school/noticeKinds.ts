// Notice constants and shared shapes, without "use client": the public notice pages
// (server components) read them too. Mirrors server/src/app/modules/notice.

export const NOTICE_CATEGORIES = ["GENERAL", "EXAM", "HOLIDAY", "FEES", "EVENT", "URGENT"] as const;
export type NoticeCategory = (typeof NOTICE_CATEGORIES)[number];

export const NOTICE_AUDIENCES = ["EVERYONE", "STAFF", "FAMILIES"] as const;
export type NoticeAudience = (typeof NOTICE_AUDIENCES)[number];

export const NOTICE_STATES = ["LIVE", "SCHEDULED", "EXPIRED", "DRAFT"] as const;
export type NoticeState = (typeof NOTICE_STATES)[number];

// the server keeps images as WebP and PDFs as they are; url is a signed link (null without storage)
export type NoticeAttachment = { id: string; name: string; contentType: string; size: number; url: string | null };

export type ListMeta = { page: number; limit: number; total: number; totalPages: number };
