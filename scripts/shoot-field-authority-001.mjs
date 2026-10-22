import { mkdir } from "node:fs/promises";
import { preview } from "vite";
import { chromium } from "playwright";

// FIELD-AUTHORITY-001: built-app screenshots of TODAY's states at FIELD width (360). Evidence only.
const out = process.argv[2] || "docs/screenshots/field-authority-001";
await mkdir(out, { recursive: true });
const server = await preview({ preview: { host: "127.0.0.1", port: 5193, strictPort: true } });
const browser = await chromium.launch({ headless: true, executablePath: process.env.BEYOND_BROWSER_EXECUTABLE || "/usr/bin/chromium" });
const settle = (page) => page.evaluate(() => { for (const a of document.getAnimations()) { if (a.effect?.getComputedTiming().iterations === Infinity) a.pause(); else a.finish(); } window.scrollTo(0, 0); });
try {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, timezoneId: "America/Chicago", reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.clock.install({ time: new Date("2026-10-12T17:10:00-05:00") });
  await page.goto("http://127.0.0.1:5193/neo-beyond-lohnes/");
  await page.getByRole("heading", { name: "Mode not set", exact: true }).waitFor();
  await settle(page); await page.screenshot({ path: `${out}/360-a-fresh.png`, fullPage: true });
  await page.getByRole("button", { name: "START DAY", exact: true }).click();
  await page.getByRole("button", { name: "CHECK IN", exact: true }).waitFor();
  await settle(page); await page.screenshot({ path: `${out}/360-c-day-on-not-checked-in.png`, fullPage: true });
  await page.getByRole("button", { name: "CHECK IN", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "CHECK IN", exact: true });
  for (const label of ["Energy", "Stress", "Mood", "Soreness", "Alcohol urge"]) await sheet.getByRole("group", { name: label, exact: true }).getByRole("button", { name: label === "Energy" || label === "Mood" ? "4" : "1", exact: true }).click();
  await sheet.getByRole("button", { name: "SUBMIT CHECK-IN" }).click();
  await page.waitForFunction(() => !document.querySelector("dialog[open]"));
  await page.waitForTimeout(300);
  await settle(page); await page.screenshot({ path: `${out}/360-after-check-in.png`, fullPage: true });
  await page.getByRole("button", { name: "TRAIN", exact: true }).click();
  await page.waitForTimeout(300); await settle(page); await page.screenshot({ path: `${out}/360-train.png`, fullPage: true });
  await page.getByRole("button", { name: "COMMAND", exact: true }).click();
  await page.waitForTimeout(300); await settle(page); await page.screenshot({ path: `${out}/360-command.png`, fullPage: true });
  await context.close();
  // TRAIN before any check-in.
  const c2 = await browser.newContext({ viewport: { width: 360, height: 800 }, timezoneId: "America/Chicago", reducedMotion: "reduce" });
  const p2 = await c2.newPage();
  await p2.clock.install({ time: new Date("2026-10-12T17:10:00-05:00") });
  await p2.goto("http://127.0.0.1:5193/neo-beyond-lohnes/");
  await p2.getByRole("button", { name: "START DAY", exact: true }).click();
  await p2.getByRole("button", { name: "CHECK IN", exact: true }).waitFor();
  await p2.getByRole("button", { name: "TRAIN", exact: true }).click();
  await p2.waitForTimeout(300); await settle(p2); await p2.screenshot({ path: `${out}/360-train-not-checked-in.png`, fullPage: true });
  await c2.close();
  // A real recommendation (a hard check-in) leads TODAY.
  const c3 = await browser.newContext({ viewport: { width: 360, height: 800 }, timezoneId: "America/Chicago", reducedMotion: "reduce" });
  const p3 = await c3.newPage();
  await p3.clock.install({ time: new Date("2026-10-12T17:10:00-05:00") });
  await p3.goto("http://127.0.0.1:5193/neo-beyond-lohnes/");
  await p3.getByRole("button", { name: "START DAY", exact: true }).click();
  await p3.getByRole("button", { name: "CHECK IN", exact: true }).click();
  const hard = p3.getByRole("dialog", { name: "CHECK IN", exact: true });
  for (const [label, value] of [["Energy", "1"], ["Stress", "5"], ["Mood", "1"], ["Soreness", "5"], ["Alcohol urge", "5"]]) await hard.getByRole("group", { name: label, exact: true }).getByRole("button", { name: value, exact: true }).click();
  await hard.getByRole("button", { name: "SUBMIT CHECK-IN" }).click();
  await p3.waitForFunction(() => !document.querySelector("dialog[open]"));
  await p3.waitForTimeout(300); await settle(p3); await p3.screenshot({ path: `${out}/360-b-real-recommendation.png`, fullPage: true });
  await c3.close();
} finally { await browser.close(); server.httpServer.close(); }
