/*
 * The packages on the marketing site, in Taka. Each lists only what it adds to the one before;
 * the wording of every feature is in messages (marketing.pricing.features.<key>).
 */

export type Billing = "MONTHLY" | "YEARLY";
export type PackageId = "BASIC" | "STANDARD" | "PREMIUM";

// marketing.pricing.features.* keys
export type PackageFeature =
  | "students300"
  | "students800"
  | "studentsUnlimited"
  | "core"
  | "attendance"
  | "exams"
  | "notices"
  | "website"
  | "fees"
  | "sms"
  | "app"
  | "cards"
  | "onlinePayment"
  | "devices"
  | "support";

export type Package = {
  id: PackageId;
  price: Record<Billing, number>;
  features: PackageFeature[];
  popular?: boolean;
};

export const PACKAGES: Package[] = [
  {
    id: "BASIC",
    price: { MONTHLY: 500, YEARLY: 6000 },
    features: ["students300", "core", "attendance", "exams", "notices", "website"],
  },
  {
    id: "STANDARD",
    price: { MONTHLY: 1000, YEARLY: 12000 },
    features: ["students800", "fees", "sms", "app", "cards"],
    popular: true,
  },
  {
    id: "PREMIUM",
    price: { MONTHLY: 1500, YEARLY: 16000 },
    features: ["studentsUnlimited", "onlinePayment", "devices", "support"],
  },
];

/** What a year costs less than twelve months, or 0. */
export const yearlySaving = (pkg: Package) => Math.max(0, pkg.price.MONTHLY * 12 - pkg.price.YEARLY);

export const MAX_YEARLY_SAVING = Math.max(...PACKAGES.map(yearlySaving));

// a package button tells the contact form which one was chosen
export const CHOOSE_PACKAGE_EVENT = "sncmt:choose-package";
export type ChoosePackageDetail = { id: PackageId; billing: Billing };
