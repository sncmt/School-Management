import type { ListMeta, NoticeAttachment, NoticeCategory } from "@/lib/school/noticeKinds";

/*
 * A school's public notices (those marked "show on the public notice page" that are up now),
 * for the notices section of its homepage. The first page loads on the server (cached for a
 * minute); more pages and a notice in full load in the browser, through the same public API.
 */

const API_URL = process.env.API_URL ?? "http://localhost:5000";

// notices per page of the homepage's list
export const PUBLIC_NOTICES_PAGE = 6;

export type PublicNoticeItem = {
  id: string;
  title: string;
  category: NoticeCategory;
  pinned: boolean;
  publishAt: string;
  expiresAt: string | null;
  attachmentCount: number;
};

export type PublicNotice = Omit<PublicNoticeItem, "attachmentCount"> & { body: string; attachments: NoticeAttachment[] };

export type PublicNoticePage = { items: PublicNoticeItem[]; meta: ListMeta };

const listPath = (subdomain: string, page: number) =>
  `notice/public/${encodeURIComponent(subdomain)}?${new URLSearchParams({ page: String(page), limit: String(PUBLIC_NOTICES_PAGE) })}`;

/** Server only: the first page, for the homepage's first paint. */
export const getPublicNotices = async (subdomain: string): Promise<PublicNoticePage | null> => {
  const res = await fetch(`${API_URL}/api/v1/${listPath(subdomain, 1)}`, { next: { revalidate: 60 } });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`Loading public notices failed with ${res.status}`);
  return ((await res.json()) as { data: PublicNoticePage }).data;
};

// in the browser: through the app's own /api proxy (no login needed for these)
const browserGet = async <T>(path: string): Promise<T> => {
  const res = await fetch(`/api/v1/${path}`);
  if (!res.ok) throw new Error(String(res.status));
  return ((await res.json()) as { data: T }).data;
};

/** Browser: a further page of the list. */
export const fetchPublicNotices = (subdomain: string, page: number) => browserGet<PublicNoticePage>(listPath(subdomain, page));

/** Browser: one notice in full, with its files. */
export const fetchPublicNotice = (subdomain: string, noticeId: string) =>
  browserGet<PublicNotice>(`notice/public/${encodeURIComponent(subdomain)}/${encodeURIComponent(noticeId)}`);
