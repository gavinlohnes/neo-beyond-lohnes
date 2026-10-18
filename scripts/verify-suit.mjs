import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

// SUIT-001 built-PWA acceptance: SYSTEMS, signals and stealth, synthetic records only.
// IndexedDB is read here only to verify canonical integrity.
const baseURL = process.env.BEYOND_ACCEPTANCE_URL ?? "http://127.0.0.1:5176/neo-beyond-lohnes/";
const shots = process.env.BEYOND_SCREENSHOT_DIR ?? "docs/screenshots/suit-001";
const browser = await chromium.launch({ headless: true, ...(process.env.BEYOND_BROWSER_EXECUTABLE ? { executablePath: process.env.BEYOND_BROWSER_EXECUTABLE } : {}) });
await mkdir(shots, { recursive: true });

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
const count = (data, type) => data.events.filter((event) => event.type === type).length;
async function longPress(page, locator, ms = 700) {
  const box = await locator.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}
const noOverflow = (page, width) => page.evaluate((w) => document.documentElement.scrollWidth <= w, width);

const results = [];
try {
  for (const width of [320, 360, 412]) {
    const context = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true, timezoneId: "America/Chicago", reducedMotion: "reduce" });
    const page = await context.newPage(); page.setDefaultTimeout(15_000);
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.clock.install({ time: new Date("2026-10-16T20:00:00-05:00") });
      await page.goto(baseURL);
      await page.getByRole("button", { name: "START DAY", exact: true }).click();
      await page.getByRole("button", { name: "ALL GOOD", exact: true }).click();
      await page.getByRole("button", { name: "NO", exact: true }).click();
      const line = page.getByRole("button", { name: /^Systems: .*Open readout$/ });
      await line.waitFor();
      assert.ok((await line.boundingBox()).height >= 44, "SYSTEMS line under 44 px");
      assert.ok(await noOverflow(page, width), "TODAY overflows");
      await page.screenshot({ path: `${shots}/today-systems-${width}.png` });

      // SYSTEMS readout, then back to the same line.
      const before = await records(page);
      await line.click();
      await page.getByRole("heading", { name: "COMMAND // SYSTEMS", exact: true }).waitFor();
      for (const group of ["BODY", "TRAINING", "STATE", "DEVICE"]) await page.getByRole("heading", { name: group, exact: true }).waitFor();
      assert.ok(await noOverflow(page, width), "SYSTEMS overflows");
      await page.screenshot({ path: `${shots}/systems-readout-${width}.png`, fullPage: true });
      await page.getByRole("button", { name: "RETURN TO TODAY", exact: true }).click();
      await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label")?.startsWith("Systems: "));
      assert.deepEqual(await records(page), before, "SYSTEMS wrote records");

      // Offline signal, words always; logging still saves.
      await context.setOffline(true);
      await page.locator("#workspace-TODAY").getByText("Offline. Logging still saves on this phone.", { exact: true }).waitFor();
      await page.screenshot({ path: `${shots}/signal-offline-${width}.png` });
      await context.setOffline(false);
      await page.locator("#workspace-TODAY").getByText("Offline. Logging still saves on this phone.", { exact: true }).waitFor({ state: "detached" });

      // Stealth: long-press the emblem.
      const emblem = page.locator("#workspace-TODAY .operator-emblem");
      await longPress(page, emblem);
      const stealth = page.getByRole("dialog", { name: "Stealth" });
      await stealth.waitFor();
      assert.ok(await noOverflow(page, width), "Stealth overflows");
      await page.screenshot({ path: `${shots}/stealth-${width}.png` });
      // Blind water: exactly once, no total shown.
      await stealth.getByRole("button", { name: "WATER", exact: true }).click();
      await stealth.getByRole("button", { name: "12 oz", exact: true }).click();
      await stealth.getByText("Water logged.", { exact: true }).waitFor();
      assert.equal(count(await records(page), "WATER_LOGGED"), 1);
      assert.ok(!/\d+ oz/.test(await stealth.textContent()), "Stealth showed a water total");
      // Peek shows only while held.
      const peek = stealth.getByRole("button", { name: "WATER hidden. Hold to show" });
      const box = await peek.boundingBox();
      await page.mouse.move(box.x + 10, box.y + 10); await page.mouse.down();
      await peek.getByText("12 oz", { exact: true }).waitFor();
      await page.screenshot({ path: `${shots}/stealth-peek-${width}.png` });
      await page.mouse.up();
      await peek.getByText("•••", { exact: true }).waitFor();
      // Persists across a reload, and the PWA cold-loads offline with it on.
      await context.setOffline(true);
      await page.reload();
      await page.getByRole("dialog", { name: "Stealth" }).waitFor();
      assert.equal(await page.evaluate(() => !!navigator.serviceWorker.controller && !navigator.onLine), true);
      await page.keyboard.press("Escape");
      await page.getByRole("dialog", { name: "Stealth" }).waitFor({ state: "detached" });
      await page.locator("#workspace-TODAY").getByText("Offline. Logging still saves on this phone.", { exact: true }).waitFor();
      await page.getByRole("button", { name: /, Offline\. Open readout$/ }).waitFor();
      const after = await records(page);
      assert.equal(count(after, "WATER_LOGGED"), 1, "Water duplicated across reload");
      assert.deepEqual(errors, []);
      results.push({ width, passed: true, systemsLine: true, readoutReadOnly: true, focusReturn: true, offlineSignal: true, stealthLongPress: true, blindWaterExactlyOnce: true, noTotalsInStealth: true, peekWhileHeld: true, stealthPersistsReload: true, offlineColdReload: true, pageErrors: errors });
      console.log(`PASS ${width}px: SYSTEMS, readout, offline signal, stealth, blind water, peek, offline cold reload`);
    } catch (error) {
      await page.screenshot({ path: `/tmp/suit-failure-${width}.png` });
      throw error;
    } finally { await context.close(); }
  }
  await writeFile(process.env.BEYOND_ACCEPTANCE_RESULT ?? `${shots}/acceptance.json`, `${JSON.stringify(results, null, 2)}\n`);
} finally { await browser.close(); }
