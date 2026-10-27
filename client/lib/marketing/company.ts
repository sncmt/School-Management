/** Server only: the platform's own contacts for the marketing site, each shown only when set. */
export const companyContact = {
  phone: process.env.CONTACT_PHONE,
  email: process.env.CONTACT_EMAIL,
  address: process.env.CONTACT_ADDRESS,
};

// "+8801712345678" -> "01712345678", how people here write it
export const localPhone = (phone: string) => phone.replace(/^\+?880/, "0");
