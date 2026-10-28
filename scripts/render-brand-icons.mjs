// BRAND-MARK-002: renders the installed-app icons from docs/brand/suit-mark/ with the repo's own
// Playwright Chromium. The SVGs are the source; these PNGs are derived. Run: node scripts/render-brand-icons.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const dir = "docs/brand/suit-mark";
const appIcon = readFileSync(`${dir}/beyond-app-icon.svg`, "utf8");
const markIcon = readFileSync(`${dir}/beyond-mark-icon.svg`, "utf8");
// The app icon is full-bleed black: the OS masks it, and the mark sits inside the maskable safe zone,
// so one render serves "any" and "maskable".
const outputs = [
  ["public/icons/beyond-v2-192.png", appIcon, 192, 192],
  ["public/icons/beyond-v2-512.png", appIcon, 512, 512],
  ["public/icons/beyond-v2-512-maskable.png", appIcon, 512, 512],
  ["public/icons/beyond-v2-apple-180.png", appIcon, 180, 180],
  // Favicon: the icon mark on transparent, centered in a square.
  ["public/icons/beyond-v2-32.png", markIcon, 32, 32],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, svg, width, height] of outputs) {
  await page.setViewportSize({ width, height });
  const sized = svg.replace("<svg ", `<svg width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" `);
  await page.setContent(`<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block}</style>${sized}`);
  writeFileSync(file, await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width, height } }));
  console.log(`wrote ${file}`);
}
await browser.close();
writeFileSync("public/icons/beyond-v2-favicon.svg", markIcon);
console.log("wrote public/icons/beyond-v2-favicon.svg");
