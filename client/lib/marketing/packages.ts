/*
 * The packages on the marketing site. They come from the platform admin's packages (server
 * module "package"): a name, a student limit and a price a month; a year is twelve months. Every
 * package has every feature, so they differ only in how many students they allow.
 */

export type Billing = "MONTHLY" | "YEARLY";

// Mirrors GET /package. Money arrives as "500.00".
export type PublicPackage = {
  // BASIC, STANDARD...: never changes
  code: string;
  name: string;
  // the most active students; null = unlimited
  maxStudents: number | null;
  monthlyPrice: string;
  yearlyPrice: string;
};

export const priceOf = (pkg: PublicPackage, billing: Billing) => Number(billing === "MONTHLY" ? pkg.monthlyPrice : pkg.yearlyPrice);

/** What a year costs less than twelve months, or 0. */
export const yearlySaving = (pkg: PublicPackage) => Math.max(0, Number(pkg.monthlyPrice) * 12 - Number(pkg.yearlyPrice));

// what every package includes (marketing.pricing.features.* keys)
export const INCLUDED_FEATURES = [
  "core",
  "attendance",
  "exams",
  "fees",
  "sms",
  "notices",
  "website",
  "app",
  "cards",
  "onlinePayment",
  "devices",
  "bangla",
] as const;

/*
 * Custom: not one of the platform admin's packages but a one-time build for one institution, on
 * its own domain, with features made for it. It has no set price: it is agreed with each institution.
 * The contact form sends its code with no billing period.
 */
export const CUSTOM_PACKAGE = { code: "CUSTOM" } as const;

// the contact form's value for a package and billing ("BASIC:YEARLY", or "CUSTOM"); codes may hold "_"
export const packageChoice = (code: string, billing?: Billing) => (billing ? `${code}:${billing}` : code);

// the contact page, with a package already chosen: /contact?package=STANDARD&billing=YEARLY (Custom: no billing)
export const contactHref = (code?: string, billing?: Billing) => {
  if (!code) return "/contact";
  const query = new URLSearchParams({ package: code, ...(billing ? { billing } : {}) });
  return `/contact?${query}`;
};

/**
 * The package a visitor chose on the packages section, as the contact form's value, if it is one
 * on offer (a link may be old or typed by hand); otherwise "" (not chosen).
 */
export const chosenPlan = (packages: PublicPackage[], code?: string, billing?: string) => {
  if (code === CUSTOM_PACKAGE.code) return packageChoice(CUSTOM_PACKAGE.code);
  if (!packages.some((pkg) => pkg.code === code)) return "";
  return billing === "MONTHLY" || billing === "YEARLY" ? packageChoice(code!, billing) : "";
};
