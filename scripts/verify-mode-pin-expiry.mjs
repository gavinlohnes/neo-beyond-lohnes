import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium } from "playwright";

// Synthetic UI-only setup; IndexedDB is read only here to verify canonical integrity.
const baseURL = process.env.BEYOND_ACCEPTANCE_URL ?? "http://127.0.0.1:5176/neo-beyond-lohnes/";
const browser = await chromium.launch({ headless: true, ...(process.env.BEYOND_BROWSER_EXECUTABLE ? { executablePath: process.env.BEYOND_BROWSER_EXECUTABLE } : {}) });
async function records(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open("beyond"); open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const database = open.result;
      const names = [...database.objectStoreNames];
      const transaction = database.transaction(names, "readonly");
      const result = {};
      for (const name of names) {
        const request = transaction.objectStore(name).getAll();
        request.onsuccess = () => { result[name] = request.result; };
      }
      transaction.oncomplete = () => { database.close(); resolve(result); };
      transaction.onerror = () => { database.close(); reject(transaction.error); };
    };
  }));
}
async function pin(page, name) {
  await page.getByRole("button", { name: /^Mode .*Change mode$/ }).click();
  await page.getByRole("dialog").getByRole("button", { name: new RegExp(`^${name}`) }).click();
}
async function waitSuit(page, mode) {
  await page.waitForFunction((value) => document.documentElement.dataset.suitMode === value, mode);
}
const results = [];
try {
  for (const width of [320, 360, 412]) {
    const context = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true, timezoneId: "America/Chicago", reducedMotion: "reduce" });
    const page = await context.newPage(); page.setDefaultTimeout(15_000);
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.clock.install({ time: new Date("2026-10-12T22:00:00-05:00") });
      await page.goto(baseURL);
      await page.getByRole("button", { name: "START DAY", exact: true }).click();
      await page.getByRole("button", { name: "ALL GOOD", exact: true }).click();
      await page.getByRole("button", { name: "YES", exact: true }).click();
      await waitSuit(page, "SCHEDULED_SHIFT");
      await page.getByRole("button", { name: "TRAIN", exact: true }).click();
      await page.getByRole("button", { name: "START WORKOUT", exact: true }).click();
      await page.getByRole("spinbutton", { name: "Set 1 weight in pounds" }).fill("85");
      await page.getByRole("spinbutton", { name: "Set 1 repetitions" }).fill("9");
      await page.getByRole("button", { name: "TODAY", exact: true }).click();
      await pin(page, "OFF DUTY"); await waitSuit(page, "OFF");
      await page.getByRole("button", { name: "Open LOG", exact: true }).click();
      await page.getByRole("dialog", { name: "LOG" }).getByRole("button", { name: /^Note/ }).click();
      const capture = page.getByRole("textbox", { name: "Capture a thought", exact: true });
      await capture.fill("A synthetic thought retained across 16:30");
      await page.clock.setSystemTime(new Date("2026-10-13T16:29:59.500-05:00"));
      await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
      await waitSuit(page, "OFF");
      await capture.focus();
      const before = await records(page);
      const day = before.beyondDays.find((entry) => entry.status === "ACTIVE");
      const workout = before.workoutSessions.find((entry) => entry.status === "ACTIVE");
      assert.ok(day && workout, "Synthetic active day and workout");
      await page.clock.fastForward(1_000);
      await waitSuit(page, "EXPECTED_POST_WORK");
      assert.equal(await page.locator(".mode-header__source").textContent(), "Per schedule");
      assert.equal(await capture.inputValue(), "A synthetic thought retained across 16:30");
      assert.equal(await capture.evaluate((element) => document.activeElement === element), true, "Capture focus");
      assert.deepEqual(await records(page), before, "Expiry changed canonical records");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal(await page.getByRole("main").count(), 1);
      await page.getByRole("button", { name: "CAPTURE", exact: true }).click();
      await page.getByText("Note saved in Capture. It is also searchable in MORE.", { exact: true }).waitFor();
      await page.getByRole("button", { name: "DONE", exact: true }).click();
      await page.getByRole("button", { name: "TRAIN", exact: true }).click();
      assert.equal(await page.getByRole("spinbutton", { name: "Set 1 weight in pounds" }).inputValue(), "85");
      assert.equal(await page.getByRole("spinbutton", { name: "Set 1 repetitions" }).inputValue(), "9");
      await page.getByRole("button", { name: "LOG", exact: true }).first().click();
      await page.waitForFunction(() => !document.querySelector('button[aria-busy="true"]'));
      // Explicitly await the canonical row, not merely the asynchronous button click.
      await page.waitForFunction(() => new Promise((resolve) => {
        const request = indexedDB.open("beyond"); request.onsuccess = () => {
          const database = request.result; const tx = database.transaction("performedSets", "readonly");
          const count = tx.objectStore("performedSets").count(); count.onsuccess = () => resolve(count.result === 1); tx.oncomplete = () => database.close();
        };
      }));
      await page.clock.setSystemTime(new Date("2026-10-13T16:31:00-05:00"));
      await page.getByRole("button", { name: "TODAY", exact: true }).click();
      await pin(page, "PREP"); await waitSuit(page, "PRE_WORK");
      await page.evaluate(async () => { await navigator.serviceWorker.ready; });
      await page.reload(); await page.getByRole("button", { name: "TRAIN", exact: true }).waitFor();
      await context.setOffline(true);
      await page.clock.setSystemTime(new Date("2026-10-14T16:29:59.500-05:00"));
      await page.goto(`${baseURL}?go=water`);
      await page.getByRole("heading", { name: "DATA // WATER" }).waitFor();
      assert.equal(await page.locator("#workspace-TODAY").count(), 0);
      assert.equal(await page.evaluate(() => !!navigator.serviceWorker.controller && !navigator.onLine), true);
      await waitSuit(page, "PRE_WORK");
      const beforeOfflineExpiry = await records(page);
      await page.clock.fastForward(1_000);
      await waitSuit(page, "EXPECTED_POST_WORK");
      assert.equal(await page.locator("#workspace-TODAY").count(), 0);
      assert.deepEqual(await records(page), beforeOfflineExpiry, "Direct offline expiry changed canonical records");
      await page.getByRole("button", { name: "+8 oz", exact: true }).click();
      await page.getByText("8 oz added.", { exact: true }).waitFor();
      await page.reload();
      await page.getByRole("button", { name: "TODAY", exact: true }).click();
      await page.getByRole("button", { name: "Log water in DATA", exact: true }).click();
      await page.getByText("8 oz recorded today", { exact: true }).waitFor();
      const saved = await records(page);
      assert.equal(saved.beyondDays.find((entry) => entry.status === "ACTIVE")?.id, day.id);
      assert.equal(saved.workoutSessions.find((entry) => entry.status === "ACTIVE")?.id, workout.id);
      assert.equal(saved.performedSets.length, 1); assert.equal(saved.captureItems.length, 1);
      assert.equal(saved.events.filter((event) => event.type === "WATER_LOGGED").length, 1);
      assert.deepEqual(errors, []);
      results.push({ width, passed: true, retainedDay: true, draftAndFocusPreserved: true, canonicalExpiryWrites: 0, directOfflineExpiry: true, coldReload: true, exactlyOnce: true, pageErrors: errors });
      console.log(`PASS ${width}px: boundary, drafts/focus, direct offline expiry, cold reload, exactly-once records`);
    } catch (error) {
      await page.screenshot({ path: `/tmp/mode-pin-expiry-failure-${width}.png` });
      throw error;
    } finally { await context.close(); }
  }
  await writeFile(process.env.BEYOND_ACCEPTANCE_RESULT ?? "/tmp/beyond-mode-pin-expiry-acceptance.json", `${JSON.stringify(results, null, 2)}\n`);
} finally { await browser.close(); }
