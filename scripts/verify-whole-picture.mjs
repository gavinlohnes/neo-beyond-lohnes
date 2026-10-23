// WHOLE-PICTURE-001: real production PWA, isolated synthetic backup, canonical restore + real UI.
import { preview } from "vite";
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const output = process.env.BEYOND_SCREENSHOTS ?? `${process.cwd()}/.cache/whole-picture-production`;
const backup = process.env.BEYOND_ACCEPTANCE_BACKUP ?? `${process.cwd()}/.cache/whole-picture-acceptance-backup.json`;
await mkdir(output, { recursive: true });
const server = await preview({ preview: { host: "127.0.0.1", port: 5196, strictPort: true } });
const browser = await chromium.launch({ headless: true });
const reports = [];
async function review(page) {
  await page.getByRole("button", { name: "COMMAND", exact: true }).click();
  const search = page.getByRole("searchbox", { name: "Find a screen or action", exact: true });
  if (!(await search.isVisible())) await page.getByRole("button", { name: "BACK TO COMMAND", exact: true }).click();
  await search.fill("review"); await page.getByRole("button", { name: /^REVIEW / }).click();
  try { await page.getByRole("heading", { name: "THE WHOLE PICTURE.", exact: true }).waitFor(); } catch (error) { console.log(await page.locator("body").innerText()); await page.screenshot({path: `${output}/failure.png`}); throw error; }
}
async function count(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open("beyond"); open.onerror = () => reject(open.error);
    open.onsuccess = () => { const db = open.result, tx = db.transaction("events", "readonly"), request = tx.objectStore("events").count(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); tx.oncomplete = () => db.close(); };
  }));
}
try {
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 1000 }, timezoneId: "America/Chicago", reducedMotion: "reduce", acceptDownloads: true });
    const page = await context.newPage(), errors = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.clock.install({ time: new Date("2026-10-20T20:00:00-05:00") });
    await page.goto("http://127.0.0.1:5196/neo-beyond-lohnes/");
    await page.getByRole("button", { name: "COMMAND", exact: true }).click();
    await page.getByText("Backup & recovery", { exact: true }).click();
    await page.getByText("RESTORE — REPLACES ALL DATA", { exact: true }).click();
    await page.getByLabel("Choose a backup file to restore", { exact: true }).setInputFiles(backup);
    await Promise.all([page.waitForEvent("load"), page.getByRole("button", { name: "CONFIRM REPLACE", exact: true }).click()]);
    await review(page);
    const before = await count(page);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Overview overflow");
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${output}/overview-${width}.png`, fullPage: true });
    await page.screenshot({ path: `${output}/first-screen-${width}.png`, fullPage: false });
    await page.getByRole("tab", { name: "Compare", exact: true }).click();
    await page.screenshot({ path: `${output}/compare-${width}.png`, fullPage: true });
    const sleepButton = page.locator(".whole-picture .comparison-row").filter({ hasText: "Main sleep / average" }).getByRole("button").first();
    await sleepButton.click(); await page.getByRole("dialog").waitFor();
    await page.getByRole("button", { name: /source records$/ }).first().click();
    await page.getByRole("heading", { name: /Main sleep ·/ }).first().waitFor();
    await page.screenshot({ path: `${output}/evidence-${width}.png` });
    await page.getByRole("button", { name: "Open complete source day 1", exact: true }).click();
    await page.getByText("COMMAND // HISTORY", { exact: true }).waitFor();
    await page.getByRole("button", { name: "BACK TO REVIEW", exact: true }).click();
    await page.getByRole("tab", { name: "Compare", exact: true }).waitFor();
    assert.equal(await count(page), before, "Read-only exploration wrote events");
    await page.getByRole("tab", { name: "The picture", exact: true }).click();
    await page.getByRole("button", { name: "Lessons", exact: true }).click();
    await page.locator(".whole-picture .story").first().click(); await page.getByRole("heading", { name: "What I expected", exact: true }).waitFor();
    await page.screenshot({ path: `${output}/lesson-${width}.png` });
    await page.getByRole("button", { name: "CLOSE", exact: true }).click();
    await page.getByRole("tab", { name: "Your next move", exact: true }).click();
    await page.getByRole("textbox", { name: "What would this look like in your life?", exact: true }).fill("SYNTHETIC ACCEPTANCE · Leave space after the last shift.");
    await page.getByRole("button", { name: "BODY", exact: true }).click(); await review(page);
    await page.getByRole("tab", { name: "Your next move", exact: true }).click();
    assert.equal(await page.getByRole("textbox", { name: "What would this look like in your life?", exact: true }).inputValue(), "SYNTHETIC ACCEPTANCE · Leave space after the last shift.");
    await page.getByRole("button", { name: "Keep Week Ahead suggestions", exact: true }).click();
    assert.equal(await count(page), before, "Tentative preview wrote a plan");
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await context.setOffline(true);
    await page.getByRole("button", { name: "Save weekly review & focus", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Weekly review and focus saved on this device" }).waitFor();
    assert.equal(await count(page), before + 1, "Expected only the canonical review revision");
    await page.screenshot({ path: `${output}/focus-${width}.png`, fullPage: true });
    await page.reload(); await review(page); await page.getByRole("tab", { name: "Your next move", exact: true }).click();
    await page.getByText(/Current saved focus:.*SYNTHETIC ACCEPTANCE/).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Focus overflow");
    assert.deepEqual(errors, []);
    reports.push({ width, result: "PASS", checks: ["canonical backup restore of synthetic command-built records", "overview + comparisons", "claim to contributing source records to History and back", "no exploration writes", "real reviewed lesson", "draft primary-tab detour", "forecast does not write", "offline canonical focus save", "offline cold reload", "no overflow or page errors"] });
    await context.close();
  }
  await writeFile(`${output}/acceptance.json`, JSON.stringify(reports, null, 2)); console.log(JSON.stringify(reports, null, 2));
} finally { await browser.close(); await new Promise((resolve) => server.httpServer.close(resolve)); }
