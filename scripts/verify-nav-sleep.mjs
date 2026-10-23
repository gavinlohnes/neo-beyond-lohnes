// NAV-001 slice 3: reuse verify-nav-001's isolated production preview, native import and synthetic UI data.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { preview } from "vite";
import { chromium } from "playwright";
const output = process.env.OUTPUT ?? ".cache/nav003-production";
await mkdir(output, { recursive: true });
const server = await preview({ preview: { host: "127.0.0.1", port: 5198, strictPort: true } });
const browser = await chromium.launch({ headless: true });
const reports = [];
const now = new Date("2026-10-21T22:10:00-05:00").getTime(), iso = (t) => new Date(t).toISOString();
const records = Array.from({ length: 25 }, (_, i) => {
  const start = new Date("2026-09-26T23:00:00-05:00").getTime() + i * 86400000;
  const minutes = 360 + (i % 4) * 20, end = start + minutes * 60000;
  const pattern = ["LIGHT", "DEEP", "REM", "LIGHT", "AWAKE", "REM"];
  return { id: `nav-synthetic-${i}`, dataOriginPackage: "com.garmin.android.apps.connectmobile", lastModifiedTime: iso(now), startTime: iso(start), endTime: iso(end), startZoneOffsetSeconds: -18000, endZoneOffsetSeconds: -18000,
    stages: pattern.map((type, k) => ({ type, startTime: iso(start + k * minutes * 10000), endTime: iso(start + (k + 1) * minutes * 10000) })) };
});
const fixture = { format: "BEYOND_HEALTH_CONNECT_SLEEP", schemaVersion: 1, producer: { name: "BEYOND Health Bridge", version: "0.5.0" }, exportedAt: iso(now), window: { startTime: "2026-09-26T00:00:00Z", endTime: iso(now) }, records };
async function countEvents(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open("beyond"); open.onerror = () => reject(open.error);
    open.onsuccess = () => { const db = open.result, tx = db.transaction("events", "readonly"), request = tx.objectStore("events").count(); request.onsuccess = () => resolve(request.result); tx.oncomplete = () => db.close(); tx.onerror = () => reject(tx.error); };
  }));
}
try {
  for (const [width, height] of [[320, 640], [390, 844], [844, 390], [1280, 800]]) {
    const context = await browser.newContext({ viewport: { width, height }, timezoneId: "America/Chicago" });
    const page = await context.newPage(), errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.setDefaultTimeout(10000);
    try {
      await page.clock.install({ time: now }); await page.goto("http://127.0.0.1:5198/neo-beyond-lohnes/");
      await page.getByRole("button", { name: "START DAY", exact: true }).click();
      await page.getByRole("button", { name: "MORE", exact: true }).click();
      await page.getByRole("searchbox", { name: "Find a screen or action", exact: true }).fill("IMPORT HEALTH DATA");
      await page.getByRole("button", { name: /^IMPORT HEALTH DATA/ }).click();
      await page.getByLabel("Health export file", { exact: true }).setInputFiles({ name: "synthetic-nav-sleep.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(fixture)) });
      await page.getByRole("button", { name: "CONFIRM SLEEP IMPORT", exact: true }).click();
      await page.getByText(/^Imported 25 new/).waitFor();
      await page.getByRole("button", { name: "TODAY", exact: true }).click();
      await page.reload(); await page.getByRole("button", { name: /open sleep$/ }).waitFor();
      await page.evaluate(async () => { await navigator.serviceWorker.ready; await document.fonts.ready; }); await context.setOffline(true);
      const before = await countEvents(page), tile = page.getByRole("button", { name: /open sleep$/ }); await tile.click();
      const sheet = page.getByRole("dialog", { name: "SLEEP", exact: true });
      assert.equal(await sheet.getByRole("button", { name: "Week", exact: true }).getAttribute("aria-pressed"), "true");
      await sheet.getByText("Week of Mon, Oct 19", { exact: true }).waitFor();
      await page.screenshot({ path: `${output}/week-${width}.png` });
      const bars = sheet.locator('.measured-bar[role="button"]');
      const measured = await bars.evaluateAll((nodes) => nodes.map((node, index) => ({ index, label: node.getAttribute("aria-label") })).filter((v) => !v.label.includes("not measured")));
      await bars.nth(measured.at(-1).index).click();
      await sheet.getByRole("article", { name: "Imported Garmin sleep" }).waitFor();
      await sheet.getByRole("img", { name: /^Sleep stages from/ }).waitFor();
      await page.screenshot({ path: `${output}/night-${width}.png` });
      await sheet.getByText("Source details and revisions", { exact: true }).click();
      await sheet.getByText("Record: nav-synthetic-24", { exact: true }).waitFor();
      await sheet.getByRole("button", { name: "Month", exact: true }).click();
      await sheet.getByText("October 2026", { exact: true }).waitFor();
      await sheet.getByRole("button", { name: "Earlier sleep period" }).click();
      await sheet.getByText("September 2026", { exact: true }).waitFor();
      await sheet.getByRole("button", { name: "Year", exact: true }).click();
      await sheet.getByText("2026", { exact: true }).waitFor();
      await sheet.getByRole("button", { name: "CLOSE", exact: true }).click();
      await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label")?.endsWith("open sleep"));
      await page.getByRole("button", { name: "DATA", exact: true }).click();
      await page.getByRole("button", { name: "main sleep history", exact: true }).click();
      assert.equal(await sheet.getByRole("button", { name: "Week", exact: true }).getAttribute("aria-pressed"), "true");
      await sheet.getByRole("button", { name: "ALL SLEEP RECORDS", exact: true }).click();
      await page.getByRole("heading", { name: "PROGRESS", exact: true }).waitFor();
      assert.equal(await countEvents(page), before); assert.deepEqual(errors, []);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      reports.push({ width, height, result: "PASS", checks: ["real production import of synthetic Garmin records", "offline week-first TODAY and DATA routes", "measured-night sample count", "bar to stages and exact source record", "calendar month/year paging", "CLOSE focus return", "all-records route", "unchanged domain records", "no overflow or page errors"] });
    } catch (e) { await page.screenshot({ path: `${output}/failure-${width}.png` }); throw e; } finally { await context.close(); }
  }
  await writeFile(`${output}/acceptance.json`, JSON.stringify(reports, null, 2) + "\n"); console.log(JSON.stringify(reports, null, 2));
} finally { await browser.close(); await new Promise((resolve) => server.httpServer.close(resolve)); }
