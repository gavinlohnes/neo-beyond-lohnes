// Built-PWA acceptance; fresh synthetic contexts, canonical UI writes only.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ headless: true, ...(process.env.BEYOND_BROWSER_EXECUTABLE ? { executablePath: process.env.BEYOND_BROWSER_EXECUTABLE } : {}) });
const base = process.env.BEYOND_ACCEPTANCE_URL ?? "http://127.0.0.1:5174/neo-beyond-lohnes/";
const output = process.env.BEYOND_SCREENSHOTS ?? "/tmp/beyond-review-hub";
await mkdir(output, { recursive: true });
const reports = [];
try {
  for (const width of [320, 360, 412]) {
    const context = await browser.newContext({ viewport: { width, height: 800 }, timezoneId: "America/Chicago", reducedMotion: "reduce" });
    const page = await context.newPage(); const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.clock.install({ time: new Date("2026-10-08T20:00:00-05:00") });
    await page.goto(base);
    await page.getByRole("button", { name: "START DAY", exact: true }).click();
    await page.getByRole("button", { name: "NO", exact: true }).click();
    await page.getByRole("button", { name: "ALL GOOD", exact: true }).click();
    await page.getByRole("button", { name: "BODY", exact: true }).click();
    await page.getByRole("button", { name: "Open BODYWEIGHT", exact: true }).click();
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Weight (lbs)" || document.activeElement?.id === "bodyweight-lbs");
    await page.getByRole("spinbutton", { name: "Weight (lbs)", exact: true }).fill("182");
    await page.getByRole("button", { name: "LOG BODYWEIGHT", exact: true }).click();
    await page.getByText("182 lbs", { exact: true }).first().waitFor();
    // Reload at a later instant exercises actual canonical rollover and the built service worker.
    await page.clock.setFixedTime(new Date("2026-10-20T20:00:00-05:00"));
    await page.reload();
    await page.getByRole("button", { name: "COMMAND", exact: true }).click();
    await page.getByRole("button", { name: "Open REVIEW", exact: true }).click();
    await page.getByText("Building up · needs 7 weighed days in the last 14, with 3 in each week", { exact: true }).waitFor();
    await page.screenshot({ path: `${output}/home-${width}.png`, fullPage: false });
    await page.getByText("Is my weight going down?", { exact: true }).click();
    await page.getByText("Every record in this range", { exact: true }).first().click();
    await page.getByRole("button", { name: "Open source day Oct 8, segment 1", exact: true }).click();
    await page.getByText("COMMAND // HISTORY", { exact: true }).waitFor();
    await page.getByRole("button", { name: "RETURN TO REVIEW", exact: true }).click();
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Open source day Oct 8, segment 1");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${output}/review-${width}.png`, fullPage: true });
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await context.setOffline(true); await page.reload();
    await page.getByRole("button", { name: "COMMAND", exact: true }).click();
    await page.getByRole("button", { name: "Open REVIEW", exact: true }).click();
    await page.getByText("Is my weight going down?", { exact: true }).click();
    await page.getByText("Every record in this range", { exact: true }).first().click();
    await page.getByRole("button", { name: "Open source day Oct 8, segment 1", exact: true }).click();
    await page.getByText("COMMAND // HISTORY", { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    reports.push({ width, result: "PASS", checks: ["canonical weight save", "rollover", "sparse abstention", "source History and focus return", "no overflow/page errors", "offline cold reload and History"] });
    await context.close();
  }
  console.log(JSON.stringify(reports, null, 2));
} finally { await browser.close(); }
