/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { updateSchedulePattern } from "../../src/application/commands";
import { createCustomTemplate } from "../../src/application/customTemplateCommands";
import { saveTrainingProgramme } from "../../src/application/trainingProgramme";
import { getProgrammeView } from "../../src/application/trainingProgrammeQueries";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { WORKOUT_TEMPLATES } from "../../src/domain/workout/types";

/**
 * GRAYSON-WEEK-PLAN-001: the brief's phone check in a real browser. TRAIN · THIS WEEK: two weeks on Week A and Week B
 * with work days. USE THIS WEEK. Thursday → B → JUST THIS DAY: Thursday is B, next Thursday is back. A day off → his
 * arms routine → EVERY WEEK B. Now is Wednesday 2 Dec 2026 (Week A). VITE_WALKTHROUGH_SHOTS=<dir> saves screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const settle = (ms = 120) => new Promise<void>((r) => setTimeout(r, ms));
async function shot(name: string, el: Element | null) {
  if (!SHOTS || !el) return;
  await page.screenshot({ path: `${SHOTS}/${name}.png`, element: el as HTMLElement });
}
async function axeClean(label: string, root: Element) {
  const r = await axe.run(root, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}
async function noOverflow(label: string, root: Element, name?: string) {
  for (const width of [320, 360, 412]) {
    await page.viewport(width, SHOTS ? 2000 : 900);
    await settle();
    expect(document.documentElement.scrollWidth, `${label} at ${width}`).toBeLessThanOrEqual(width);
    if (name) await shot(`${width}-${name}`, root);
  }
  await page.viewport(360, 900);
}
const planned = async (d: number) => (await getProgrammeView(new Date(2026, 11, d, 20))).planned.templateId;

beforeEach(async () => {
  await page.viewport(360, 900);
  localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 11, 2, 20, 0));
});
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

describe("GRAYSON-WEEK-PLAN-001 the week in TRAIN", () => {
  it("shows two weeks on Week A and B, USE THIS WEEK, then JUST THIS DAY and EVERY WEEK B with UNDO", async () => {
    await updateSchedulePattern({ anchorMonday: "2026-11-30", weeks: [{ workdays: [1, 2] }, { workdays: [3, 4] }], shiftStartHour: 18, shiftEndHour: 6, postWorkTailHours: 6 });
    await saveTrainingProgramme({ mode: "WEEKDAYS", slots: { "4": "A", "6": "C" } }, null);
    const arms = await createCustomTemplate({ name: "Arms", exercises: WORKOUT_TEMPLATES.C!.exercises.slice(1, 3) });
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "THIS WEEK" }).click();
    const week = () => document.querySelector("[data-week-plan]")!;
    await expect.element(screen.getByRole("group", { name: "THIS WEEK, Week A" })).toBeVisible();
    await expect.element(screen.getByRole("group", { name: "NEXT WEEK, Week B" })).toBeVisible();
    await expect.element(screen.getByText("Today stays Workout A. Your week starts tomorrow.")).toBeVisible();
    expect(screen.getByRole("button", { name: /^Monday Nov 30, work day: Rest/ }).elements()).toHaveLength(1);
    await axeClean("week draft", week());
    await noOverflow("week draft", week(), "week-draft");
    await screen.getByRole("button", { name: "USE THIS WEEK" }).click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Your week is saved.");

    // Thursday → B → JUST THIS DAY (3 taps), by keyboard for the day.
    const thursday = screen.getByRole("button", { name: /^Thursday Dec 3: Workout A\. Change$/ });
    await expect.element(thursday).toBeEnabled();
    (thursday.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(screen.getByRole("heading", { name: "Thursday Dec 3" })).toHaveFocus();
    await axeClean("day editor", document.querySelector("[data-week-day]")!);
    await shot("360-day", document.querySelector("[data-week-day]"));
    await screen.getByRole("radio", { name: "Workout B" }).click();
    await screen.getByRole("button", { name: "JUST THIS DAY" }).click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Thursday Dec 3: Workout B, just this day.");
    await expect.element(screen.getByRole("button", { name: /^Thursday Dec 3: Workout B, just this day\. Change$/ })).toHaveFocus();
    expect(await planned(3)).toBe("B");
    expect(await planned(17)).toBe("A");

    // A day off next week (Week B) → Arms → EVERY WEEK B.
    await screen.getByRole("button", { name: /^Saturday Dec 12: Workout C\. Change$/ }).click();
    await screen.getByRole("radio", { name: "Arms" }).click();
    await screen.getByRole("button", { name: "EVERY WEEK B" }).click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Arms on every Saturday in Week B.");
    expect(await planned(12)).toBe(arms.id);
    expect(await planned(26)).toBe(arms.id);
    expect(await planned(5)).toBe("C");
    await shot("360-week", week());
    await screen.getByRole("button", { name: "UNDO" }).click();
    await expect.poll(() => planned(12)).toBe("C");
  });

  it("MOVE TO in three taps leaves Rest behind; without a schedule it says so", async () => {
    const first = await saveTrainingProgramme({ mode: "WEEKDAYS", slots: { "4": "A" } }, null);
    await saveTrainingProgramme({ mode: "WEEK_PLAN", weeks: [{ "0": "REST", "1": "REST", "2": "REST", "3": "REST", "4": "A", "5": "REST", "6": "REST" }] }, first.id);
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "THIS WEEK" }).click();
    await expect.element(screen.getByText(/Save your work schedule/)).toBeVisible();
    await screen.getByRole("button", { name: /^Thursday Dec 3: Workout A\. Change$/ }).click();
    await screen.getByRole("button", { name: "MOVE TO…" }).click();
    await screen.getByRole("button", { name: /^Sat Dec 5/ }).click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("Workout A moved to Saturday. Thursday is Rest.");
    expect(await planned(5)).toBe("A");
    expect(await planned(3)).toBeNull();
    await noOverflow("week", document.querySelector("[data-week-plan]")!);
  });
});
