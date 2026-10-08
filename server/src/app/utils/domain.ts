/*
 * Which school a request is for, from its hostname:
 *   abc.sncmt.com, abc.localhost        -> "abc"
 *   sncmt.com, www.sncmt.com, localhost -> null (the marketing site)
 *   admin.sncmt.com, admin.localhost    -> null (the platform admin)
 * Mirrors client/lib/tenant.ts.
 */

const ROOT_DOMAINS = ["sncmt.com", "localhost"];

// subdomains that are never a school (schools can't register them either)
const NON_SCHOOL_SUBDOMAINS = new Set(["www", "admin"]);

const getSubdomain = (hostname: string): string | null => {
  const normalizedHost = hostname.toLowerCase().split(":")[0];

  for (const root of ROOT_DOMAINS) {
    if (!normalizedHost.endsWith(`.${root}`)) continue;

    const subdomain = normalizedHost.slice(0, -(root.length + 1));
    return subdomain && !subdomain.includes(".") ? subdomain : null;
  }
  return null;
};

const getSchoolSubdomain = (hostname: string): string | null => {
  const subdomain = getSubdomain(hostname);
  return subdomain && !NON_SCHOOL_SUBDOMAINS.has(subdomain) ? subdomain : null;
};

export const DomainUtils = {
  getSchoolSubdomain,
};
