import type { ListMeta, NoticeAttachment, NoticeCategory } from "@/lib/school/noticeKinds";

/*
 * Server only: a school's public notices (those marked "show on the public notice page"
 * that are up now), for its notice board pages. Cached for a minute.
 */

const API_URL = process.env.API_URL ?? "http://localhost:5000";

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

const get = async <T>(path: string): Promise<T | null> => {
  const res = await fetch(`${API_URL}/api/v1/notice/public/${path}`, { next: { revalidate: 60 } });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`Loading public notices failed with ${res.status}`);
  return ((await res.json()) as { data: T }).data;
};

export const getPublicNotices = (subdomain: string, query: { page: number; category?: NoticeCategory }) => {
  const params = new URLSearchParams({ page: String(query.page), limit: "15" });
  if (query.category) params.set("category", query.category);
  return get<{ items: PublicNoticeItem[]; meta: ListMeta }>(`${encodeURIComponent(subdomain)}?${params}`);
};

export const getPublicNotice = (subdomain: string, noticeId: string) =>
  get<PublicNotice>(`${encodeURIComponent(subdomain)}/${encodeURIComponent(noticeId)}`);
