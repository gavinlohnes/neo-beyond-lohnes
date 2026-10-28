import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { commands, page } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { logSleep, logWater, startDay, submitCheckIn } from "../../src/application/commands";
import { seedRotation } from "./helpers/rotation";

/**
 * AUDIT (on demand, not part of the gate; run with VITE_AUDIT_SHOTS=$PWD/.cache/audit): every screen BEYOND has, opened on eight weeks of the
 * owner's rotation at 360px. Records page errors, overflow and axe violations per screen without
 * stopping, and saves a full-page screenshot of each when VITE_AUDIT_SHOTS is set.
 */
const SHOTS = import.meta.env.VITE_AUDIT_SHOTS as string | undefined;
const run = it.runIf(!!SHOTS);
const findings: { screen: string; overflow: boolean; axe: string[]; errors: string[]; text: string }[] = [];
let errors: string[] = [];

beforeEach(async () => {
  (globalThis as { __beyondShiftChange?: boolean }).__beyondShiftChange = false;
  await seedRotation();
  vi.setSystemTime(new Date(2026, 9, 27, 16, 35)); const day = await startDay();
  vi.setSystemTime(new Date(2026, 9, 27, 16, 40)); await logSleep(day.id, 300);
  vi.setSystemTime(new Date(2026, 9, 27, 16, 45)); await submitCheckIn(day.id, { energy: 3, stress: 3, mood: 3, soreness: 2, alcoholUrge: 0 });
  vi.setSystemTime(new Date(2026, 9, 27, 19)); await logWater(day.id, 24);
  vi.setSystemTime(new Date(2026, 9, 27, 21));
  await page.viewport(360, 800);
}, 120_000);
afterEach(() => { cleanup(); vi.useRealTimers(); });

const wait = (ms: number) => new Promise((d) => setTimeout(d, ms));
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
async function record(name: string) {
  await wait(500);
  await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)));
  const result = await axe.run(document.body, { runOnly: ["wcag2a", "wcag2aa"] });
  findings.push({
    screen: name, overflow: document.documentElement.scrollWidth > window.innerWidth,
    axe: result.violations.flatMap((v) => v.nodes.map((n) => `${v.id}: ${n.target.join(" ")} — ${(n.any[0]?.message ?? "").slice(0, 140)}`)), errors: [...errors],
    text: (document.querySelector("main, #root, body") as HTMLElement).innerText.replace(/\s+/g, " ").slice(0, 400),
  });
  errors = [];
  const f = findings.at(-1)!;
  console.log(`AUDIT|${f.screen}|${f.overflow ? "OVERFLOW" : ""}|${f.axe.join(",")}|${f.errors.join(";")}`);
  if (SHOTS) {
    // A real phone screen, scrolled: tall viewports get scaled down by the runner.
    const pages = Math.min(5, Math.ceil(document.documentElement.scrollHeight / 760));
    for (let i = 0; i < pages; i++) {
      window.scrollTo(0, i * 760); await wait(120);
      await page.screenshot({ path: `${SHOTS}/${String(findings.length).padStart(3, "0")}-${slug(name)}-${i + 1}.png` });
    }
    window.scrollTo(0, 0);
  }
}
const visible = (b: HTMLElement) => b.getClientRects().length > 0 && getComputedStyle(b).visibility !== "hidden" && !b.closest("[hidden]");
const buttons = (root: ParentNode = document) => [...root.querySelectorAll<HTMLButtonElement>("button")].filter((b) => visible(b) && !b.disabled);
const click = async (b: HTMLElement) => { b.click(); await wait(400); };
async function closeSheets() {
  for (let i = 0; i < 3; i++) {
    const close = [...document.querySelectorAll<HTMLButtonElement>("dialog[open] button, [role=dialog] button")].find((x) => visible(x) && /^(CLOSE|CANCEL|DONE)$/i.test(x.textContent?.trim() ?? ""));
    if (!close) break;
    close.click(); await wait(300);
  }
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); await wait(100);
}
const tabButton = (name: string) => [...document.querySelectorAll<HTMLButtonElement>("button")].filter((b) => visible(b)).reverse().find((b) => b.textContent?.trim() === name);
const tab = (name: string) => ({ click: async () => { await closeSheets(); tabButton(name)?.click(); await wait(400); } });

run("audits every screen on eight weeks of rotation", async () => {
  const onError = (e: ErrorEvent) => errors.push(e.message);
  window.addEventListener("error", onError);
  await render(<App />);
  await wait(1200);
  await record("TODAY");

  // Every LOG sheet target (the sheet's own list only; never stealth).
  const openLog = async () => { const b = buttons().find((x) => x.getAttribute("aria-label") === "Open LOG"); if (b) await click(b); };
  const sheet = () => [...document.querySelectorAll<HTMLElement>("dialog[open], [role=dialog]")].find((d) => visible(d)) ?? null;
  await openLog(); await record("LOG sheet");
  const targets = sheet() ? buttons(sheet()!).map((b) => b.textContent?.trim() ?? "").filter((t) => t && !/CLOSE|stealth/i.test(t)) : [];
  for (const target of targets) {
    const closeAll = buttons().find((x) => /^CLOSE$/i.test(x.textContent?.trim() ?? "")); if (closeAll) await click(closeAll);
    await openLog();
    const b = sheet() && buttons(sheet()!).find((x) => x.textContent?.trim() === target);
    if (!b) continue;
    await click(b); await record(`LOG › ${target}`);
  }
  { const closeAll = buttons().find((x) => /^CLOSE$/i.test(x.textContent?.trim() ?? "")); if (closeAll) await click(closeAll); }
  await (tab("TODAY")).click();

  // MORE: open every group, visit every entry.
  await (tab("MORE")).click();
  const openGroups = () => document.querySelectorAll<HTMLDetailsElement>("details.command-group").forEach((d) => { d.open = true; });
  openGroups(); await wait(200);
  await record("MORE (all groups open)");
  const entries = [...new Set(buttons().filter((b) => b.closest("details.command-group")).map((b) => b.textContent?.trim() ?? "").filter(Boolean))];

  for (const entry of entries) {
    await (tab("MORE")).click(); await (tab("MORE")).click();
    const back = buttons().find((x) => /^BACK TO MORE$/i.test(x.textContent?.trim() ?? "")); if (back) await click(back);
    openGroups(); await wait(150);
    const b = buttons().find((x) => x.closest("details.command-group") && x.textContent?.trim() === entry);
    if (!b) continue;
    await click(b); await record(`MORE › ${entry}`);
  }


  // TRAIN and its views.
  await (tab("TRAIN")).click(); await record("TRAIN");
  for (const name of ["HISTORY", "RECORDS", "WORKOUT"]) {
    const b = buttons().find((x) => x.textContent?.trim() === name);
    if (b) { await click(b); await record(`TRAIN › ${name}`); }
  }
  const startWorkout = buttons().find((x) => x.textContent?.trim() === "START WORKOUT");
  if (startWorkout) {
    await click(startWorkout);
    const proceed = buttons().find((x) => x.textContent?.trim() === "PROCEED ANYWAY"); if (proceed) await click(proceed);
    await record("TRAIN › workout in progress");
  }

  // DATA: NUMBERS and every button on it, then every cave view.
  await (tab("DATA")).click(); await (tab("DATA")).click(); await record("DATA › NUMBERS");
  const numbersButtons = buttons(document.querySelector(".cave__lead-view") ?? document).map((b) => b.textContent?.trim() ?? "").filter(Boolean);
  for (const label of [...new Set(numbersButtons)].slice(0, 30)) {
    await (tab("DATA")).click(); await (tab("DATA")).click();
    const b = buttons(document.querySelector(".cave__lead-view") ?? document).find((x) => x.textContent?.trim() === label);
    if (!b) continue;
    await click(b); await record(`DATA › ${label}`);
  }

  window.removeEventListener("error", onError);
  if (SHOTS) await commands.writeFile(`${SHOTS}/findings.json`, JSON.stringify(findings, null, 1));
  expect(findings.length).toBeGreaterThan(10);
}, 600_000);
