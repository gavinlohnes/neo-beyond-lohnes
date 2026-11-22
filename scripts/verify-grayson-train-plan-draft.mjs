import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { preview } from "vite";
const out = "docs/screenshots/grayson-train-plan-draft-001";
await mkdir(out, { recursive: true });
const server = await preview({ preview: { host: "127.0.0.1", port: 5198, strictPort: true } });
const browser = await chromium.launch({ headless: true, ...(process.env.BEYOND_BROWSER_EXECUTABLE ? { executablePath: process.env.BEYOND_BROWSER_EXECUTABLE } : {}) });
const results = [];
try {
  for (const width of [320, 360, 412]) {
    const context = await browser.newContext({ viewport: { width, height: 820 }, timezoneId: "America/Chicago", reducedMotion: "reduce", isMobile: true, hasTouch: true });
    const page = await context.newPage(); const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:5198/neo-beyond-lohnes/");
    await page.getByRole("button", { name: "TRAIN", exact: true }).click();
    await page.getByRole("button", { name: "DRAFT MY 3-DAY PLAN" }).click();
    await page.getByRole("button", { name: "CONTINUE" }).click();
    await page.getByRole("heading", { name: "Bench strength" }).waitFor();
    await page.screenshot({ path: `${out}/${width}-abc-draft.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    results.push({ width, overflow, errors }); await context.close();
  }
} finally { await browser.close(); server.httpServer.close(); }
await writeFile(`${out}/acceptance.json`, JSON.stringify(results, null, 2));
const failures = results.filter((result) => result.overflow || result.errors.length);
console.log(failures.length ? JSON.stringify(failures, null, 2) : "Plan draft: no overflow or page errors at 320/360/412 px.");
if (failures.length) process.exitCode = 1;
