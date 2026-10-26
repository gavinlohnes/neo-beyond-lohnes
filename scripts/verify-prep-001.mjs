// Adapted from verify-nav-001: real built PWA, isolated contexts and UI-created synthetic data.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { preview } from "vite";
import { chromium } from "playwright";
const output = process.env.OUTPUT ?? ".cache/prep001-production"; await mkdir(output, { recursive: true });
const server = await preview({ preview: { host: "127.0.0.1", port: 5199, strictPort: true } });
const browser = await chromium.launch({ headless: true }), results = [];
async function facts(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open("beyond"); open.onerror = () => reject(open.error);
    open.onsuccess = () => { const db = open.result, tx = db.transaction("events", "readonly"), request = tx.objectStore("events").getAll(); request.onsuccess = () => resolve(request.result); tx.oncomplete = () => db.close(); tx.onerror = () => reject(tx.error); };
  }));
}
try {
  for (const [width, height] of [[320, 640], [390, 844], [844, 390], [1280, 800]]) {
    const context = await browser.newContext({ viewport: { width, height }, timezoneId: "America/Chicago" });
    const page = await context.newPage(), errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.setDefaultTimeout(10000);
    try {
      await page.clock.install({ time: new Date("2026-10-26T17:00:00-05:00") }); await page.goto("http://127.0.0.1:5199/neo-beyond-lohnes/");
      await page.getByRole("button", { name: "MORE", exact: true }).click();
      await page.getByRole("searchbox", { name: "Find a screen or action", exact: true }).fill("WORK SCHEDULE");
      await page.getByRole("button", { name: /^WORK SCHEDULE/ }).click();
      await page.getByRole("button", { name: "SAVE SCHEDULE", exact: true }).click();
      await page.getByRole("button", { name: "TODAY", exact: true }).click();
      await page.getByRole("button", { name: "START DAY", exact: true }).click();
      const food = page.getByRole("button", { name: "FOOD READY", exact: true }); await food.waitFor();
      await page.evaluate(async () => { await navigator.serviceWorker.ready; await document.fonts.ready; }); await context.setOffline(true);
      const before = await facts(page), ids = new Set(before.map((e) => e.id));
      await food.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${output}/before-${width}.png`, fullPage: true });
      await food.click(); await page.getByRole("button", { name: "BOTTLE FILLED", exact: true }).click();
      await page.getByText("Preparation: no action required.", { exact: true }).waitFor();
      await page.screenshot({ path: `${output}/ready-${width}.png`, fullPage: true });
      await page.getByRole("button", { name: "CHANGE PREPARATION", exact: true }).click();
      let sheet = page.getByRole("dialog", { name: "PREPARATION", exact: true });
      await sheet.getByRole("button", { name: "Frozen backup packed", exact: true }).click();
      await page.screenshot({ path: `${output}/options-${width}.png` });
      await sheet.getByRole("button", { name: "CLOSE", exact: true }).click();
      await page.waitForFunction(() => document.activeElement?.textContent === "CHANGE PREPARATION");
      const added = (await facts(page)).filter((e) => !ids.has(e.id));
      assert.equal(added.length, 3); assert.ok(added.every((e) => e.type === "PREPARATION_RECORDED"));
      await page.clock.setFixedTime(new Date("2026-10-27T03:00:00-05:00")); await page.reload();
      await page.getByRole("button", { name: "PREPARE FOR WORK", exact: true }).click();
      sheet = page.getByRole("dialog", { name: "PREPARATION", exact: true });
      assert.equal(await sheet.getByRole("button", { name: "Frozen backup packed", exact: true }).getAttribute("aria-pressed"), "true");
      assert.equal(await sheet.getByRole("button", { name: "BOTTLE FILLED", exact: true }).getAttribute("aria-pressed"), "true");
      await sheet.getByRole("button", { name: "CLOSE", exact: true }).click();
      await page.getByRole("button", { name: "MORE", exact: true }).click();
      const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Back up my data", exact: true }).click()]);
      await page.getByText("Backup & recovery", { exact: true }).click(); await page.getByText("RESTORE — REPLACES ALL DATA", { exact: true }).click();
      await page.getByLabel("Choose a backup file to restore", { exact: true }).setInputFiles(await download.path());
      await page.getByRole("button", { name: "CONFIRM REPLACE", exact: true }).waitFor();
      await page.getByRole("button", { name: "CANCEL", exact: true }).click();
      assert.equal((await facts(page)).filter((e) => e.type === "PREPARATION_RECORDED").length, 3);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); assert.deepEqual(errors, []);
      results.push({ width, height, result: "PASS", checks: ["UI-saved overnight schedule and real day", "offline one-tap food/bottle", "completed preparation quiet state", "frozen alternative and exact existing records", "only preparation events, no consumption", "CLOSE focus return", "offline reload after midnight retains both facts", "real native backup download accepted by restore preview", "no overflow/page errors"] });
    } catch (e) { await page.screenshot({ path: `${output}/failure-${width}.png` }); throw e; } finally { await context.close(); }
  }
  await writeFile(`${output}/acceptance.json`, JSON.stringify(results, null, 2) + "\n"); console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); await new Promise((resolve) => server.httpServer.close(resolve)); }
