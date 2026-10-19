import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { preview } from "vite";
import { chromium } from "playwright";

// Run after npm run build. Fixtures are entered through the production UI.
// OUTPUT redirects the evidence (POLISH-002 reruns it without replacing the POLISH-001 record).
const output = process.env.OUTPUT ?? "docs/screenshots/polish-001";
await mkdir(output, { recursive: true });
const server = await preview({ preview: { host: "127.0.0.1", port: 5177, strictPort: true } });
const url = "http://127.0.0.1:5177/neo-beyond-lohnes/";
const browser = await chromium.launch({ headless: true, ...(process.env.BEYOND_BROWSER_EXECUTABLE ? { executablePath: process.env.BEYOND_BROWSER_EXECUTABLE } : {}) });
const results = [];
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const animation of document.getAnimations()) {
      if (animation.effect?.getComputedTiming().iterations === Infinity) animation.pause();
      else animation.finish();
    }
    window.scrollTo(0, 0);
  });
}
async function readRecords(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open("beyond");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const tx = database.transaction(["events", "savedMeals"], "readonly");
      const result = {};
      for (const name of ["events", "savedMeals"]) { const get = tx.objectStore(name).getAll(); get.onsuccess = () => { result[name] = get.result; }; }
      tx.oncomplete = () => { database.close(); resolve(result); };
      tx.onerror = () => reject(tx.error);
    };
  }));
}
try {
  for (const width of [320, 360, 390, 412]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 800 }, timezoneId: "America/Chicago", reducedMotion: "reduce", isMobile: true, hasTouch: true });
    const page = await context.newPage(); page.setDefaultTimeout(10_000);
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.clock.install({ time: new Date("2026-10-12T17:10:00-05:00") });
      await page.goto(url);
      await page.getByRole("button", { name: "START DAY", exact: true }).click();
      await page.getByRole("button", { name: "YES", exact: true }).click();
      await page.waitForFunction(() => document.querySelector('.mode-header[data-mode="PRE_WORK"]'));
      await page.getByRole("button", { name: "Open TOOLS", exact: true }).click();
      const openCheckIn = page.getByRole("button", { name: "Open CHECK-IN", exact: true });
      if (await openCheckIn.isVisible()) await openCheckIn.click();
      const manual = page.getByRole("button", { name: "MANUAL CHECK-IN", exact: true });
      if (await manual.isVisible()) await manual.click();
      for (const [label, value] of [["Energy", "1"], ["Stress", "5"], ["Mood", "1"], ["Soreness", "5"], ["Alcohol urge", "5"]]) {
        await page.getByText(label, { exact: true }).locator("..").locator("..").getByRole("button", { name: value, exact: true }).click();
      }
      await page.getByRole("button", { name: "SUBMIT CHECK-IN", exact: true }).click();
      await page.getByRole("button", { name: "I'll do this", exact: true }).waitFor();
      const closeTools = page.getByRole("button", { name: "Close TOOLS", exact: true });
      if (await closeTools.isVisible()) await closeTools.click();
      for (const [name, phase] of [["PREP", "PRE_WORK"], ["ON SHIFT", "SCHEDULED_SHIFT"], ["RECOVER", "EXPECTED_POST_WORK"], ["OFF DUTY", "OFF"]]) {
        await page.getByRole("button", { name: /Mode .*Change mode/ }).click();
        await page.getByRole("dialog").getByRole("button", { name: new RegExp(`^${name}`) }).click();
        await page.waitForFunction((phase) => document.documentElement.dataset.suitMode === phase, phase);
        await settle(page);
        const bounds = await page.evaluate(() => {
          const rect = (selector) => { const { top, bottom } = document.querySelector(selector).getBoundingClientRect(); return { top, bottom }; };
          return { name: rect(".mode-header__name"), source: rect(".mode-header__source"), city: rect(".cc-skyline"), header: rect(".today-situation"), card: rect(".console-guidance"), numbers: rect(".today-numbers"), actions: rect(".console-controls"), nav: rect(".shell-nav"), overflow: document.documentElement.scrollWidth > innerWidth };
        });
        assert.ok(bounds.name.bottom <= bounds.city.top && bounds.source.bottom <= bounds.city.top);
        assert.ok(bounds.header.bottom <= bounds.card.top && bounds.card.bottom <= bounds.numbers.top && bounds.numbers.bottom <= bounds.actions.top);
        assert.equal(bounds.overflow, false);
        if (width === 360 || width === 390) assert.ok(bounds.actions.bottom <= bounds.nav.top, `${width} ${name}: action row ${bounds.actions.bottom} below ${bounds.nav.top}`);
        // POLISH-002: the beam marks a real action and goes dark ON SHIFT, as in the prototype.
        assert.equal(await page.locator(".cc-beam").count(), phase === "SCHEDULED_SHIFT" ? 0 : 1);
        const redActions = await page.locator(".today-field button").evaluateAll((buttons) => buttons.filter((button) => {
          if (!button.getClientRects().length) return false;
          const [r, g, b] = getComputedStyle(button).backgroundColor.match(/[\d.]+/g).map(Number);
          return r > 80 && r > g * 2 && r > b * 2;
        }).length);
        assert.equal(redActions, 1);
        await page.screenshot({ path: `${output}/${width}-${phase.toLowerCase()}.png`, fullPage: true });
        results.push({ width, mode: name, bounds, redActions });
      }
      await page.clock.setSystemTime(new Date("2026-10-12T23:40:00-05:00"));
      await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
      await page.waitForFunction(() => document.querySelector(".cc-sky").style.opacity === "1");
      await settle(page); await page.screenshot({ path: `${output}/${width}-night.png` });
      await page.clock.setSystemTime(new Date("2026-10-13T11:00:00-05:00"));
      await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
      await page.waitForFunction(() => document.querySelector(".cc-sky").style.opacity === "0");
      await page.getByRole("button", { name: "Log water", exact: true }).click();
      await page.getByRole("dialog", { name: "WATER", exact: true }).getByRole("button", { name: "+8 oz", exact: true }).click();
      await page.getByText("8 oz recorded.", { exact: true }).waitFor();
      assert.equal(await page.getByRole("button", { name: "TODAY", exact: true }).getAttribute("aria-current"), "page");
      await page.getByRole("button", { name: "UNDO", exact: true }).click();
      await page.waitForFunction(() => ![...document.querySelectorAll("button")].some((button) => button.textContent === "UNDO"));
      const water = (await readRecords(page)).events;
      assert.equal(water.filter((e) => e.type === "WATER_LOGGED").length, 1);
      assert.equal(water.filter((e) => e.type === "WATER_LOG_VOIDED").length, 1);
      await page.evaluate(async () => { await navigator.serviceWorker.ready; });
      await page.reload(); await page.getByRole("button", { name: "TODAY", exact: true }).waitFor();
      await context.setOffline(true);
      await page.reload(); await page.getByRole("button", { name: "Log water", exact: true }).waitFor();
      await page.getByRole("button", { name: "Log water", exact: true }).click();
      await page.getByRole("dialog", { name: "WATER", exact: true }).getByRole("button", { name: "+16 oz", exact: true }).click();
      await page.getByText("16 oz recorded.", { exact: true }).waitFor();
      await page.reload(); await page.getByRole("button", { name: "Log water", exact: true }).waitFor();
      assert.equal((await readRecords(page)).events.filter((e) => e.type === "WATER_LOGGED").length, 2);
      assert.deepEqual(errors, []);
      console.log(`PASS ${width}: four modes, order, scene, red action, water/undo, offline save and cold reload`);
    } finally { await context.close(); }
  }
  await writeFile(`${output}/acceptance.json`, JSON.stringify(results, null, 2) + "\n");
} finally { await browser.close(); await server.close(); }
