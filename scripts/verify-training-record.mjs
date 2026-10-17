// ULTIMATE-FOUNDATION-002 (Training Record): built-PWA acceptance against `npm run preview`.
// Two real workouts through the UI, then TRAIN → HISTORY, a session record, lift history during
// a workout with an unsaved set and a running rest, and an offline reload — at 320/360/412 px.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";

const browser = await chromium.launch({ headless: true, ...(process.env.BEYOND_BROWSER_EXECUTABLE ? { executablePath: process.env.BEYOND_BROWSER_EXECUTABLE } : {}) });
const root = fileURLToPath(new URL("../docs/screenshots/ultimate-foundation-002/", import.meta.url));
const baseUrl = process.env.BEYOND_ACCEPTANCE_URL ?? "http://127.0.0.1:5173/neo-beyond-lohnes/";

async function snapshot(page, path, top) {
  await page.evaluate(() => { for (const animation of document.getAnimations()) animation.finish(); });
  await top.evaluate((el) => el.scrollIntoView({ block: "start" }));
  await page.screenshot({ path });
}
async function count(page, store) {
  return page.evaluate((name) => new Promise((resolve, reject) => {
    const open = indexedDB.open("beyond");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(name, "readonly");
      const req = tx.objectStore(name).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    };
  }), store);
}
const writes = async (page) => [await count(page, "events"), await count(page, "performedSets"), await count(page, "workoutSessions")].join("/");
async function layout(page, width, where) {
  if (await page.getByRole("main").count() !== 1) throw Error(`Main landmark: ${where}`);
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error(`Horizontal overflow at ${width}: ${where}`);
}
async function hold(page, name) {
  const button = page.getByRole("button", { name, exact: true });
  await button.scrollIntoViewIfNeeded();
  const box = await button.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1300);
  await page.mouse.up();
}
async function logSet(page, n, weight, reps) {
  await page.getByRole("spinbutton", { name: `Set ${n} weight in pounds`, exact: true }).fill(String(weight));
  await page.getByRole("spinbutton", { name: `Set ${n} repetitions`, exact: true }).fill(String(reps));
  await page.getByRole("button", { name: "LOG", exact: true }).first().click();
  await page.getByText(`#${n} — ${weight} lb x ${reps}`, { exact: false }).first().waitFor().catch(() => {});
}
async function startTemplateA(page) {
  await page.getByRole("button", { name: "TRAIN", exact: true }).click();
  const change = page.getByRole("button", { name: "CHANGE", exact: true });
  if (await change.isVisible()) {
    await change.click();
    await page.getByRole("button", { name: "A", exact: true }).click();
    await page.getByRole("button", { name: "STANDARD", exact: true }).click();
  }
  await page.getByRole("button", { name: "START WORKOUT", exact: true }).click();
  await page.getByRole("heading", { name: "Machine Chest Press", exact: true }).waitFor();
}

await mkdir(root, { recursive: true });
const results = [];
try {
  for (const width of [320, 360, 412]) {
    const context = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: false, timezoneId: "America/Chicago", reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.clock.install({ time: new Date("2026-10-13T18:00:00-05:00") });
    await page.goto(baseUrl);
    await page.getByRole("button", { name: "START DAY", exact: true }).click();
    const no = page.getByRole("button", { name: "NO", exact: true });
    if (await no.isVisible()) await no.click();
    await page.getByRole("button", { name: "ALL GOOD", exact: true }).click();
    await page.getByRole("region", { name: "Current recommendation" }).waitFor();

    // Session 1: one set, finished as PARTIAL.
    await startTemplateA(page);
    await logSet(page, 1, 90, 10);
    await hold(page, "PARTIAL");
    await page.getByRole("button", { name: "DONE", exact: true }).click();
    await page.clock.fastForward("05:00");

    // Session 2: a record set, then lift history with an unsaved set 2 and a running rest.
    await startTemplateA(page);
    await logSet(page, 1, 100, 10);
    await page.getByText(/RESTING/).first().waitFor();
    await page.getByRole("spinbutton", { name: "Set 2 weight in pounds", exact: true }).fill("110");
    await page.getByRole("spinbutton", { name: "Set 2 repetitions", exact: true }).fill("7");
    const beforeLift = await writes(page);
    await page.getByRole("button", { name: "Machine Chest Press history", exact: true }).click();
    await page.getByText("RECENT SESSIONS", { exact: true }).waitFor();
    const liftLines = await page.locator(".train-lift-history li").allTextContents();
    if (liftLines.length !== 1 || !liftLines[0].endsWith("90 lb × 10")) throw Error(`Lift history lines: ${JSON.stringify(liftLines)}`);
    await page.waitForFunction(() => document.activeElement?.textContent === "Machine Chest Press history", null, { timeout: 2000 }).catch(() => { throw Error("Lift history focus"); });
    await layout(page, width, "lift history");
    await snapshot(page, `${root}/lift-history-${width}.png`, page.getByText("Last time: 90 lb x 10", { exact: true }));
    await page.getByRole("button", { name: "CLOSE", exact: true }).click();
    await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Machine Chest Press history", null, { timeout: 2000 }).catch(() => { throw Error("Lift history return focus"); });
    if (await page.getByRole("spinbutton", { name: "Set 2 weight in pounds", exact: true }).inputValue() !== "110") throw Error("Unsaved weight lost");
    if (await page.getByRole("spinbutton", { name: "Set 2 repetitions", exact: true }).inputValue() !== "7") throw Error("Unsaved reps lost");
    if (!(await page.getByText(/RESTING/).first().isVisible())) throw Error("Rest timer lost");
    if (await writes(page) !== beforeLift) throw Error("Lift history wrote");
    await page.getByRole("button", { name: "LOG", exact: true }).first().click();
    await hold(page, "COMPLETE");
    await page.getByRole("button", { name: "DONE", exact: true }).click();

    // HISTORY and a session record, read only.
    const beforeHistory = await writes(page);
    await page.getByRole("button", { name: "Open HISTORY", exact: true }).click();
    const rows = page.locator(".record-cards").getByRole("button");
    await rows.first().waitFor();
    const names = await rows.evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
    if (names.length !== 2 || !/Completed · \d+ min · 2 working sets · 1,770 lb volume · 2 records$/.test(names[0]) || !/Partial · \d+ min · 1 working set · 900 lb volume$/.test(names[1])) {
      throw Error(`History rows: ${JSON.stringify(names)}`);
    }
    await layout(page, width, "history");
    await snapshot(page, `${root}/history-${width}.png`, page.getByRole("heading", { name: "History", exact: true }));
    await rows.first().click();
    await page.getByText("Set 1 · 100 lb × 10", { exact: true }).waitFor();
    await page.getByText("heaviest yet (100 lb)", { exact: true }).waitFor();
    await page.getByText("heaviest yet (110 lb)", { exact: true }).waitFor();
    await page.getByText("Set 2 · 110 lb × 7", { exact: true }).waitFor();
    await layout(page, width, "session record");
    await snapshot(page, `${root}/session-record-${width}.png`, page.getByRole("heading", { name: /^Template A · / }));
    await page.getByRole("button", { name: "BODY", exact: true }).click();
    await page.getByRole("button", { name: "TRAIN", exact: true }).click();
    await page.getByText("Set 1 · 100 lb × 10", { exact: true }).waitFor();
    await page.getByRole("button", { name: "BACK", exact: true }).click();
    await page.waitForFunction(() => /^Template A/.test(document.activeElement?.getAttribute("aria-label") ?? ""), null, { timeout: 2000 }).catch(() => { throw Error("Session record return focus"); });
    if (await writes(page) !== beforeHistory) throw Error("History wrote");

    // Offline: the same history reads from IndexedDB after a reload.
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await page.getByRole("button", { name: "TRAIN", exact: true }).waitFor();
    await context.setOffline(true);
    await page.reload();
    await page.getByRole("button", { name: "TRAIN", exact: true }).click();
    await page.getByRole("button", { name: "Open HISTORY", exact: true }).click();
    await page.locator(".record-cards").getByRole("button").first().click();
    await page.getByText("Set 2 · 110 lb × 7", { exact: true }).waitFor();

    if (errors.length) throw Error(JSON.stringify(errors));
    results.push({ width, passed: true, main: 1, overflow: false, historyRows: names, liftHistory: liftLines, readsWroteNothing: true, unsavedSetAndRestKept: true, offlineReload: true, pageErrors: errors });
    await context.close();
  }
  await writeFile(`${root}/acceptance.json`, JSON.stringify(results, null, 2) + "\n");
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
