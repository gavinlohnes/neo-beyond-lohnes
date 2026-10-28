// BRAND-MARK-003 (Brand Drop v2): renders the installed-app icons from docs/brand/beyond-emblem/ with the
// repo's own Playwright Chromium. The SVGs are the source; these PNGs are derived. Run: node scripts/render-brand-icons.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const dir = "docs/brand/beyond-emblem";
const appIcon = readFileSync(`${dir}/beyond-app-icon.svg`, "utf8");
const plate = readFileSync(`${dir}/beyond-plate.svg`, "utf8");
const mono = readFileSync(`${dir}/beyond-mono.svg`, "utf8");
const outputs = [
  // Home screen: full-bleed yellow; the OS masks the shape.
  ["public/icons/beyond-v3-192-maskable.png", appIcon, 192],
  ["public/icons/beyond-v3-512-maskable.png", appIcon, 512],
  // Everywhere else: the chamfered plate (its cut corner stays transparent).
  ["public/icons/beyond-v3-192.png", plate, 192],
  ["public/icons/beyond-v3-512.png", plate, 512],
  ["public/icons/beyond-v3-apple-180.png", plate, 180],
  ["public/icons/beyond-v3-32.png", plate, 32],
  // Android themed icons: one-color silhouette on transparent.
  ["public/icons/beyond-v3-512-monochrome.png", mono, 512],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, svg, size] of outputs) {
  await page.setViewportSize({ width: size, height: size });
  const sized = svg.replace("<svg ", `<svg width="${size}" height="${size}" `);
  await page.setContent(`<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${sized}`);
  writeFileSync(file, await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } }));
  console.log(`wrote ${file}`);
}
await browser.close();
writeFileSync("public/icons/beyond-v3-favicon.svg", plate);
console.log("wrote public/icons/beyond-v3-favicon.svg");
