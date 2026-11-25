import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { db } from "../../src/persistence/db";
import { createRoutine, getRoutines, setRoutineStep } from "../../src/application/routineCommands";
import { noteShiftHandoff } from "../../src/application/commands";
import { seedRotation } from "./helpers/rotation";

/**
 * GRAYSON C2.1 (Gavin, 2026-11-23: "1, yes 2 yes"): PREFLIGHT shows last shift's note and the one easy-to-forget
 * BEFORE SHIFT step; STARTED WORK marks work started and the note read in one tap. On eight weeks of his rotation.
 * VITE_WALKTHROUGH_SHOTS=<dir> saves screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const t = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m);

beforeEach(async () => {
  (globalThis as { __beyondShiftChange?: boolean }).__beyondShiftChange = true;
  localStorage.clear();
  await seedRotation();
  // His BEFORE SHIFT routine, done on four recent work days, the duty-belt check passed over on three.
  const r = await createRoutine({ title: "Before shift", moment: "BEFORE_SHIFT", steps: ["Pack lunch", "Duty belt check", "Fill bottle"] });
  const steps = (await getRoutines()).find((x) => x.id === r.id)!.steps;
  const recent = (await db.beyondDays.toArray()).filter((d) => d.workContext === "WORK").sort((a, b) => a.startedAt.localeCompare(b.startedAt)).slice(-4);
  for (const [i, d] of recent.entries()) {
    await setRoutineStep(d.id, r.id, steps[0]!.id, true);
    await setRoutineStep(d.id, r.id, steps[2]!.id, true);
    if (i === 0) await setRoutineStep(d.id, r.id, steps[1]!.id, true);
  }
  await noteShiftHandoff(recent.at(-1)!.id, "Car 12 radio cuts out. Swap before patrol.");
}, 120_000);
afterEach(() => { cleanup(); vi.useRealTimers(); });

for (const width of [320, 360, 412]) {
  it(`${width} px: PREFLIGHT shows last shift's note and the one thing to remember; STARTED WORK clears both`, async () => {
    await page.viewport(width, 800);
    vi.setSystemTime(t(27, 16, 45));
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "START DAY", exact: true }).click();
    await screen.getByRole("button", { name: "ENTER TODAY" }).click();
    const preflight = screen.getByRole("dialog", { name: /^Preflight\./ });
    await expect.element(preflight.getByText(/Car 12 radio cuts out\. Swap before patrol\./)).toBeVisible();
    await expect.element(preflight.getByText(/Duty belt check/)).toBeVisible();
    // ROUTINES-001: no counts, no "missed".
    expect(preflight.element().textContent).not.toMatch(/missed|skipped|\d+ (times|days)/i);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    expect((await axe.run(preflight.element(), { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
    if (SHOTS) { await new Promise((r) => setTimeout(r, 600)); await page.screenshot({ path: `${SHOTS}/${width}-preflight-arrival.png` }); }
    await preflight.getByRole("button", { name: "STARTED WORK", exact: true }).click();
    await expect.poll(async () => db.events.where("type").equals("SHIFT_HANDOFF_READ").count()).toBe(1);
    await expect.poll(async () => db.events.where("type").equals("WORK_PERIOD_STARTED").count()).toBeGreaterThan(0);
  });
}
