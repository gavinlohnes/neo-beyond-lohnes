import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { preview } from "vite";
import { chromium } from "playwright";

// Item 1 evidence only. Remaining REDESIGN-001 acceptance is intentionally not claimed.
const out = "docs/screenshots/redesign-001";
await mkdir(out, { recursive: true });
const server = await preview({ preview: { host: "127.0.0.1", port: 5192, strictPort: true } });
const browser = await chromium.launch({ headless: true, executablePath: process.env.BEYOND_BROWSER_EXECUTABLE || "/usr/bin/chromium" });
const evidence = [];
try {
  for (const width of [320, 360, 390, 412]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, timezoneId: "America/Chicago", reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.clock.install({ time: new Date("2026-10-12T17:10:00-05:00") });
    await page.goto("http://127.0.0.1:5192/neo-beyond-lohnes/");
    await page.getByRole("button", { name: "START DAY", exact: true }).click();
    await page.getByRole("button", { name: "CHECK IN", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "CHECK IN", exact: true });
    await sheet.getByRole("group", { name: "Energy", exact: true }).getByRole("button", { name: "3", exact: true }).click();
    await page.screenshot({ path: `${out}/${width}-check-in.png` });
    await sheet.getByRole("button", { name: "CLOSE", exact: true }).click();
    for (const [name, phase] of [["PREP", "PRE_WORK"], ["ON SHIFT", "SCHEDULED_SHIFT"], ["RECOVER", "EXPECTED_POST_WORK"], ["OFF DUTY", "OFF"]]) {
      await page.getByRole("button", { name: /Mode .*Change mode/ }).click();
      await page.getByRole("dialog").getByRole("button", { name: new RegExp(`^${name}`) }).click();
      await page.waitForFunction((phase) => document.querySelector(".mode-header")?.dataset.mode === phase, phase);
      await page.evaluate(() => { for (const animation of document.getAnimations()) { if (animation.effect?.getComputedTiming().iterations === Infinity) animation.pause(); else animation.finish(); } window.scrollTo(0, 0); });
      const sections = await page.locator(".redesign-today > section").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")));
      assert.deepEqual(sections, ["Day mode", "Log", "Next action", "Today's numbers", "Check-in"]);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `${out}/${width}-${phase.toLowerCase()}.png`, fullPage: true });
    }
    await page.getByRole("button", { name: "Log water", exact: true }).click();
    await page.getByRole("dialog", { name: "WATER", exact: true }).getByRole("button", { name: "+8 oz", exact: true }).click();
    await page.locator(".redesign-toast").waitFor();
    const bounds = await page.evaluate(() => ({ receipt: document.querySelector(".redesign-toast").getBoundingClientRect().bottom, nav: document.querySelector(".shell-nav").getBoundingClientRect().top }));
    assert.ok(bounds.receipt <= bounds.nav);
    await page.getByRole("button", { name: "UNDO", exact: true }).click();
    await page.locator(".redesign-toast").waitFor({ state: "detached" });
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await page.getByRole("button", { name: "Log water", exact: true }).waitFor();
    await context.setOffline(true);
    await page.reload();
    await page.getByRole("button", { name: "Log water", exact: true }).click();
    await page.getByRole("dialog", { name: "WATER", exact: true }).getByRole("button", { name: "+12 oz", exact: true }).click();
    await page.locator(".redesign-toast").waitFor();
    await page.reload();
    await page.getByRole("button", { name: "Log water", exact: true }).waitFor();
    await page.getByRole("button", { name: "Water 12 oz, explore records", exact: true }).waitFor();
    assert.deepEqual(errors, []);
    evidence.push({ width, modes: 4, checkInSheet: true, visibleReceipt: bounds, offlineColdReload: true, pageErrors: errors });
    await context.close();
    console.log(`PASS ${width}: TODAY order, four modes, check-in sheet, visible water undo, offline cold reload`);
  }
  await writeFile(`${out}/item-1-acceptance.json`, JSON.stringify(evidence, null, 2) + "\n");
} finally { await browser.close(); await server.close(); }
