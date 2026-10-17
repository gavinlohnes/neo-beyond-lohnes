// Built-PWA acceptance: synthetic contexts, canonical UI writes only, offline save/reload.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ headless: true, ...(process.env.BEYOND_BROWSER_EXECUTABLE ? { executablePath: process.env.BEYOND_BROWSER_EXECUTABLE } : {}) });
const url = process.env.BEYOND_ACCEPTANCE_URL ?? "http://127.0.0.1:5174/neo-beyond-lohnes/";
const output = process.env.BEYOND_SCREENSHOTS ?? "/tmp/beyond-weekly-review";
await mkdir(output, { recursive: true });
const results = [];
async function protein(page, grams) {
  await page.getByRole("button", { name: "BODY", exact: true }).click();
  await page.getByRole("button", { name: "Open PROTEIN ONLY", exact: true }).click();
  await page.waitForFunction(() => document.activeElement?.id === "protein-grams");
  await page.getByRole("spinbutton", { name: "Protein (g)", exact: true }).fill(String(grams));
  await page.getByRole("button", { name: "LOG PROTEIN", exact: true }).click();
  await page.getByRole("button", { name: "Explore protein", exact: true }).filter({ hasText: `${grams} g` }).waitFor();
}
async function review(page) {
  await page.getByRole("button", { name: "MORE", exact: true }).click();
  const menu = page.getByRole("button", { name: "Open REVIEW", exact: true });
  if (await menu.isVisible()) await menu.click();
  return page.getByRole("region", { name: "Weekly review", exact: true });
}
try {
  for (const width of [320, 360, 412]) {
    const context = await browser.newContext({ viewport: { width, height: 800 }, timezoneId: "America/Chicago", reducedMotion: "reduce" });
    const page = await context.newPage(); const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.clock.install({ time: new Date("2026-10-13T20:00:00-05:00") });
    await page.goto(url);
    await page.getByRole("button", { name: "START DAY", exact: true }).click();
    await page.getByRole("button", { name: "NO", exact: true }).click();
    await page.getByRole("button", { name: "ALL GOOD", exact: true }).click();
    await protein(page, 50);
    await page.clock.setFixedTime(new Date("2026-10-19T20:00:00-05:00"));
    await page.reload();
    const panel = await review(page);
    await panel.getByText("50.0 g average · 1 logged day", { exact: true }).waitFor();
    await panel.getByRole("textbox", { name: "What stood out? (optional)", exact: true }).fill("Synthetic weekly review note.");
    await panel.getByRole("combobox", { name: /Your focus for the week starting/ }).selectOption({ label: "Record protein on 1 day" });
    // The existing draft provider retains the unfinished review across a primary-tab detour.
    await page.getByRole("button", { name: "BODY", exact: true }).click();
    await review(page);
    assert.equal(await panel.getByRole("textbox", { name: "What stood out? (optional)", exact: true }).inputValue(), "Synthetic weekly review note.");
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await context.setOffline(true);
    await panel.getByRole("button", { name: "SAVE WEEKLY REVIEW", exact: true }).click();
    await panel.getByRole("status").filter({ hasText: "Weekly review saved on this device" }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${output}/saved-${width}.png`, fullPage: false });
    await page.reload();
    const reloaded = await review(page);
    await reloaded.getByText(/Saved review · starting/).click();
    assert.equal(await reloaded.getByRole("textbox", { name: "What stood out? (optional)", exact: true }).inputValue(), "Synthetic weekly review note.");
    await protein(page, 60);
    await page.clock.setFixedTime(new Date("2026-10-26T20:00:00-05:00"));
    await page.reload();
    const next = await review(page);
    await next.getByRole("heading", { name: "Your previous focus", exact: true }).waitFor();
    await next.getByText("1 recorded in this week; your chosen count was 1.", { exact: true }).waitFor();
    await page.screenshot({ path: `${output}/next-week-${width}.png`, fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    results.push({ width, result: "PASS", checks: ["canonical protein", "calendar week summary", "draft tab detour", "offline save", "offline cold reload", "saved note/focus", "next-week focus count", "no overflow/page errors"] });
    await context.close();
  }
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
