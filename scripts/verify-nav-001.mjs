// NAV-001: adapted from verify-polish-001's isolated production-preview/UI-fixture pattern.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { preview } from "vite";
import { chromium } from "playwright";
const output = process.env.OUTPUT ?? ".cache/nav001-production";
await mkdir(output, { recursive: true });
const server = await preview({ preview: { host: "127.0.0.1", port: 5197, strictPort: true } });
const browser = await chromium.launch({ headless: true });
const reports = [];
try {
  for (const [width, height] of [[320, 640], [390, 844], [844, 390], [1280, 800]]) {
    const context = await browser.newContext({ viewport: { width, height }, timezoneId: "America/Chicago" });
    const page = await context.newPage(), errors = []; page.setDefaultTimeout(10000);
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.clock.install({ time: new Date("2026-10-14T17:00:00-05:00") });
      await page.goto("http://127.0.0.1:5197/neo-beyond-lohnes/");
      await page.getByRole("button", { name: "START DAY", exact: true }).click();
      await page.getByRole("button", { name: "START DAY", exact: true }).waitFor({ state: "hidden" });
      const log = page.getByRole("button", { name: "Open LOG", exact: true });
      await log.waitFor();
      await page.evaluate(() => document.fonts.ready);
      const bounds = await log.boundingBox();
      const nav = await page.locator(".shell-nav").boundingBox();
      assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= nav.y);
      await page.screenshot({ path: `${output}/today-${width}.png`, fullPage: true });
      await log.click();
      const sheet = page.getByRole("dialog", { name: "LOG", exact: true });
      await sheet.getByRole("button", { name: "MEAL", exact: true }).click();
      const meal = page.getByRole("dialog", { name: "MEAL", exact: true });
      await meal.getByRole("button", { name: "NEW MEAL", exact: true }).waitFor();
      await page.screenshot({ path: `${output}/meal-${width}.png` });
      await meal.getByRole("button", { name: "NEW MEAL", exact: true }).click();
      await page.getByRole("textbox", { name: "New meal name", exact: true }).fill("SYNTHETIC NAV ACCEPTANCE");
      await page.getByRole("button", { name: "CLOSE", exact: true }).click();
      await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Open LOG");
      await page.getByRole("button", { name: "TRAIN", exact: true }).click();
      assert.equal(await log.isVisible(), false);
      await page.getByRole("button", { name: "TODAY", exact: true }).click();
      await log.click(); await page.getByRole("dialog", { name: "LOG", exact: true }).getByRole("button", { name: "MEAL", exact: true }).click();
      await page.getByRole("button", { name: /^NEW MEAL/ }).click();
      assert.equal(await page.getByRole("textbox", { name: "New meal name", exact: true }).inputValue(), "SYNTHETIC NAV ACCEPTANCE");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      reports.push({ width, height, result: "PASS", checks: ["production UI day setup", "floating LOG above navigation", "LOG to Meal to New Meal", "CLOSE returns focus to floating LOG", "hidden outside TODAY", "meal draft survives close and tab detour", "no overflow or uncaught errors"] });
    } catch (error) { await page.screenshot({ path: `${output}/failure-${width}.png` }); throw error; } finally { await context.close(); }
  }
  await writeFile(`${output}/acceptance.json`, JSON.stringify(reports, null, 2) + "\n");
  console.log(JSON.stringify(reports, null, 2));
} finally { await browser.close(); await new Promise((resolve) => server.httpServer.close(resolve)); }
