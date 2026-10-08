/*
 * Which site a host belongs to. Mirrors the server's DomainUtils:
 *   localhost:3000, sncmt.com, www.sncmt.com   -> the marketing site
 *   admin.localhost:3000, admin.sncmt.com      -> the platform admin
 *   abc.localhost:3000, abc.sncmt.com          -> school "abc"
 * Safe to import from middleware (no Node APIs).
 */

export type SessionType = "PLATFORM" | "SCHOOL";

export type Site =
  | { type: "MARKETING" }
  | { type: "PLATFORM" }
  | { type: "SCHOOL"; subdomain: string };

// host[:port] of the marketing site; the admin and the schools are its subdomains
export const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000").toLowerCase();

// reserved on the server too, so no school can take it
export const ADMIN_SUBDOMAIN = "admin";

const rootHostname = ROOT_DOMAIN.split(":")[0];

export const getSiteFromHost = (host: string | null | undefined): Site => {
  const hostname = (host ?? "").toLowerCase().split(":")[0];

  if (hostname.endsWith(`.${rootHostname}`)) {
    const subdomain = hostname.slice(0, -(rootHostname.length + 1));
    if (subdomain === ADMIN_SUBDOMAIN) return { type: "PLATFORM" };
    if (subdomain && subdomain !== "www" && !subdomain.includes(".")) {
      return { type: "SCHOOL", subdomain };
    }
  }
  return { type: "MARKETING" };
};

/** Browser only: the session type of the site this page is on (none on the marketing site). */
export const currentSessionType = (): SessionType | null => {
  const site = getSiteFromHost(window.location.host);
  return site.type === "MARKETING" ? null : site.type;
};
