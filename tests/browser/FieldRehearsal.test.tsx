import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { endDay, logBodyweight, logProtein, logSleep, logWater, startDay, submitCheckIn, updateSchedulePattern } from "../../src/application/commands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

/**
 * FIELD-REHEARSAL: eight weeks of the owner's own rotation, written through the app's real commands,
 * then the whole suit walked at phone width: TODAY and every cave view in DATA. Each must render with
 * no page error, no horizontal overflow and no axe violation. The closest thing to field use a test can be.
 */
const SHOTS = import.meta.env.VITE_REHEARSAL_SHOTS as string | undefined;
let r = 7;
const rand = () => { r = (r * 16807) % 2147483647; return (r - 1) / 2147483646; };
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
const at = (d: Date, h: number, m = 0) => { const t = new Date(d); t.setHours(h, m, 0, 0); return t; };

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  const { id: _id, createdAt: _c, updatedAt: _u, ...schedule } = DEFAULT_SCHEDULE_PATTERN;
  vi.setSystemTime(new Date(2026, 8, 1, 16, 31));
  await updateSchedulePattern(schedule);
  for (let i = 0; i < 56; i++) {
    const d = new Date(2026, 8, 1 + i);
    vi.setSystemTime(at(d, 16, 35));
    const day = await startDay();
    const work = day.workContext === "WORK";
    vi.setSystemTime(at(d, 16, 40));
    await logSleep(day.id, Math.round(work ? between(290, 400) : between(410, 520)));
    vi.setSystemTime(at(d, 16, 45));
    const energy = Math.max(1, Math.min(5, Math.round(work ? between(2, 4.4) : between(3, 5)))) as 1 | 2 | 3 | 4 | 5;
    await submitCheckIn(day.id, { energy, stress: 3, mood: 3, soreness: 1, alcoholUrge: 0 });
    vi.setSystemTime(at(d, 19)); await logWater(day.id, Math.round(between(30, 50)));
    vi.setSystemTime(at(d, 21)); await logProtein(day.id, Math.round(between(60, 90)));
    vi.setSystemTime(at(d, 23, 30)); await logWater(day.id, Math.round(between(30, 60)));
    vi.setSystemTime(at(d, 23, 45)); await logProtein(day.id, Math.round(between(50, 90)));
    if (i % 3 === 0) { vi.setSystemTime(at(d, 23, 50)); await logBodyweight(day.id, Math.round(between(181, 184) * 10) / 10); }
    vi.setSystemTime(at(new Date(2026, 8, 2 + i), 16, 25));
    await endDay(day.id);
  }
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
  const moment_ = screen.getByRole("dialog", { name: /^(Landing|Shift secured)\./ });
  if (moment === "landing" || moment === "secured") {
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
  // The floating LOG never sits on a control you are reading toward: it steps aside while you scroll
  // down, returns when you scroll up, and at the end of TODAY it covers nothing.
  const fab = document.querySelector<HTMLElement>(".cc-fab")!;
  const settle = async () => { await new Promise((done) => setTimeout(done, 80)); await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))); };
  const room = document.documentElement.scrollHeight - window.innerHeight;
  expect(room, "TODAY scrolls").toBeGreaterThan(60);
  window.scrollTo(0, Math.round(room / 2)); await settle();
  expect(fab.classList.contains("cc-fab--away"), "steps aside scrolling down").toBe(true);
  const { left, top, width: w, height: h } = fab.getBoundingClientRect();
  expect(fab.contains(document.elementFromPoint(left + w / 2, top + h / 2)), "no longer takes taps").toBe(false);
  window.scrollTo(0, Math.round(room / 4)); await settle();
  expect(fab.classList.contains("cc-fab--away"), "returns scrolling up").toBe(false);
  window.scrollTo(0, document.documentElement.scrollHeight); await settle();
  expect(fab.classList.contains("cc-fab--away"), "returns at the end").toBe(false);
  const f = fab.getBoundingClientRect();
  const covered = [...document.querySelectorAll<HTMLElement>("#workspace-TODAY button, #workspace-TODAY a")].filter((b) => {
    if (b === fab || b.closest(".tabbar, nav")) return false;
    const r = b.getBoundingClientRect();
    return r.width > 0 && r.left < f.right && r.right > f.left && r.top < f.bottom && r.bottom > f.top;
  }).map((b) => b.textContent?.trim());
  expect(covered, "covered at the end of TODAY").toEqual([]);
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
