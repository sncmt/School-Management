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

  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return home;
  if (next === login || next.startsWith(`${login}?`)) return home;

  return next;
};

/** Where a successful login goes. */
export const afterLoginPath = (type: SessionType, next: string | null) => safeNextPath(next, type);

export const loginPathWithNext = (type: SessionType, next: string, reason?: "expired") => {
  const params = new URLSearchParams({ next });
  if (reason) params.set("reason", reason);
  return `${authRoutes[type].login}?${params}`;
};
