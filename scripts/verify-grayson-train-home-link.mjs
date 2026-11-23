import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { preview } from "vite";

const out = "docs/screenshots/grayson-train-home-link-001";
await mkdir(out, { recursive: true });
const server = await preview({ preview: { host: "127.0.0.1", port: 5199, strictPort: true } });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of [320, 360, 412]) {
    const context = await browser.newContext({ viewport: { width, height: 820 }, timezoneId: "America/Chicago", reducedMotion: "reduce", isMobile: true, hasTouch: true });
    const page = await context.newPage(); const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:5199/neo-beyond-lohnes/");
    await page.getByRole("button", { name: "TRAIN", exact: true }).click();
    await page.getByRole("button", { name: "DRAFT MY 3-DAY PLAN" }).click();
    for (let index = 0; index < 3; index += 1) await page.getByRole("button", { name: "CONTINUE" }).click();
    await page.getByRole("button", { name: "REVIEW AND SAVE" }).click(); await page.getByRole("button", { name: "CONFIRM SAVE 3 TEMPLATES" }).click();
    await page.getByRole("heading", { name: "Three templates are ready" }).waitFor(); await page.getByRole("button", { name: "CLOSE" }).click();
    await page.getByRole("button", { name: "ACTIVATE A → B → C" }).click();
    await page.getByRole("combobox", { name: "Sequence A" }).selectOption({ label: "Grayson A - Bench strength" });
    await page.getByRole("combobox", { name: "Sequence B" }).selectOption({ label: "Grayson B - Pull and posterior chain" });
    await page.getByRole("combobox", { name: "Sequence C" }).selectOption({ label: "Grayson C - Bench volume and balance" });
    await page.getByRole("button", { name: "CONFIRM ACTIVATION" }).click(); await page.getByRole("heading", { name: /^Next: A ·/ }).waitFor();
    await page.getByRole("button", { name: "SET UP HOME FORMS" }).click(); await page.getByRole("button", { name: "CREATE BODYWEIGHT HOME OPTIONS" }).click();
    await page.getByText("A · Grayson HOME A", { exact: true }).waitFor(); await page.screenshot({ path: `${out}/${width}-exact-home-review.png`, fullPage: true });
    await page.getByRole("button", { name: "CONFIRM HOME LINKS" }).click(); await page.getByRole("button", { name: "START HOME · A" }).waitFor();
    await page.getByRole("region", { name: "My programme" }).scrollIntoViewIfNeeded(); await page.screenshot({ path: `${out}/${width}-linked-home.png` });
    await page.getByRole("button", { name: "START HOME · A" }).click(); await page.getByText(/Grayson HOME A · HOME — in progress/).waitFor();
    await page.screenshot({ path: `${out}/${width}-home-in-progress.png` });
    results.push({ width, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), errors }); await context.close();
  }
} finally { await browser.close(); server.httpServer.close(); }
await writeFile(`${out}/acceptance.json`, JSON.stringify(results, null, 2));
const failures = results.filter((result) => result.overflow || result.errors.length);
console.log(failures.length ? JSON.stringify(failures, null, 2) : "HOME links: no overflow or page errors at 320/360/412 px.");
if (failures.length) process.exitCode = 1;
