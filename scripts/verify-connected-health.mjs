// Production-PWA acceptance. Fresh synthetic contexts; writes use canonical UI only.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const browser = await chromium.launch({ headless: true, ...(process.env.BEYOND_BROWSER_EXECUTABLE ? { executablePath: process.env.BEYOND_BROWSER_EXECUTABLE } : {}) });
const root = fileURLToPath(new URL("../docs/screenshots/ultimate-foundation-001/", import.meta.url));
const url = process.env.BEYOND_ACCEPTANCE_URL ?? "http://127.0.0.1:5174/neo-beyond-lohnes/";
const results = [];
async function rows(page, name) {
  return page.evaluate((store) => new Promise((resolve, reject) => {
    const open = indexedDB.open("beyond"); open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result; const tx = db.transaction(store, "readonly"); const request = tx.objectStore(store).getAll();
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); tx.oncomplete = () => db.close();
    };
  }), name);
}
async function capture(page, name) {
  await page.evaluate(() => { for (const animation of document.getAnimations()) animation.finish(); });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Page overflow");
  await page.screenshot({ path: `${root}${name}.png` });
}
try {
  await mkdir(root, { recursive: true });
  for (const width of [320, 360, 412]) {
    const context = await browser.newContext({ viewport: { width, height: 800 }, timezoneId: "America/Chicago", isMobile: true, hasTouch: true, reducedMotion: "reduce" });
    const page = await context.newPage(); const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.clock.install({ time: new Date("2026-10-15T20:00:00-05:00") });
    await page.goto(url);
    await page.getByRole("button", { name: "START DAY", exact: true }).click();
    await page.getByRole("button", { name: "NO", exact: true }).click();
    await page.getByRole("button", { name: "ALL GOOD", exact: true }).click();
    await page.getByRole("button", { name: "Log water in DATA", exact: true }).click();
    await page.getByRole("button", { name: "+16 oz", exact: true }).click();
    await page.getByText("16 oz recorded today", { exact: true }).waitFor();
    await page.getByRole("button", { name: "RETURN TO TODAY", exact: true }).click();
    await page.getByRole("button", { name: "Log a meal in DATA", exact: true }).click();
    await page.getByRole("textbox", { name: "New meal name", exact: true }).fill("Synthetic work meal");
    for (const [field, value] of [["calories", "600"], ["protein (g)", "45"], ["carbs (g)", "60"], ["fat (g)", "15"]]) await page.getByRole("spinbutton", { name: `New meal ${field}`, exact: true }).fill(value);
    await page.getByRole("button", { name: "SAVE MEAL", exact: true }).click();
    await page.getByRole("button", { name: "LOG", exact: true }).click();
    await page.getByText("Synthetic work meal logged · 600 kcal · 45g", { exact: true }).waitFor();
    await page.getByRole("button", { name: "DATA", exact: true }).click();
    await page.getByRole("button", { name: "Open BODYWEIGHT", exact: true }).click();
    await page.getByRole("spinbutton", { name: "Weight (lbs)", exact: true }).fill("180");
    await page.getByRole("button", { name: "LOG BODYWEIGHT", exact: true }).click();
    await page.getByRole("button", { name: "Open SLEEP", exact: true }).click();
    await page.getByRole("spinbutton", { name: "Hours", exact: true }).fill("6");
    await page.getByRole("spinbutton", { name: "Minutes", exact: true }).fill("30");
    await page.getByRole("button", { name: "LOG SLEEP", exact: true }).click();
    await page.getByRole("button", { name: "DATA", exact: true }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await capture(page, `daily-${width}`);

    // Exercise the actual app rollover on resume; never insert day/event rows directly.
    await page.clock.setFixedTime(new Date("2026-10-16T20:00:00-05:00"));
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await page.waitForFunction(() => new Promise((resolve) => {
      const open = indexedDB.open("beyond"); open.onsuccess = () => { const db = open.result; const tx = db.transaction("beyondDays", "readonly"); const r = tx.objectStore("beyondDays").count(); r.onsuccess = () => resolve(r.result === 2); tx.oncomplete = () => db.close(); };
    }));
    await page.getByRole("button", { name: "Open SLEEP", exact: true }).click();
    await page.getByRole("spinbutton", { name: "Hours", exact: true }).fill("7");
    await page.getByRole("spinbutton", { name: "Minutes", exact: true }).fill("15");
    await page.getByText("Browse health days", { exact: true }).click();
    await page.getByRole("button", { name: "Inspect Thu, Oct 15, 2026", exact: true }).click();
    await page.getByRole("region", { name: "Selected health day" }).getByRole("button", { name: "Explore protein", exact: true }).filter({ hasText: "45 g" }).waitFor();
    await capture(page, `past-${width}`);
    const before = await rows(page, "events");
    await page.getByRole("region", { name: "Selected health day" }).getByRole("button", { name: "Explore water", exact: true }).click();
    await page.getByRole("combobox", { name: "EXPLORE A MEASURE", exact: true }).selectOption("water");
    await page.getByRole("button", { name: "7 DAYS", exact: true }).click();
    await page.getByRole("button", { name: "VIEW RECORDS", exact: true }).click();
    await page.getByRole("heading", { name: "Water · 16 oz", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "CORRECT IN DAILY RECORD", exact: true }).count(), 0);
    await capture(page, `sources-${width}`);
    const rootId = await page.locator("[data-source-root]").getAttribute("data-source-root");
    await page.getByRole("button", { name: "FULL HISTORY", exact: true }).click();
    await page.waitForFunction((id) => document.activeElement?.id === `history-event-${id}`, rootId);
    await page.getByRole("button", { name: "RETURN TO BODY", exact: true }).click();
    await page.getByRole("heading", { name: "Water · 16 oz", exact: true }).waitFor();
    await page.waitForFunction(() => document.activeElement?.textContent === "FULL HISTORY");
    await page.getByRole("button", { name: "BACK TO TREND", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "7 DAYS", exact: true }).getAttribute("aria-pressed"), "true");
    await capture(page, `trend-${width}`);
    await page.getByRole("button", { name: "DAILY RECORD", exact: true }).click();
    await page.getByRole("button", { name: "CURRENT DAY", exact: true }).click();
    assert.equal(await page.getByRole("spinbutton", { name: "Hours", exact: true }).inputValue(), "7");
    assert.equal(await page.getByRole("spinbutton", { name: "Minutes", exact: true }).inputValue(), "15");
    assert.deepEqual(await rows(page, "events"), before, "Browsing wrote events");
    await page.getByRole("button", { name: "LOG SLEEP", exact: true }).click();
    await page.getByRole("button", { name: "+8 oz", exact: true }).click();
    await page.getByRole("button", { name: "Inspect Water · 8 oz", exact: true }).click();
    await page.getByRole("spinbutton", { name: "Corrected amount (oz)", exact: true }).fill("12");
    await page.getByRole("button", { name: "SAVE", exact: true }).click();
    await page.getByRole("button", { name: "Explore water", exact: true }).click();
    await page.getByRole("button", { name: "VIEW RECORDS", exact: true }).click();
    await page.getByRole("heading", { name: "Water · 12 oz", exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: "CORRECT IN DAILY RECORD", exact: true }).count(), 1);

    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    // Prompt-mode workers need a subsequent navigation to control a first install.
    await page.reload();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await context.setOffline(true);
    await page.reload();
    await page.getByRole("button", { name: "DATA", exact: true }).click();
    await page.getByRole("button", { name: "Explore water", exact: true }).click();
    await page.getByRole("button", { name: "VIEW RECORDS", exact: true }).click();
    await page.getByRole("heading", { name: "Water · 12 oz", exact: true }).waitFor();
    await page.getByRole("button", { name: "FULL HISTORY", exact: true }).click();
    await page.getByRole("heading", { name: "MORE // HISTORY", exact: true }).waitFor();
    await page.getByRole("button", { name: "RETURN TO BODY", exact: true }).click();
    await page.getByRole("button", { name: "DAILY RECORD", exact: true }).click();
    await page.getByRole("button", { name: "+8 oz", exact: true }).click();
    await page.getByText("8 oz added.", { exact: true }).waitFor();
    const saved = await rows(page, "events");
    assert.equal(saved.filter((event) => event.type === "WATER_LOGGED").length, 3);
    assert.equal(saved.filter((event) => event.type === "WATER_LOG_CORRECTED").length, 1);
    assert.equal(saved.filter((event) => event.type === "SLEEP_LOGGED").length, 2);
    await page.reload();
    await page.getByRole("button", { name: "DATA", exact: true }).click();
    await page.getByRole("button", { name: "Explore water", exact: true }).filter({ hasText: "20 oz" }).waitFor();
    assert.deepEqual(await rows(page, "events"), saved, "Offline reload changed canonical records");
    assert.equal(await page.getByRole("main").count(), 1);
    assert.deepEqual(errors, []);
    results.push({ width, result: "PASS", checks: ["canonical UI saves", "lived-day selection", "source identity", "History focus/return", "range retention", "sleep draft", "no browsing writes", "correction chain", "offline exploration/History", "offline log and reload", "no overflow/page errors"] });
    await context.close();
  }
  await writeFile(`${root}acceptance.json`, JSON.stringify(results, null, 2) + "\n");
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
