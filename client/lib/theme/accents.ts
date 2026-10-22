/*
 * The accent colours a school may choose for its dashboard and public homepage. Each sets the
 * app's accent (--brand: tabs, table headers, badges, highlights) and its pale tint
 * (--brand-soft), in light and in dark mode. They are picked to stay readable on white and on
 * the dark canvas, and to never look like the status colours (green present / paid, red absent /
 * due, amber late). The navy sidebar and its gold highlights stay the same for every school.
 *
 * Same keys as ACCENT_COLORS in server/src/app/modules/schoolSettings: keep them in step.
 */

export const ACCENT_COLORS = ["BLUE", "INDIGO", "VIOLET", "MAROON", "TEAL", "SLATE"] as const;
export type AccentColor = (typeof ACCENT_COLORS)[number];

type Shade = { brand: string; soft: string };
const ACCENTS: Record<AccentColor, { light: Shade; dark: Shade }> = {
  // the platform's own (what globals.css has): a school without a choice looks like this
  BLUE: { light: { brand: "oklch(0.5 0.17 262)", soft: "oklch(0.952 0.022 262)" }, dark: { brand: "oklch(0.64 0.15 262)", soft: "oklch(0.29 0.05 262)" } },
  INDIGO: { light: { brand: "oklch(0.47 0.18 280)", soft: "oklch(0.952 0.026 280)" }, dark: { brand: "oklch(0.66 0.15 280)", soft: "oklch(0.29 0.06 280)" } },
  VIOLET: { light: { brand: "oklch(0.5 0.18 303)", soft: "oklch(0.955 0.026 303)" }, dark: { brand: "oklch(0.68 0.15 303)", soft: "oklch(0.3 0.06 303)" } },
  // darker and quieter than the red of "absent", so the two never meet
  MAROON: { light: { brand: "oklch(0.42 0.13 15)", soft: "oklch(0.955 0.02 15)" }, dark: { brand: "oklch(0.68 0.12 15)", soft: "oklch(0.29 0.05 15)" } },
  TEAL: { light: { brand: "oklch(0.5 0.09 195)", soft: "oklch(0.955 0.022 195)" }, dark: { brand: "oklch(0.72 0.1 195)", soft: "oklch(0.29 0.045 195)" } },
  SLATE: { light: { brand: "oklch(0.42 0.04 255)", soft: "oklch(0.955 0.008 255)" }, dark: { brand: "oklch(0.72 0.03 255)", soft: "oklch(0.28 0.015 255)" } },
};

/** The accent's main colour in light mode (for a swatch). */
export const accentSwatch = (accent: AccentColor) => ACCENTS[accent].light.brand;

/** A known accent, or null for anything else (an old or unknown value means the default). */
export const asAccent = (value: string | null | undefined): AccentColor | null =>
  value && (ACCENT_COLORS as readonly string[]).includes(value) ? (value as AccentColor) : null;

/**
 * The CSS that gives the page this accent, or "" for the default. It is placed after the app's
 * stylesheet, so it wins; the dark rule comes last so dark mode keeps its own shades.
 */
export const accentCss = (accent: AccentColor | null) => {
  if (!accent || accent === "BLUE") return "";
  const { light, dark } = ACCENTS[accent];
  return `:root{--brand:${light.brand};--brand-soft:${light.soft}}.dark{--brand:${dark.brand};--brand-soft:${dark.soft}}`;
};

// the <style> element carrying a school's accent (written by the school layout, replaced on a change)
export const ACCENT_STYLE_ID = "school-accent";

/** Puts this accent on the open page at once (after it is saved), without a reload. */
export const applyAccent = (accent: AccentColor | null) => {
  let style = document.getElementById(ACCENT_STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = ACCENT_STYLE_ID;
    document.head.append(style);
  }
  style.textContent = accentCss(accent);
};
