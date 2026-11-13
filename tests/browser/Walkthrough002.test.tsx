import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { startDay } from "../../src/application/commands";
import { confirmScheduleException } from "../../src/application/scheduleExceptions";
import { seedRotation } from "./helpers/rotation";

/**
 * WALKTHROUGH-002 (Gavin, 2026-11-13, "Walkthrough"): the whole app at 360 × 800 on eight weeks of the owner's
 * rotation, through the surfaces #499–#503 added: TODAY's NOW · NEXT with a confirmed change, WEEK AHEAD in place,
 * a MOVE preview, the SINCE line on the next visit, the header's shift run, and 09:00 before the 16:30 start.
 * Every stop: no horizontal overflow, axe AA clean. Screenshots only when VITE_WALKTHROUGH_SHOTS is set.
 * Week of Mon Oct 26 2026 is a Week A: Mon/Tue work, Wed 28/Thu 29 off, Fri–Sun work.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const t = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m);

beforeEach(async () => { await seedRotation(); await page.viewport(360, 800); }, 120_000);
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

const settle = async () => { await new Promise((done) => setTimeout(done, 400)); await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))); };
async function stop(label: string, el?: Element | null) {
  await settle();
  expect(document.documentElement.scrollWidth > window.innerWidth, `${label} overflows`).toBe(false);
  const result = await axe.run(document.body, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
  // The app scrolls inside its shell, so a part below the fold is shot as an element.
  if (SHOTS) await page.screenshot(el ? { path: `${SHOTS}/${label}.png`, element: el } : { path: `${SHOTS}/${label}.png` });
}
const band = () => document.querySelector("[aria-label='Operating state']");
const text = (sel: string) => document.querySelector(sel)?.textContent ?? null;

it("walks a night-shift stretch with a confirmed change through TODAY, Week Ahead and the header", async () => {
  try { localStorage.clear(); } catch { /* ignore */ }
  vi.setSystemTime(t(27, 9));
  await confirmScheduleException({ date: "2026-10-29", kind: "WORK", note: "Covering a shift" });

  // 1. Tue 17:10, shift 2 of 2: NOW, NEXT and the header's run.
  vi.setSystemTime(t(27, 17, 10));
  await startDay();
  let screen = await render(<App />);
  await expect.poll(() => text("[data-life-next]")).toBe("NEXT Day off: Wed, Oct 28 · forecast · 1 confirmed change ahead");
  await stop("01-today-work-run-next");
  // 2. WEEK AHEAD in place.
  await screen.getByRole("button", { name: "WEEK AHEAD · 1 CONFIRMED" }).click();
  const list = screen.getByRole("region", { name: "Confirmed schedule changes" });
  await expect.element(list.getByText("Thu, Oct 29: overtime (work)")).toBeVisible();
  // Finding 2 (fixed here): the week used to open below the fold on a work day; it now comes into view.
  await expect.poll(() => { const r = document.getElementById("today-week-ahead")!.getBoundingClientRect(); return r.top > -2 && r.top < window.innerHeight / 2; }).toBe(true);
  await stop("02-today-week-ahead-open", document.getElementById("today-week-ahead"));
  // 3. MOVE preview (nothing saved).
  await list.getByRole("button", { name: "MOVE" }).click();
  await expect.element(list.getByRole("combobox", { name: "Move to" })).toBeVisible();
  await stop("03-move-preview", document.querySelector("[aria-label='Confirmed schedule changes']"));
  await list.getByRole("button", { name: "BACK" }).click();
  await cleanup();

  // 4. Wed 17:05, the next lived day: one day off between runs (RECOVERY), with SINCE leading the band.
  vi.setSystemTime(t(28, 17, 5));
  await startDay();
  screen = await render(<App />);
  await expect.poll(() => band()?.getAttribute("data-life-state")).toBe("RECOVERY");
  await expect.poll(() => text("[data-life-since]")).toMatch(/^SINCE TUE 17:1\d /);
  console.log("SINCE:", text("[data-life-since]"), "| LINE:", text(".today-life-state__line"), "| NEXT:", text("[data-life-next]"));
  await stop("04-today-recovery-since");
  // 5. The header's presence line on another screen counts the confirmed shift.
  await screen.getByRole("navigation").getByRole("button", { name: "TRAIN", exact: true }).click();
  await expect.poll(() => text(".cc-presence")).toContain("day off 1 of 1 · back on Thu · with a confirmed change");
  console.log("HEADER:", text(".cc-presence"));
  await stop("05-train-header-run");
  await cleanup();

  // 6. Thu 09:00, still Wednesday's lived day: tonight's confirmed shift is next.
  vi.setSystemTime(t(29, 9));
  screen = await render(<App />);
  await expect.poll(() => text("[data-life-next]")).toBe("NEXT Shift: Thu, Oct 29 · 18:00 · confirmed change");
  await stop("06-today-before-1630");
});
