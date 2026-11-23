import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { logBodyweight, startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";

/**
 * GRAYSON-TRAIN-PROGRESS-001: TRAIN → PROGRESS, read only, at phone widths. Eight weeks of bench and pulldown
 * sessions (stronger in the last four) and a falling bodyweight make it WORKING; nothing is written by reading it.
 * VITE_WALKTHROUGH_SHOTS=<dir> saves screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const now = new Date(2026, 10, 23, 12);
const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(now.getTime() - 60 * 86_400_000));
  const old = await startDay();
  await logBodyweight(old.id, 212);
  vi.setSystemTime(now);
  const day = await startDay();
  await logBodyweight(day.id, 205);
  let n = 0;
  for (const ago of [54, 50, 46, 42, 38, 34, 26, 22, 18, 14, 10, 6, 2]) {
    const recent = ago < 28;
    const id = `s${n++}`;
    await db.workoutSessions.add({ id, schemaVersion: 1, beyondDayId: day.id, templateId: "A", sessionType: "STANDARD", status: "COMPLETED", startedAt: at(ago), endedAt: at(ago) });
    await db.performedSets.bulkAdd([
      { id: `${id}-b`, beyondDayId: day.id, sessionId: id, exerciseId: "barbell-bench-press", setNumber: 1, weight: recent ? 140 : 130, reps: 6, skipped: false, recordedAt: at(ago) },
      { id: `${id}-p`, beyondDayId: day.id, sessionId: id, exerciseId: "lat-pulldown", setNumber: 1, weight: recent ? 125 : 120, reps: 10, skipped: false, recordedAt: at(ago) },
    ]);
  }
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

for (const width of [320, 360, 412]) {
  it(`${width} px: PROGRESS reads WORKING with its evidence, unknowns named, nothing written`, async () => {
    await page.viewport(width, 900);
    const before = { events: await db.events.count(), sessions: await db.workoutSessions.count() };
    const screen = await render(<TrainScreen />);
    await screen.getByRole("group", { name: "Training views" }).getByRole("button", { name: "PROGRESS", exact: true }).click();
    const panel = screen.getByRole("region", { name: "Progress" });
    await expect.element(panel.getByRole("heading", { name: "WORKING", exact: true })).toBeVisible();
    await expect.element(panel.getByText(/doesn't prove muscle was gained/)).toBeVisible();
    await expect.element(panel.getByText("BEYOND doesn't record this test yet.")).toBeVisible();
    await expect.element(panel.getByText(/7 finished sessions in the last 4 weeks \(FULL 7\)/)).toBeVisible();
    expect(panel.element().textContent).not.toMatch(/streak|missed|fail|behind|grew/i);
    expect([...panel.element().querySelectorAll("button")].some((b) => getComputedStyle(b).backgroundColor === "rgb(208, 20, 27)")).toBe(false);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    expect((await axe.run(panel.element(), { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
    await panel.getByText("WHY?").click();
    await expect.element(panel.getByText(/Strength across 2 comparable lifts/)).toBeVisible();
    if (SHOTS) { await page.viewport(width, Math.ceil(document.documentElement.scrollHeight)); await new Promise((r) => setTimeout(r, 200)); await page.screenshot({ path: `${SHOTS}/${width}-train-progress.png`, element: panel }); }
    expect({ events: await db.events.count(), sessions: await db.workoutSessions.count() }).toEqual(before);
  });
}

it("an active sequence whose next session is unknown says so, never 'no sequence' (review on #625)", async () => {
  const { createCustomTemplateSet } = await import("../../src/application/customTemplateCommands");
  const { saveTrainingProgramme } = await import("../../src/application/trainingProgramme");
  const { buildSequenceProgramme } = await import("../../src/application/trainingProgrammeQueries");
  const { WORKOUT_TEMPLATES } = await import("../../src/domain/workout/types");
  const t = await createCustomTemplateSet((["P A", "P B", "P C"] as const).map((name, i) => ({ name, exercises: WORKOUT_TEMPLATES[(["A", "B", "C"] as const)[i]!]!.exercises })));
  await saveTrainingProgramme(buildSequenceProgramme([t[0]!.id, t[1]!.id, t[2]!.id], t), null);
  // A later workout outcome with no usable payload: the programme can't name the next member.
  await db.events.add({ id: "broken-outcome", type: "WORKOUT_COMPLETED", occurredAt: now.toISOString(), recordedAt: now.toISOString(), payload: {}, source: "USER", correlationId: "broken-outcome", seq: 999_999 } as never);
  await page.viewport(360, 900);
  const screen = await render(<TrainScreen />);
  await screen.getByRole("group", { name: "Training views" }).getByRole("button", { name: "PROGRESS", exact: true }).click();
  const panel = screen.getByRole("region", { name: "Progress" });
  await expect.element(panel.getByText(/Next in your A → B → C is unknown: A workout outcome is incomplete/)).toBeVisible();
  expect(panel.element().textContent).not.toContain("No A → B → C sequence active");
});
