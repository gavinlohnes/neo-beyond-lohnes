import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { db } from "../../src/persistence/db";
import { archiveCustomTemplate, createCustomTemplate } from "../../src/application/customTemplateCommands";
import { buildSequenceProgramme, getProgrammeView } from "../../src/application/trainingProgrammeQueries";
import { saveTrainingProgramme } from "../../src/application/trainingProgramme";
import { WORKOUT_TEMPLATES } from "../../src/domain/workout/types";
import { updateSchedulePattern } from "../../src/application/commands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { WeekAheadView } from "../../src/ui/screens/weekly/WeekAheadView";
import { PlanTodayScreen } from "../../src/ui/screens/more/PlanTodayScreen";
import "../../src/ui/screens/more/operator.css";

const now = new Date(2026, 10, 14, 12);
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;

async function seedSequence() {
  const { id: _id, createdAt: _created, updatedAt: _updated, ...pattern } = DEFAULT_SCHEDULE_PATTERN;
  await updateSchedulePattern(pattern);
  const templates = await Promise.all((["Bench foundation", "Pull and posterior", "Balanced strength"] as const).map((name, index) => createCustomTemplate({
    name,
    exercises: WORKOUT_TEMPLATES[["A", "B", "C"][index] as "A" | "B" | "C"]!.exercises,
  })));
  await saveTrainingProgramme(buildSequenceProgramme([templates[0]!.id, templates[1]!.id, templates[2]!.id], templates, templates[1]!.id), null);
  return templates;
}

async function shot(name: string, element: HTMLElement = document.body) {
  if (!SHOTS) return;
  for (const animation of document.getAnimations()) animation.finish();
  await page.screenshot({ path: `${SHOTS}/${name}.png`, element });
}

beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(now); await page.viewport(360, 850); await seedSequence(); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

it("shows the same evidenced next member on Week Ahead opportunities without booking or advancing it", async () => {
  const events = await db.events.count();
  const screen = await render(<WeekAheadView now={now} />);
  await expect.element(screen.getByText("ACTIVE SEQUENCE", { exact: true })).toBeVisible();
  await expect.element(screen.getByText("NEXT · B — Pull and posterior", { exact: true })).toBeVisible();
  await expect.element(screen.getByText(/Sequence activated with B selected first/)).toBeVisible();
  expect(screen.getByText(/Training opportunity · Next B/).elements().length).toBeGreaterThan(0);
  expect(screen.getByText(/Suggested workout/).elements()).toHaveLength(0);
  expect((await getProgrammeView()).sequence?.nextMember?.key).toBe("B");
  expect(await db.events.count()).toBe(events);
  expect((await axe.run(screen.container, { rules: { region: { enabled: false } } })).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  await shot("week-ahead-360");
});

it.each([320, 412])("shows the same connection in Week Planner at %spx without changing programme state", async (width) => {
  await page.viewport(width, 850);
  const events = await db.events.count();
  const screen = await render(<div className="screen more-operator"><PlanTodayScreen onOpen={() => {}} /></div>);
  await screen.getByRole("button", { name: "Week planner", exact: true }).click();
  await expect.poll(() => screen.container.querySelectorAll(".week-planner__day").length).toBe(7);
  const opportunity = screen.getByText("Next B", { exact: true }).first();
  await expect.element(opportunity).toBeVisible();
  const button = opportunity.element().closest("button") as HTMLButtonElement;
  button.click();
  await expect.element(screen.getByText("Training opportunity · Next B · Pull and posterior", { exact: true })).toBeVisible();
  await expect.element(screen.getByText(/Moving or skipping this opportunity changes nothing/)).toBeVisible();
  expect((await getProgrammeView()).sequence?.nextMember?.key).toBe("B");
  expect(await db.events.count()).toBe(events);
  expect((await axe.run(screen.container, { rules: { region: { enabled: false } } })).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  if (width === 320) await shot("week-planner-320", screen.container.querySelector("[data-training-planning-connection]") as HTMLElement);
});

it("abstains in Week Ahead when a confirmed member changes and leaves direct resolution to TRAIN", async () => {
  const view = await getProgrammeView();
  const member = view.sequence!.members.find((item) => item.key === "B")!;
  await archiveCustomTemplate(member.templateId);
  const events = await db.events.count();
  const screen = await render(<WeekAheadView now={now} />);
  await expect.element(screen.getByText("NEXT SESSION NEEDS REVIEW IN TRAIN", { exact: true })).toBeVisible();
  expect(screen.getByText(/Training opportunity · Review sequence in TRAIN/).elements().length).toBeGreaterThan(0);
  expect(screen.getByText(/Training opportunity · Next/).elements()).toHaveLength(0);
  expect((await getProgrammeView()).sequence?.status).toBe("REVIEW_REQUIRED");
  expect(await db.events.count()).toBe(events);
});
