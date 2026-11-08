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

// a package button tells the contact form which one was chosen
export const CHOOSE_PACKAGE_EVENT = "sncmt:choose-package";
export type ChoosePackageDetail = { code: string; billing: Billing };

// the contact form's value for a package and billing ("BASIC:YEARLY"); codes may hold "_"
export const packageChoice = (code: string, billing: Billing) => `${code}:${billing}`;
