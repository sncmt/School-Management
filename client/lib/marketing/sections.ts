// the marketing homepage's sections, in order: the menu and the footer link to them
export const MARKETING_SECTIONS = ["features", "pricing", "faq"] as const;

// a section's link: on the homepage it scrolls there; on another page (contact, app) it goes back to it
export const sectionHref = (section: string, onHome: boolean) => (onHome ? `#${section}` : `/#${section}`);
