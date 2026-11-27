import { withRgbFallback } from "./oklch";

/*
 * A school's own colours, for its dashboard and public homepage:
 *
 * - the accent (--brand: tabs, table headers, badges, highlights; --brand-soft: its pale tint),
 *   in light and dark mode. Picked to stay readable on white and on the dark canvas, and to
 *   never look like the status colours (green present / paid, red absent / due, amber late).
 * - the accent band (--brand-band, with --brand-band-foreground for its text): a strip in the
 *   accent itself, such as the Students page's status tabs and the menu's current page. The same
 *   in both modes; golden and cream carry dark text, the rest white. And --brand-ink, the accent's
 *   deep shade behind white text in both modes (the homepage's footer).
 * - the sidebar: white by default (LIGHT, saved as no choice; .school-menu in globals.css), or
 *   one of the dark colours (also written as --school-sidebar). It colours the dashboard's menu
 *   only: the welcome banner and the phone's bottom bar use --brand-ink, and the public homepage
 *   uses the accent only (and the menu's gold).
 *
 * Same keys as ACCENT_COLORS / SIDEBAR_COLORS in server/src/app/modules/schoolSettings: keep
 * them in step.
 */

export const ACCENT_COLORS = ["NAVY", "BLUE", "INDIGO", "VIOLET", "MAROON", "TEAL", "DEEP_TEAL", "SLATE", "GOLDEN", "CREAM"] as const;
export type AccentColor = (typeof ACCENT_COLORS)[number];

/** A school's accent until it picks one (saved as no choice; any other is saved by name). */
export const DEFAULT_ACCENT: AccentColor = "NAVY";

export const SIDEBAR_COLORS = ["LIGHT", "NAVY", "INDIGO", "TEAL", "OCEAN", "EMERALD", "PURPLE", "CHARCOAL"] as const;
export type SidebarColor = (typeof SIDEBAR_COLORS)[number];

// text on the darker bands
const WHITE = "oklch(0.985 0 0)";

/*
 * brand / soft: highlights and their pale tint (--brand, --brand-soft).
 * ink / inkSoft: the deep shade behind white text: buttons and active tabs (--primary, --navy)
 * and the headings drawn in it (text-navy), with its own pale tint (--navy-soft). In dark mode
 * "ink" is a light tint instead, as globals.css does for the default navy.
 */
type Shade = { brand: string; soft: string; ink: string; inkSoft: string };
type Accent = { light: Shade; dark: Shade; band?: { color: string; text: string } };
const ACCENTS: Record<AccentColor, Accent> = {
  // the platform's own (what globals.css has); a school without a choice gets NAVY instead
  BLUE: {
    light: { brand: "oklch(0.5 0.17 262)", soft: "oklch(0.952 0.022 262)", ink: "oklch(0.305 0.1 258)", inkSoft: "oklch(0.955 0.018 258)" },
    dark: { brand: "oklch(0.64 0.15 262)", soft: "oklch(0.29 0.05 262)", ink: "oklch(0.82 0.07 258)", inkSoft: "oklch(0.27 0.05 258)" },
  },
  // the sidebar navy as the accent too: deep navy text and buttons, and a navy band
  NAVY: {
    light: { brand: "oklch(0.36 0.11 260)", soft: "oklch(0.95 0.02 258)", ink: "oklch(0.285 0.11 263)", inkSoft: "oklch(0.955 0.018 258)" },
    dark: { brand: "oklch(0.72 0.1 260)", soft: "oklch(0.28 0.05 260)", ink: "oklch(0.82 0.07 258)", inkSoft: "oklch(0.27 0.05 258)" },
    band: { color: "oklch(0.285 0.11 263)", text: WHITE },
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
  /*
   * A deep blue-teal (#0a4a63, from the homepage mockup) for its buttons, headings and band, with a
   * lighter step of it (#13607e) for highlights: white on the band 9.7 : 1, the highlight on white 7 : 1.
   */
  DEEP_TEAL: {
    light: { brand: "oklch(0.459 0.085 230)", soft: "oklch(0.955 0.02 230)", ink: "oklch(0.384 0.073 231)", inkSoft: "oklch(0.955 0.016 231)" },
    dark: { brand: "oklch(0.72 0.09 230)", soft: "oklch(0.29 0.045 230)", ink: "oklch(0.84 0.06 228)", inkSoft: "oklch(0.27 0.035 230)" },
    band: { color: "oklch(0.384 0.073 231)", text: WHITE },
  },
  SLATE: {
    light: { brand: "oklch(0.42 0.04 255)", soft: "oklch(0.955 0.008 255)", ink: "oklch(0.32 0.03 255)", inkSoft: "oklch(0.955 0.008 255)" },
    dark: { brand: "oklch(0.72 0.03 255)", soft: "oklch(0.28 0.015 255)", ink: "oklch(0.84 0.02 255)", inkSoft: "oklch(0.27 0.012 255)" },
  },
  /*
   * The two warm ones. As text and buttons they are a deep gold and a caramel brown (a pale gold or
   * a cream would not read on white); their band is the colour itself, with dark text. Golden's
   * band is the sidebar's gold with its navy text. Contrast on white, light mode: golden text 4.75:1,
   * white on its buttons 8.6:1, navy on its band 8:1; cream text 5.6:1, white on its buttons 10:1,
   * brown on its band 9.3:1.
   */
  GOLDEN: {
    light: { brand: "oklch(0.56 0.12 75)", soft: "oklch(0.96 0.04 88)", ink: "oklch(0.42 0.085 68)", inkSoft: "oklch(0.96 0.03 85)" },
    dark: { brand: "oklch(0.78 0.13 82)", soft: "oklch(0.3 0.05 80)", ink: "oklch(0.85 0.08 85)", inkSoft: "oklch(0.28 0.04 80)" },
    band: { color: "oklch(0.8 0.13 85)", text: "oklch(0.27 0.08 258)" },
  },
  CREAM: {
    light: { brand: "oklch(0.52 0.08 62)", soft: "oklch(0.965 0.025 85)", ink: "oklch(0.38 0.05 58)", inkSoft: "oklch(0.965 0.02 85)" },
    dark: { brand: "oklch(0.78 0.07 72)", soft: "oklch(0.3 0.03 75)", ink: "oklch(0.86 0.05 85)", inkSoft: "oklch(0.28 0.025 75)" },
    band: { color: "oklch(0.94 0.04 88)", text: "oklch(0.36 0.06 58)" },
  },
};

// the band: the accent's light-mode colour with white text, unless it has its own
const band = (accent: AccentColor) => ACCENTS[accent].band ?? { color: ACCENTS[accent].light.brand, text: WHITE };

// the white menu (what .school-menu in globals.css draws; here for its swatch)
const MENU_WHITE = "oklch(1 0 0)";

// the dark ones: dark enough for white text in both modes (they never change with the theme)
const SIDEBARS: Record<SidebarColor, string> = {
  LIGHT: MENU_WHITE,
  // the platform's own (what globals.css has)
  NAVY: "oklch(0.285 0.11 263)",
  // a brighter blue-violet (#4d44b5, chosen by hex); white text reads at about 7.5 : 1
  INDIGO: "#4d44b5",
  TEAL: "oklch(0.32 0.06 200)",
  // a lighter sea-teal (#0a6a6a, chosen by name); white text still reads at about 6 : 1
  OCEAN: "#0a6a6a",
  // a deep green (#047354, chosen by hex); white text reads at about 5.9 : 1
  EMERALD: "#047354",
  PURPLE: "oklch(0.3 0.11 300)",
  CHARCOAL: "oklch(0.27 0.012 260)",
};

/** The accent that goes well with a sidebar colour (a suggestion; any pair is allowed). */
export const SUGGESTED_ACCENT: Record<SidebarColor, AccentColor> = {
  LIGHT: "NAVY",
  NAVY: "BLUE",
  INDIGO: "INDIGO",
  TEAL: "TEAL",
  OCEAN: "TEAL",
  EMERALD: "TEAL",
  PURPLE: "VIOLET",
  CHARCOAL: "SLATE",
};

/** The accent as a swatch: its band colour (the colour by its name), and the colour of a mark on it. */
export const accentSwatch = (accent: AccentColor) => band(accent).color;
export const accentSwatchText = (accent: AccentColor) => band(accent).text;
/** The sidebar colour (for a swatch or a preview), and the colour of a mark on it. */
export const sidebarSwatch = (sidebar: SidebarColor) => SIDEBARS[sidebar];
export const sidebarSwatchText = (sidebar: SidebarColor) => (sidebar === "LIGHT" ? "oklch(0.32 0.04 262)" : WHITE);

/** A known accent, or null for anything else (an old or unknown value means the default). */
export const asAccent = (value: string | null | undefined): AccentColor | null =>
  value && (ACCENT_COLORS as readonly string[]).includes(value) ? (value as AccentColor) : null;
/** A known sidebar colour, or null for anything else (the default white). */
export const asSidebar = (value: string | null | undefined): SidebarColor | null =>
  value && (SIDEBAR_COLORS as readonly string[]).includes(value) ? (value as SidebarColor) : null;

export type SchoolColors = { accent: AccentColor | null; sidebar: SidebarColor | null };

/**
 * The CSS that gives the page a school's colours, or "" for the defaults. It comes after the
 * app's stylesheet, so it wins. The accent is in two rules: light mode on the page
 * (:root:not(.dark)) and dark mode (.dark, which also covers the always-dark sidebar). Buttons
 * keep their own near-white in dark mode, so --primary is only set for light mode. A dark sidebar
 * colour is the same in both: the school's dark colour, and its menu with white text (after
 * .school-menu and .dark .school-menu in globals.css, at the same weight, so it wins).
 */
export const schoolColorsCss = ({ accent, sidebar }: SchoolColors) => {
  let css = "";
  // no choice = the default accent (navy); blue is what globals.css already has
  const chosen = accent ?? DEFAULT_ACCENT;
  if (chosen !== "BLUE") {
    const { light, dark } = ACCENTS[chosen];
    const { color, text } = band(chosen);
    css +=
      `:root{--brand-band:${color};--brand-band-foreground:${text};--brand-ink:${light.ink}}` +
      `:root:not(.dark){--brand:${light.brand};--brand-soft:${light.soft};--primary:${light.ink};--navy:${light.ink};--navy-soft:${light.inkSoft}}` +
      `.dark{--brand:${dark.brand};--brand-soft:${dark.soft};--navy:${dark.ink};--navy-soft:${dark.inkSoft}}`;
  }
  if (sidebar && sidebar !== "LIGHT") {
    const color = SIDEBARS[sidebar];
    css +=
      `:root{--school-sidebar:${color}}` +
      `:root .school-menu{--sidebar:${color};--sidebar-foreground:oklch(0.95 0.01 250);--sidebar-accent:oklch(1 0 0 / 10%);--sidebar-accent-foreground:${WHITE};--sidebar-border:oklch(1 0 0 / 14%);--sidebar-ring:oklch(0.82 0.14 82)}`;
  }
  // older phone browsers get the same colours in rgb()
  return withRgbFallback(css);
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
