// Renders the app's PNG icons from one design: the launcher icons for Android 7.0–7.1 (newer
// Android uses the adaptive vector icon in res/), the Play Store icon and feature graphic.
// Run from the repo root: node mobile/store/make-icons.mjs   (uses the server's sharp)
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const sharp = createRequire(join(here, "../../server/package.json"))("sharp");

const BLUE = "#285CC2"; // the platform's own accent (client/lib/theme/accents.ts, BLUE)
// Material "school" icon (Apache 2.0), on a 24 x 24 grid
const CAP = "M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z";

/* A square icon: the cap in white, `scale` of the width, on blue (rounded for a launcher). */
const icon = (size, { rounded }) => {
  const glyph = size * 0.62;
  const offset = (size - glyph) / 2;
  const radius = rounded ? size * 0.22 : 0;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" rx="${radius}" fill="${BLUE}"/>
    <g transform="translate(${offset} ${offset}) scale(${glyph / 24})"><path d="${CAP}" fill="#fff"/></g>
  </svg>`);
};

const res = join(here, "../android/app/src/main/res");
const launcher = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [density, size] of Object.entries(launcher)) {
  const dir = join(res, `mipmap-${density}`);
  mkdirSync(dir, { recursive: true });
  await sharp(icon(size, { rounded: true })).png().toFile(join(dir, "ic_launcher.png"));
}

// Play Store: a 512 x 512 icon (Play rounds it itself) and a 1024 x 500 feature graphic
await sharp(icon(512, { rounded: false })).png().toFile(join(here, "play-icon-512.png"));
const capSize = 300;
await sharp(
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500">
    <rect width="1024" height="500" fill="${BLUE}"/>
    <g transform="translate(${(1024 - capSize) / 2} ${(500 - capSize) / 2}) scale(${capSize / 24})"><path d="${CAP}" fill="#fff"/></g>
  </svg>`),
)
  .png()
  .toFile(join(here, "play-feature-graphic.png"));

console.log("icons written");
