import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { endDay, logProtein, logSleep, logWater, startDay, submitCheckIn } from "../../src/application/commands";
import { seedRotation } from "./helpers/rotation";
import { db } from "../../src/persistence/db";

/**
 * FIELD-REHEARSAL: eight weeks of the owner's own rotation, written through the app's real commands,
 * then the whole suit walked at phone width: TODAY and every cave view in DATA. Each must render with
 * no page error, no horizontal overflow and no axe violation. The closest thing to field use a test can be.
 */
const SHOTS = import.meta.env.VITE_REHEARSAL_SHOTS as string | undefined;
beforeEach(async () => {
  (globalThis as { __beyondShiftChange?: boolean }).__beyondShiftChange = true;
  await seedRotation();
}, 120_000);
afterEach(() => { cleanup(); vi.useRealTimers(); });

/** Three moments of the owner's rotation (Week A: Tue Oct 27 is a work day, Wed Oct 28 is off). */
const MOMENTS = {
  // 75 minutes before the shift: PREFLIGHT owns the band.
  preflight: async () => {
    vi.setSystemTime(new Date(2026, 9, 27, 16, 35)); const today = await startDay();
    vi.setSystemTime(new Date(2026, 9, 27, 16, 40)); await logSleep(today.id, 285);
    vi.setSystemTime(new Date(2026, 9, 27, 16, 45));
  },
  // On shift at 21:00, behind on fuel and water.
  onShift: async () => {
    vi.setSystemTime(new Date(2026, 9, 27, 16, 35)); const today = await startDay();
    vi.setSystemTime(new Date(2026, 9, 27, 16, 40)); await logSleep(today.id, 285);
    vi.setSystemTime(new Date(2026, 9, 27, 19)); await logWater(today.id, 24);
    vi.setSystemTime(new Date(2026, 9, 27, 21));
  },
  // SHIFT-CHANGE-001: the last half hour of the shift, and just after it.
  landing: async () => {
    vi.setSystemTime(new Date(2026, 9, 27, 16, 35)); const today = await startDay();
    vi.setSystemTime(new Date(2026, 9, 27, 16, 40)); await logSleep(today.id, 285);
    vi.setSystemTime(new Date(2026, 9, 27, 23)); await logWater(today.id, 40);
    vi.setSystemTime(new Date(2026, 9, 28, 5, 30));
  },
  secured: async () => {
    vi.setSystemTime(new Date(2026, 9, 27, 16, 35)); const today = await startDay();
    vi.setSystemTime(new Date(2026, 9, 27, 16, 40)); await logSleep(today.id, 285);
    vi.setSystemTime(new Date(2026, 9, 27, 23)); await logWater(today.id, 40);
    vi.setSystemTime(new Date(2026, 9, 28, 2)); await logProtein(today.id, 45);
    vi.setSystemTime(new Date(2026, 9, 28, 6, 30));
  },
  // The first day off after the shift, at 11:00.
  dayOff: async () => {
    vi.setSystemTime(new Date(2026, 9, 27, 16, 35)); const shift = await startDay();
    vi.setSystemTime(new Date(2026, 9, 27, 16, 40)); await logSleep(shift.id, 300);
    vi.setSystemTime(new Date(2026, 9, 28, 16, 25)); await endDay(shift.id);
    vi.setSystemTime(new Date(2026, 9, 28, 16, 35)); const off = await startDay();
    vi.setSystemTime(new Date(2026, 9, 28, 16, 40)); await logSleep(off.id, 470);
    vi.setSystemTime(new Date(2026, 9, 28, 16, 45)); await submitCheckIn(off.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    vi.setSystemTime(new Date(2026, 9, 29, 11));
  },
} as const;

const overflow = () => document.documentElement.scrollWidth > window.innerWidth;
async function axeClean() {
  const result = await axe.run(document.body, { runOnly: ["wcag2a", "wcag2aa"] });
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}
async function shot(name: string) { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` }); }

it.each([
  ["preflight", 360], ["onShift", 360], ["landing", 360], ["secured", 360], ["dayOff", 360], ["secured", 390],
] as const)("walks TODAY and the whole cave, %s at %ipx, on eight weeks of rotation", async (moment, width) => {
  await MOMENTS[moment]();
  await page.viewport(width, 800);
  const errors: string[] = [];
  const onError = (e: ErrorEvent) => errors.push(e.message);
  window.addEventListener("error", onError);
  expect(await db.beyondDays.count()).toBe(moment === "dayOff" ? 58 : 57);
  try { localStorage.removeItem("beyond.shiftChange"); } catch { /* none */ }
  const screen = await render(<App />);
  await expect.element(screen.getByRole("button", { name: "DATA", exact: true })).toBeVisible();
  await new Promise((done) => setTimeout(done, 400));
  // SHIFT-CHANGE-001: the end of the shift takes the screen once; nowhere else.
  const moment_ = screen.getByRole("dialog", { name: /^(Preflight|Landing|Shift secured)\./ });
  if (moment === "preflight") {
    // PREFLIGHT: the 90 minutes before the shift; STARTED WORK right in the moment, one tap, logged.
    await expect.element(moment_).toBeVisible();
    await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)));
    expect(overflow(), "preflight overflows").toBe(false);
    expect(await axeClean(), "preflight").toEqual([]);
    await shot(`${moment}-shift-change-${width}`);
    const events = await db.events.count();
    await moment_.getByRole("button", { name: "STARTED WORK", exact: true }).click();
    await expect.element(moment_).not.toBeInTheDocument();
    await expect.element(screen.getByText("ON THE CLOCK · 16:45", { exact: true })).toBeVisible();
    expect(await db.events.count()).toBe(events + 1);
  } else if (moment === "landing" || moment === "secured") {
    await expect.element(moment_).toBeVisible();
    await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)));
    expect(overflow(), "shift change overflows").toBe(false);
    expect(await axeClean(), "shift change").toEqual([]);
    await shot(`${moment}-shift-change-${width}`);
    await screen.getByRole("button", { name: "CONTINUE", exact: true }).click();
    await expect.element(moment_).not.toBeInTheDocument();
  } else {
    expect(document.querySelector(".shift-change")).toBeNull();
  }
  expect(overflow()).toBe(false);
  // SUIT-VOLUME-001 at runtime: one accented suit band at most, and nothing still moving once settled.
  await expect.poll(() => document.querySelector(".comms-line"), { timeout: 5000 }).not.toBeNull();
  expect(document.querySelectorAll(".comms-line--off, .brief-line--late").length).toBeLessThanOrEqual(1);
  await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)));
  expect(document.getAnimations().filter((a) => a.playState === "running").map((a) => (a as CSSAnimation).animationName ?? "?")).toEqual([]);
  expect(await axeClean(), "TODAY").toEqual([]);
  await shot(`${moment}-today-${width}`);
  // SHIFT-CHANGE-001: one tap and it's logged — offered around the start, gone mid-shift and off.
  // The shift line: STARTED WORK around the start, WORK ENDED from 2 hours before the end until tapped,
  // nothing mid-shift or on a day off.
  const shiftButton = document.querySelector(".work-start__go")?.textContent ?? null;
  // REAL-DATA-001: after the shift, SHIFT DOWN's MARK WORK ENDED is the one end button, never two.
  expect(shiftButton).toBe(moment === "landing" ? "WORK ENDED" : null);
  if (moment === "secured") expect([...document.querySelectorAll("button")].filter((b) => /WORK ENDED$/.test(b.textContent?.trim() ?? "") && b.getClientRects().length).length).toBeLessThanOrEqual(1);
  // OWNER-GO-001: LOG is the middle of the bottom bar on every screen; nothing floats over TODAY.
  const settle = async () => { await new Promise((done) => setTimeout(done, 80)); await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))); };
  expect(document.querySelector(".cc-fab"), "no floating LOG").toBeNull();
  expect(document.querySelector(".shell-nav")!.contains(screen.getByRole("button", { name: "Open LOG" }).element())).toBe(true);
  window.scrollTo(0, 0); await settle();
  await screen.getByRole("button", { name: "DATA", exact: true }).click();
  for (const tab of ["lead", "tonight", "route", "brief", "vitals", "file", "log"]) {
    const button = document.querySelector<HTMLButtonElement>(`[data-cave-tab="${tab}"]`);
    expect(button, tab).not.toBeNull();
    button!.click();
    await expect.poll(() => document.querySelector(".cave [role=status]")?.textContent === "Reading…", { timeout: 5000 }).toBe(false);
    // Judge the settled screen: the brief's rows stamp in one after another.
    await new Promise((done) => setTimeout(done, 100));
    await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)));
    expect(overflow(), `${tab} overflows`).toBe(false);
    expect(await axeClean(), tab).toEqual([]);
    await shot(`${moment}-cave-${tab}-${width}`);
    // A day is only ever painted off-normal against the band of its own kind.
    if (tab === "vitals") expect(document.querySelectorAll(`.cave__bar--off:not([data-kind="${moment === "dayOff" ? "OFF" : "WORK"}"])`)).toHaveLength(0);
  }
  // TRAIN (the room that may be loudest) and MORE settle too.
  for (const tab of ["TRAIN", "MORE"]) {
    await screen.getByRole("button", { name: tab, exact: true }).click();
    await new Promise((done) => setTimeout(done, 300));
    await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)));
    expect(overflow(), `${tab} overflows`).toBe(false);
    expect(await axeClean(), tab).toEqual([]);
    await shot(`${moment}-${tab.toLowerCase()}-${width}`);
  }
  window.removeEventListener("error", onError);
  expect(errors).toEqual([]);
}, 60_000);
