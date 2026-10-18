// Fresh synthetic built-PWA walkthrough. All writes use canonical production UI.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const executablePath = process.env.BEYOND_BROWSER_EXECUTABLE;
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const url = process.env.BEYOND_ACCEPTANCE_URL ?? "http://127.0.0.1:5177/neo-beyond-lohnes/";
const root = fileURLToPath(new URL("../docs/screenshots/body-progress-001/", import.meta.url));
const axe = await readFile(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const results = [];
async function rows(page, store) {
  return page.evaluate((name) => new Promise((resolve, reject) => {
    const open = indexedDB.open("beyond"); open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result; const tx = db.transaction(name, "readonly"); const request = tx.objectStore(name).getAll();
      request.onsuccess = () => resolve(request.result.map((row) => name === "progressPhotos" ? { ...row, image: { type: row.image.type, size: row.image.size } } : row));
      request.onerror = () => reject(request.error); tx.oncomplete = () => db.close();
    };
  }), store);
}
async function saved(page, text) { await page.getByRole("status").filter({ hasText: text }).waitFor(); }
async function capture(page, name) {
  await page.evaluate(() => { for (const animation of document.getAnimations()) animation.finish(); window.scrollTo(0, 0); });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Horizontal overflow");
  assert.equal(await page.locator("main").count(), 1, "One main landmark");
  const badControls = await page.locator(".body-progress-shell button").evaluateAll((buttons) => buttons.filter((button) => {
    const box = button.getBoundingClientRect(); return box.width > 0 && box.height > 0 && (box.height < 44 || button.scrollWidth > button.clientWidth + 1);
  }).map((button) => button.textContent));
  assert.deepEqual(badControls, [], "44px controls and unclipped labels");
  await page.screenshot({ path: `${root}${name}.png` });
  await page.addScriptTag({ content: axe });
  const violations = await page.evaluate(async () => (await window.axe.run(document.body)).violations);
  assert.deepEqual(violations.map((issue) => ({ id: issue.id, impact: issue.impact, nodes: issue.nodes.map((node) => node.target) })), [], `Accessibility: ${name}`);
}
async function measurement(page, inches, date) {
  await page.getByRole("spinbutton", { name: "Inches", exact: true }).fill(String(inches));
  await page.getByLabel("Measured on", { exact: true }).fill(date);
  await page.getByRole("button", { name: "SAVE MEASUREMENT", exact: true }).click();
  await saved(page, `Waist saved · ${inches} in`);
}
async function importPhoto(page, date, shade) {
  const encoded = await page.evaluate((color) => {
    const canvas = document.createElement("canvas"); canvas.width = 180; canvas.height = 240;
    const ctx = canvas.getContext("2d"); const gradient = ctx.createLinearGradient(0, 0, 180, 240);
    gradient.addColorStop(0, color); gradient.addColorStop(1, "#212121"); ctx.fillStyle = gradient; ctx.fillRect(0, 0, 180, 240);
    ctx.strokeStyle = "#aaa"; ctx.lineWidth = 3; ctx.strokeRect(45, 40, 90, 160);
    return canvas.toDataURL("image/png").split(",")[1];
  }, shade);
  await page.locator('[aria-label="Import progress photo"]').setInputFiles({ name: "synthetic-frame.png", mimeType: "image/png", buffer: Buffer.from(encoded, "base64") });
  await page.getByLabel("Taken on", { exact: true }).fill(date);
}
try {
  await mkdir(root, { recursive: true });
  for (const width of [320, 360, 412]) {
    const context = await browser.newContext({ viewport: { width, height: 800 }, timezoneId: "America/Chicago", isMobile: true, hasTouch: true, reducedMotion: "reduce" });
    const page = await context.newPage(); const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.clock.install({ time: new Date("2026-10-18T04:10:00-05:00") });
    await page.goto(url);
    await page.getByRole("button", { name: "BODY", exact: true }).click();
    await page.getByRole("button", { name: "Open BODYWEIGHT", exact: true }).click();
    await page.getByRole("spinbutton", { name: "Weight (lbs)", exact: true }).fill("180");
    await page.getByRole("button", { name: "LOG BODYWEIGHT", exact: true }).click();
    await page.getByText("180 lbs logged.", { exact: true }).waitFor();
    await page.getByRole("button", { name: "BODY", exact: true }).click();
    await page.getByRole("button", { name: "YOUR PROGRESS", exact: true }).click();
    await page.getByRole("button", { name: "MEASUREMENTS", exact: true }).click();
    await measurement(page, 38, "2026-09-01");
    await measurement(page, 37, "2026-10-17");
    await page.getByRole("button", { name: "Correct Waist 38 inches measured 2026-09-01", exact: true }).click();
    await page.waitForFunction(() => document.activeElement?.id === "measurement-correction-inches");
    await page.getByRole("spinbutton", { name: "Corrected inches", exact: true }).fill("38.25");
    await page.getByRole("button", { name: "SAVE CORRECTION", exact: true }).click();
    await saved(page, "Waist corrected to 38.25 in");
    await capture(page, `measurements-${width}`);

    await page.getByRole("spinbutton", { name: "Inches", exact: true }).fill("36.75");
    const before = await rows(page, "events");
    await page.getByRole("button", { name: "TODAY", exact: true }).click();
    await page.getByRole("button", { name: "BODY", exact: true }).click();
    assert.equal(await page.getByRole("spinbutton", { name: "Inches", exact: true }).inputValue(), "36.75");
    await page.getByRole("button", { name: "TRENDS", exact: true }).click();
    await page.getByRole("combobox", { name: "EXPLORE A MEASURE", exact: true }).waitFor();
    assert.deepEqual(await rows(page, "events"), before, "Browsing does not write");
    await capture(page, `overview-${width}`);
    await page.getByRole("button", { name: "PHOTOS", exact: true }).click();
    await importPhoto(page, "2026-09-01", "#555");
    assert.equal((await rows(page, "progressPhotos")).length, 0, "Selection is not a save");
    await page.getByRole("button", { name: "SAVE PHOTO", exact: true }).click(); await saved(page, "Front photo saved");
    await importPhoto(page, "2026-10-17", "#aaa");
    await page.getByRole("button", { name: "TODAY", exact: true }).click(); await page.getByRole("button", { name: "BODY", exact: true }).click();
    await page.getByRole("img", { name: "Selected photo, not yet saved", exact: true }).waitFor();
    assert.equal((await rows(page, "progressPhotos")).length, 1, "Interrupted photo stays unsaved");
    await page.getByRole("button", { name: "SAVE PHOTO", exact: true }).click(); await saved(page, "Front photo saved");
    assert.equal((await rows(page, "progressPhotos")).length, 2);
    await page.getByRole("button", { name: "COMPARE PHOTOS", exact: true }).click();
    await capture(page, `photos-${width}`);
    await page.getByRole("region", { name: "Same-pose photo comparison", exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${root}comparison-${width}.png` });
    const storedPhotos = await rows(page, "progressPhotos");
    assert.equal(storedPhotos.every((photo) => photo.image.type === "image/jpeg" && photo.image.size > 0), true);

    // Finish the retained measurement before reload; drafts are intentionally session-local.
    await page.getByRole("button", { name: "MEASUREMENTS", exact: true }).click();
    await page.getByRole("button", { name: "SAVE MEASUREMENT", exact: true }).click(); await saved(page, "Waist saved · 36.75 in");
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload(); await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await context.setOffline(true); await page.reload();
    await page.getByRole("button", { name: "BODY", exact: true }).click(); await page.getByRole("button", { name: "YOUR PROGRESS", exact: true }).click();
    await page.getByRole("button", { name: "MEASUREMENTS", exact: true }).click();
    await page.getByRole("region", { name: "Latest measurements", exact: true }).filter({ hasText: "36.75 in" }).waitFor();
    await measurement(page, 36.5, "2026-10-18");
    await page.getByRole("button", { name: "PHOTOS", exact: true }).click();
    await page.getByRole("button", { name: "COMPARE PHOTOS", exact: true }).click();
    await page.getByRole("region", { name: "Same-pose photo comparison", exact: true }).waitFor();
    await importPhoto(page, "2026-10-18", "#777"); await page.getByRole("button", { name: "SAVE PHOTO", exact: true }).click(); await saved(page, "Front photo saved");
    await page.reload();
    assert.equal((await rows(page, "progressPhotos")).length, 3, "Offline photo survives cold reload");
    const finalEvents = await rows(page, "events");
    assert.equal(finalEvents.filter((event) => event.type === "MEASUREMENT_LOGGED").length, 4);
    assert.equal(finalEvents.filter((event) => event.type === "MEASUREMENT_LOG_CORRECTED").length, 1);
    assert.equal(finalEvents.filter((event) => event.type === "PROGRESS_PHOTO_ADDED").length, 3);
    assert.equal(finalEvents.filter((event) => event.type.startsWith("MEASUREMENT_")).every((event) => event.beyondDayId === undefined), true);
    assert.deepEqual(errors, []);
    results.push({ width, passed: true, accessibility: "axe: zero violations in overview, measurements and photos", offline: "cold reload, reads, measurement/photo saves, second reload", drafts: "measurement and selected photo retained across navigation", measurements: 4, corrections: 1, photos: 3, pageErrors: errors });
    await context.close();
  }
  await writeFile(`${root}acceptance.json`, JSON.stringify({ recordedAt: new Date().toISOString(), results }, null, 2) + "\n");
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
