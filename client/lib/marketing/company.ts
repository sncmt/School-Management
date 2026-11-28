// the platform's public domain, as visitors know it (shown in examples, whatever host this runs on)
export const PUBLIC_DOMAIN = "sncmt.com";

// the platform's WhatsApp for schools and visitors (the homepage's button, the dashboard menu's help line)
export const SUPPORT_WHATSAPP = "+8801626567819";

/** Server only: the platform's own contacts for the marketing site, each shown only when set. */
export const companyContact = {
  phone: process.env.CONTACT_PHONE,
  email: process.env.CONTACT_EMAIL,
  address: process.env.CONTACT_ADDRESS,
  // the homepage's WhatsApp button (CONTACT_WHATSAPP replaces it)
  whatsapp: process.env.CONTACT_WHATSAPP || SUPPORT_WHATSAPP,
};

// a WhatsApp chat with this number, the message already typed: "+8801…" -> wa.me/8801…
export const whatsappLink = (phone: string, text: string) => `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

// "+8801712345678" -> "01712345678", how people here write it
export const localPhone = (phone: string) => phone.replace(/^\+?880/, "0");

// "+8801626567819" -> "01626-567819": the local number, split after the operator code
export const displayPhone = (phone: string) => localPhone(phone).replace(/^(\d{5})(\d{6})$/, "$1-$2");
