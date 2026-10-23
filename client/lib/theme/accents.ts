/*
 * A school's own colours, for its dashboard and public homepage:
 *
 * - the accent (--brand: tabs, table headers, badges, highlights; --brand-soft: its pale tint),
 *   in light and dark mode. Picked to stay readable on white and on the dark canvas, and to
 *   never look like the status colours (green present / paid, red absent / due, amber late).
 * - the sidebar (--school-sidebar), always dark so its white text and gold highlights read.
 *
 * Same keys as ACCENT_COLORS / SIDEBAR_COLORS in server/src/app/modules/schoolSettings: keep
 * them in step.
 */

export const ACCENT_COLORS = ["BLUE", "INDIGO", "VIOLET", "MAROON", "TEAL", "SLATE"] as const;
export type AccentColor = (typeof ACCENT_COLORS)[number];

export const SIDEBAR_COLORS = ["NAVY", "MAROON", "FOREST", "TEAL", "OCEAN", "PURPLE", "CHARCOAL"] as const;
export type SidebarColor = (typeof SIDEBAR_COLORS)[number];

/*
 * brand / soft: highlights and their pale tint (--brand, --brand-soft).
 * ink / inkSoft: the deep shade behind white text: buttons and active tabs (--primary, --navy)
 * and the headings drawn in it (text-navy), with its own pale tint (--navy-soft). In dark mode
 * "ink" is a light tint instead, as globals.css does for the default navy.
 */
type Shade = { brand: string; soft: string; ink: string; inkSoft: string };
const ACCENTS: Record<AccentColor, { light: Shade; dark: Shade }> = {
  // the platform's own (what globals.css has): a school without a choice looks like this
  BLUE: {
    light: { brand: "oklch(0.5 0.17 262)", soft: "oklch(0.952 0.022 262)", ink: "oklch(0.305 0.1 258)", inkSoft: "oklch(0.955 0.018 258)" },
    dark: { brand: "oklch(0.64 0.15 262)", soft: "oklch(0.29 0.05 262)", ink: "oklch(0.82 0.07 258)", inkSoft: "oklch(0.27 0.05 258)" },
  },
  INDIGO: {
    light: { brand: "oklch(0.47 0.18 280)", soft: "oklch(0.952 0.026 280)", ink: "oklch(0.33 0.13 280)", inkSoft: "oklch(0.955 0.02 280)" },
    dark: { brand: "oklch(0.66 0.15 280)", soft: "oklch(0.29 0.06 280)", ink: "oklch(0.82 0.07 280)", inkSoft: "oklch(0.27 0.05 280)" },
  },
  VIOLET: {
    light: { brand: "oklch(0.5 0.18 303)", soft: "oklch(0.955 0.026 303)", ink: "oklch(0.34 0.13 303)", inkSoft: "oklch(0.955 0.02 303)" },
    dark: { brand: "oklch(0.68 0.15 303)", soft: "oklch(0.3 0.06 303)", ink: "oklch(0.83 0.07 303)", inkSoft: "oklch(0.28 0.05 303)" },
  },
  // darker and quieter than the red of "absent", so the two never meet
  MAROON: {
    light: { brand: "oklch(0.42 0.13 15)", soft: "oklch(0.955 0.02 15)", ink: "oklch(0.32 0.1 15)", inkSoft: "oklch(0.955 0.016 15)" },
    dark: { brand: "oklch(0.68 0.12 15)", soft: "oklch(0.29 0.05 15)", ink: "oklch(0.83 0.06 15)", inkSoft: "oklch(0.27 0.04 15)" },
  },
  TEAL: {
    light: { brand: "oklch(0.5 0.09 195)", soft: "oklch(0.955 0.022 195)", ink: "oklch(0.36 0.07 195)", inkSoft: "oklch(0.955 0.018 195)" },
    dark: { brand: "oklch(0.72 0.1 195)", soft: "oklch(0.29 0.045 195)", ink: "oklch(0.84 0.06 195)", inkSoft: "oklch(0.27 0.035 195)" },
  },
  SLATE: {
    light: { brand: "oklch(0.42 0.04 255)", soft: "oklch(0.955 0.008 255)", ink: "oklch(0.32 0.03 255)", inkSoft: "oklch(0.955 0.008 255)" },
    dark: { brand: "oklch(0.72 0.03 255)", soft: "oklch(0.28 0.015 255)", ink: "oklch(0.84 0.02 255)", inkSoft: "oklch(0.27 0.012 255)" },
  },
};

// dark enough for white text in both modes (the sidebar never changes with the theme)
const SIDEBARS: Record<SidebarColor, string> = {
  // the platform's own (what globals.css has)
  NAVY: "oklch(0.285 0.11 263)",
  MAROON: "oklch(0.3 0.1 15)",
  FOREST: "oklch(0.3 0.07 155)",
  TEAL: "oklch(0.32 0.06 200)",
  // a lighter sea-teal (#0a6a6a, chosen by name); white text still reads at about 6 : 1
  OCEAN: "#0a6a6a",
  PURPLE: "oklch(0.3 0.11 300)",
  CHARCOAL: "oklch(0.27 0.012 260)",
};

/** The accent that goes well with a sidebar colour (a suggestion; any pair is allowed). */
export const SUGGESTED_ACCENT: Record<SidebarColor, AccentColor> = {
  NAVY: "BLUE",
  MAROON: "MAROON",
  FOREST: "TEAL",
  TEAL: "TEAL",
  OCEAN: "TEAL",
  PURPLE: "VIOLET",
  CHARCOAL: "SLATE",
};

/** The accent's main colour in light mode (for a swatch). */
export const accentSwatch = (accent: AccentColor) => ACCENTS[accent].light.brand;
/** The sidebar colour (for a swatch or a preview). */
export const sidebarSwatch = (sidebar: SidebarColor) => SIDEBARS[sidebar];

/** A known accent, or null for anything else (an old or unknown value means the default). */
export const asAccent = (value: string | null | undefined): AccentColor | null =>
  value && (ACCENT_COLORS as readonly string[]).includes(value) ? (value as AccentColor) : null;
/** A known sidebar colour, or null for anything else (the default navy). */
export const asSidebar = (value: string | null | undefined): SidebarColor | null =>
  value && (SIDEBAR_COLORS as readonly string[]).includes(value) ? (value as SidebarColor) : null;

export type SchoolColors = { accent: AccentColor | null; sidebar: SidebarColor | null };

/**
 * The CSS that gives the page a school's colours, or "" for the defaults. It comes after the
 * app's stylesheet, so it wins. The accent is in two rules: light mode on the page
 * (:root:not(.dark)) and dark mode (.dark, which also covers the always-dark sidebar). Buttons
 * keep their own near-white in dark mode, so --primary is only set for light mode. The sidebar
 * colour is the same in both.
 */
export const schoolColorsCss = ({ accent, sidebar }: SchoolColors) => {
  let css = "";
  if (accent && accent !== "BLUE") {
    const { light, dark } = ACCENTS[accent];
    css +=
      `:root:not(.dark){--brand:${light.brand};--brand-soft:${light.soft};--primary:${light.ink};--navy:${light.ink};--navy-soft:${light.inkSoft}}` +
      `.dark{--brand:${dark.brand};--brand-soft:${dark.soft};--navy:${dark.ink};--navy-soft:${dark.inkSoft}}`;
  }
  if (sidebar && sidebar !== "NAVY") css += `:root{--school-sidebar:${SIDEBARS[sidebar]}}`;
  return css;
};

// the <style> element carrying a school's colours (written by the school layout, replaced on a change)
export const SCHOOL_COLORS_STYLE_ID = "school-colors";

/** Puts these colours on the open page at once (while choosing, and after saving), without a reload. */
export const applySchoolColors = (colors: SchoolColors) => {
  let style = document.getElementById(SCHOOL_COLORS_STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = SCHOOL_COLORS_STYLE_ID;
    document.head.append(style);
  }
  style.textContent = schoolColorsCss(colors);
};
