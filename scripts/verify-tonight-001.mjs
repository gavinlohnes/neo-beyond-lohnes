// TONIGHT-001 PR 2 acceptance: built PWA, synthetic data entered through the UI and canonical commands only.
import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const OUT = fileURLToPath(new URL("../docs/screenshots/tonight-001/", import.meta.url));
const url = process.env.BEYOND_ACCEPTANCE_URL ?? "http://127.0.0.1:5177/neo-beyond-lohnes/";
const executablePath = process.env.BEYOND_BROWSER_EXECUTABLE;
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const axeSrc = await readFile(new URL("../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const results = [];
for (const width of [320, 360, 390, 412]) {
  const ctx = await browser.newContext({ viewport: { width, height: 844 }, timezoneId: "America/Chicago", isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const page = await ctx.newPage(); const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  page.setDefaultTimeout(8000);
  const shot = async (name) => {
    await page.evaluate(() => { for (const a of document.getAnimations()) a.finish(); });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    await page.screenshot({ path: `${OUT}${width}-${name}.png`, fullPage: true });
    await page.addScriptTag({ content: axeSrc });
    const v = await page.evaluate(async () => (await window.axe.run(document.body, { rules: { region: { enabled: false } } })).violations.map((x) => x.id));
    results.push({ width, name, overflow, axe: v });
  };
  // Mon Oct 12 2026 (Week A) is a work night 18:00–06:00 under the seeded schedule.
  await page.clock.install({ time: new Date("2026-10-12T16:40:00-05:00") });
  await page.goto(url); await page.waitForTimeout(1500);
  // Save the schedule once, so the day starts per schedule.
  await page.getByRole("button", { name: "COMMAND", exact: true }).click();
  await page.getByText("WORK SCHEDULE", { exact: true }).click();
  await page.getByRole("button", { name: "SAVE SCHEDULE" }).click();
  await page.getByText("Saved.").waitFor();
  // Two saved meals through BODY's canonical form; log the shake.
  await page.getByRole("button", { name: "TODAY", exact: true }).click();
  await page.getByRole("button", { name: "Log a meal", exact: true }).click();
  await page.getByRole("button", { name: /^New meal or manual entry/ }).click();
  for (const [name, kcal, g, log] of [["Protein shake", "160", "30", true], ["Chicken rice bowl", "560", "45", false]]) {
    if (await page.getByRole("button", { name: "SHOW ADD MEAL" }).count()) await page.getByRole("button", { name: "SHOW ADD MEAL" }).click();
    await page.locator("#new-meal-name").fill(name);
    await page.getByLabel("New meal calories", { exact: true }).fill(kcal);
    await page.getByLabel("New meal protein (g)", { exact: true }).fill(g);
    await page.getByRole("button", { name: log ? "SAVE & LOG" : "SAVE ONLY" }).click();
    await page.waitForTimeout(500);
  }
  await page.getByRole("button", { name: "RETURN TO TODAY" }).click();
  await page.getByRole("button", { name: "Log water" }).click();
  await page.getByRole("button", { name: "+16 oz" }).click();
  await page.waitForTimeout(600);
  await shot("prep-quick-log");
  // 22:14 on shift: one tap from QUICK LOG, then the MEAL sheet.
  await page.clock.setSystemTime(new Date("2026-10-12T22:14:00-05:00"));
  await page.reload(); await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Log Chicken rice bowl", exact: true }).first().click();
  await page.getByText("Chicken rice bowl logged · 560 kcal · 45 g.").waitFor();
  await shot("shift-quick-log-undo");
  await page.getByRole("button", { name: "Log a meal", exact: true }).click();
  await page.getByLabel("Find a meal").fill("shake");
  await shot("shift-meal-sheet");
  await page.getByRole("button", { name: "CLOSE" }).first().click();
  // 03:05 briefing.
  await page.clock.setSystemTime(new Date("2026-10-13T03:05:00-05:00"));
  await page.reload(); await page.waitForTimeout(1500);
  if (await page.getByRole("button", { name: "Open the briefing" }).count()) { await page.getByRole("button", { name: "Open the briefing" }).click(); await page.getByText("Tonight so far").waitFor(); }
  await shot("briefing");
  // 06:40 after the shift: the morning call.
  await page.clock.setSystemTime(new Date("2026-10-13T06:40:00-05:00"));
  await page.reload(); await page.waitForTimeout(1500);
  await page.getByRole("heading", { name: "Train or sleep?" }).waitFor();
  await shot("recover-morning-call");
  await page.getByRole("button", { name: /^SLEEP FIRST/ }).click();
  await page.getByText(/^Not today\./).waitFor();
  await shot("recover-answered");
  // Thu Oct 15 09:05: the lived day of Wed Oct 14, a day off. The wake card.
  await page.clock.setSystemTime(new Date("2026-10-15T09:05:00-05:00"));
  await page.reload(); await page.waitForTimeout(1500);
  await page.getByRole("heading", { name: /today\?$/ }).waitFor();
  await shot("off-wake-card");
  results.push({ width, errors });
  await ctx.close();
}
await writeFile(`${OUT}acceptance.json`, JSON.stringify(results, null, 2));
const problems = results.filter((r) => r.overflow || (r.axe && r.axe.length) || (r.errors && r.errors.length));
console.log(problems.length ? JSON.stringify(problems, null, 1) : "TONIGHT-001 acceptance: no overflow, no axe violations, no page errors.");
if (problems.length) process.exitCode = 1;
await browser.close();
