/*
 * oklch() to rgb(), for phone browsers that can't read oklch (Chrome before 111, Samsung Internet
 * before 21, Safari before 15.4). The app's stylesheet gets its rgb copies at build time
 * (postcss.config.mjs); this does the same for the CSS a page writes while it runs (a school's
 * colours). The OKLab to sRGB steps are Björn Ottosson's.
 */

const toByte = (linear: number) => {
  const v = linear <= 0.0031308 ? 12.92 * linear : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, v)) * 255);
};

/** "oklch(0.285 0.11 263)" or "oklch(1 0 0 / 10%)" as an rgb()/rgba() colour; anything else as it is. */
export const oklchToRgb = (color: string) => {
  const m = color.match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*([\d.]+)(%?))?\s*\)$/i);
  if (!m) return color;
  const L = Number(m[1]) / (m[2] ? 100 : 1);
  const C = Number(m[3]);
  const h = (Number(m[4]) * Math.PI) / 180;
  const alpha = m[5] === undefined ? 1 : Number(m[5]) / (m[6] ? 100 : 1);

  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const r = toByte(4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s);
  const g = toByte(-1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s);
  const bl = toByte(-0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s);
  return alpha < 1 ? `rgba(${r}, ${g}, ${bl}, ${alpha})` : `rgb(${r}, ${g}, ${bl})`;
};

/** Every oklch() in a piece of CSS turned to rgb(). */
export const cssWithRgb = (css: string) => css.replace(/oklch\([^)]*\)/gi, oklchToRgb);

/**
 * CSS that works everywhere: the rgb() version first, then the oklch() original for the
 * browsers that can read it (it comes later, so it wins there).
 */
export const withRgbFallback = (css: string) =>
  css ? `${cssWithRgb(css)}@supports (color: oklch(0 0 0)){${css}}` : css;
