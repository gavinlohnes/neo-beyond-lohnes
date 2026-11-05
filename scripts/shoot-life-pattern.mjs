import { mkdir } from "node:fs/promises";
import { preview } from "vite";
import { chromium } from "playwright";

// LIFE-PATTERN-001: real 360 x 800 viewport captures (not full-page, which misplaces the fixed tab
// bar), top of the screen and then each further screen-height. Synthetic data only. Evidence only.
// Usage: node scripts/shoot-life-pattern.mjs <TAB> <outDir> [prefix] [button names to tap, in order]
const [tab = "TRAIN", out = "docs/screenshots/life-pattern-001", prefix = "before", ...taps] = process.argv.slice(2);
await mkdir(out, { recursive: true });
const server = await preview({ preview: { host: "127.0.0.1", port: 5194, strictPort: true } });
const browser = await chromium.launch(process.env.BEYOND_BROWSER_EXECUTABLE ? { executablePath: process.env.BEYOND_BROWSER_EXECUTABLE } : {});
const settle = (page) => page.evaluate(() => { for (const a of document.getAnimations()) { if (a.effect?.getComputedTiming().iterations === Infinity) a.pause(); else a.finish(); } });
try {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, timezoneId: "America/Chicago", reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.clock.install({ time: new Date("2026-11-05T17:10:00-06:00") });
  await page.goto("http://127.0.0.1:5194/neo-beyond-lohnes/");
  const start = page.getByRole("button", { name: "START DAY", exact: true });
  if (await start.isVisible({ timeout: 4000 }).catch(() => false)) await start.click();
  await page.waitForTimeout(400);
  await page.getByRole("navigation").getByRole("button", { name: tab, exact: true }).click();
  await page.waitForTimeout(500);
  for (const name of taps) { await page.getByText(name, { exact: true }).first().click(); await page.waitForTimeout(400); }
  await settle(page);
  const name = taps.length ? `${tab}-${taps.at(-1)}`.toLowerCase().replace(/[^a-z0-9]+/g, "-") : tab.toLowerCase();
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let n = 0, y = 0; y < height && n < 6; n++, y += 640) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "instant" }), y);
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${out}/${name}-${prefix}-${n + 1}.png`, scale: "css" });
  }
  console.log(`page height ${height}`);
  await context.close();
} finally { await browser.close(); server.httpServer.close(); }
