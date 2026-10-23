import type { SessionType } from "@/lib/tenant";

/*
 * Public URLs per site. Each logged-in site is served at the root of its own
 * subdomain; middleware rewrites to the folder that holds its pages:
 *   admin.<root>/schools/new  ->  app/platform/schools/new
 *   abc.<root>/dashboard      ->  app/school/dashboard
 */
export const authRoutes = {
  PLATFORM: {
    login: "/login",
    home: "/",
    changePassword: "/change-password",
  },
  SCHOOL: {
    login: "/login",
    home: "/dashboard",
    changePassword: "/change-password",
  },
} as const satisfies Record<SessionType, Record<string, string>>;

// a school's pages for everyone (no login): its homepage (app/school/page) and app/school/notice-board
export const publicSchoolRoutes = {
  home: "/",
  noticeBoard: "/notice-board",
} as const;

// app/ folder each site's pages live in
export const siteAppFolder = {
  PLATFORM: "/platform",
  SCHOOL: "/school",
} as const satisfies Record<SessionType, string>;

// Readable flag cookie set by the server alongside the tokens; it lives as long
// as the refresh token, so it says "a session probably exists" without being a secret.
export const sessionFlagCookie = {
  PLATFORM: "platformSession",
  SCHOOL: "schoolSession",
} as const satisfies Record<SessionType, string>;

/**
 * Where to go after login. Only paths on this same host are accepted, so
 * ?next= can't send the user to another site.
 */
export const safeNextPath = (next: string | null | undefined, type: SessionType): string => {
  const { home, login } = authRoutes[type];
  if (!next || !next.startsWith("/")) return home;

  // read it as the browser will: it drops tabs and newlines and treats "\" as "/", so
  // "/\t/evil.com" is "//evil.com". Only an address on this same site is kept.
  const base = "http://same.invalid";
  let url: URL;
  try {
    url = new URL(next, base);
  } catch {
    return home;
  }
  if (url.origin !== base) return home;

  const path = url.pathname + url.search + url.hash;
  if (url.pathname === login) return home;
  return path;
};

/** Where a successful login goes. */
export const afterLoginPath = (type: SessionType, next: string | null) => safeNextPath(next, type);

export const loginPathWithNext = (type: SessionType, next: string, reason?: "expired") => {
  const params = new URLSearchParams({ next });
  if (reason) params.set("reason", reason);
  return `${authRoutes[type].login}?${params}`;
};
