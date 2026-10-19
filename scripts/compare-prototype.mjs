// POLISH-002 fidelity harness: the app next to the approved prototype, same phone, same moment,
// same sample day. Seeds the prototype's numbers through the app's own commands (dev server), then
// screenshots each scene and writes side-by-side pairs to docs/screenshots/polish-002/.
//   node scripts/compare-prototype.mjs            (BEYOND_BROWSER_EXECUTABLE to pick a Chromium)
import { mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { createServer } from "vite";
import { chromium } from "playwright";

const out = "docs/screenshots/polish-002";
await mkdir(out, { recursive: true });
const sizes = (process.env.SIZES ?? "390x844,360x800").split(",").map((s) => s.split("x").map(Number));
const prototype = pathToFileURL(resolve("prototype/command-center/index.html")).href;
const server = await createServer({ server: { port: 5193, strictPort: true }, logLevel: "error" });
await server.listen();
const app = "http://localhost:5193/neo-beyond-lohnes/";
const browser = await chromium.launch({ headless: true, ...(process.env.BEYOND_BROWSER_EXECUTABLE ? { executablePath: process.env.BEYOND_BROWSER_EXECUTABLE } : {}) });

// The prototype's scenes: [file id, DEMO label, app clock (America/Chicago)].
const scenes = [
  ["prep", "Work day · 17:10", "2026-10-12T17:10:00-05:00"],
  ["shift", "Work day · 23:40", "2026-10-12T23:40:00-05:00"],
  ["recover", "Work day · 07:30", "2026-10-13T07:30:00-05:00"],
];

async function settle(page) {
  await page.evaluate(async () => { await document.fonts.ready; for (const a of document.getAnimations()) a.finish(); window.scrollTo(0, 0); });
  await page.waitForTimeout(300);
}

try {
  for (const [w, h] of sizes) {
    const options = { viewport: { width: w, height: h }, isMobile: true, hasTouch: true, reducedMotion: "reduce", timezoneId: "America/Chicago" };
    // Prototype.
    for (const [id, label] of scenes) {
      const context = await browser.newContext(options);
      const page = await context.newPage();
      await page.goto(prototype);
      await page.waitForTimeout(1200);
      await page.getByRole("button", { name: "DEMO" }).first().click();
      await page.locator(".opt", { hasText: label }).first().click();
      await settle(page);
      await page.screenshot({ path: `${out}/${w}-${id}-prototype.png` });
      await context.close();
    }
    // App, seeded once with the prototype's sample day.
    const context = await browser.newContext(options);
    const page = await context.newPage();
    await page.clock.install({ time: new Date(scenes[0][2]) });
    await page.goto(app);
    await page.evaluate(async () => {
      const c = await import("/neo-beyond-lohnes/src/application/commands.ts");
      const s = await import("/neo-beyond-lohnes/src/engine/scheduledContext.ts");
      const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = s.DEFAULT_SCHEDULE_PATTERN;
      await c.updateSchedulePattern(schedule);
      const day = await c.startDay();
      await c.setWorkContext(day.id, "WORK", "MANUAL");
      await c.logSleep(day.id, 410, "PRIMARY");
      await c.logProtein(day.id, 92);
      await c.logWater(day.id, 48);
      await c.logBodyweight(day.id, 196.4);
      await c.submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    });
    for (const [id, , at] of scenes) {
      await page.clock.setFixedTime(new Date(at));
      await page.reload();
      await page.waitForSelector(".cc-mode", { timeout: 15_000 });
      await settle(page);
      await page.screenshot({ path: `${out}/${w}-${id}-app.png` });
    }
    await context.close();
    for (const [id] of scenes)
      execFileSync("montage", [`${out}/${w}-${id}-prototype.png`, `${out}/${w}-${id}-app.png`, "-tile", "2x1", "-geometry", "+8+0", "-background", "#444", `${out}/${w}-${id}.png`]);
  }
} finally {
  await browser.close();
  await server.close();
}
