import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { App } from "../../src/app/App";
import { startDay, logSleep, submitCheckIn, setWorkContext } from "../../src/application/commands";
import { createMission, createObligation, satisfyObligation } from "../../src/application/intentCommands";
import { createDecisionJournalEntry } from "../../src/application/journalCommands";
import { startWorkout } from "../../src/application/trainCommands";
import { db } from "../../src/persistence/db";
import { openCaptureFromLog } from "./helpers/todayTools";

type Screen = Awaited<ReturnType<typeof render>>;
async function tab(screen: Screen, name: "TODAY" | "TRAIN" | "BODY" | "COMMAND") { await screen.getByRole("button", { name, exact: true }).click(); }
async function manualMeal(screen: Screen) {
  await tab(screen, "BODY");
  await screen.getByRole("button", { name: "OPEN MEALS", exact: true }).click();
  await screen.getByText("SHOW ADD MEAL", { exact: true }).click();
  await screen.getByText("SHOW MANUAL MACROS", { exact: true }).click();
}
beforeEach(async () => { await page.viewport(360, 800); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 13, 22)); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); window.scrollTo(0, 0); });

describe("DAILY-EXPERIENCE-001 continuity", () => {
  it("keeps a directly entered meal across tabs and search without discard or a write", async () => {
    const screen = await render(<App />);
    await manualMeal(screen);
    const input = screen.getByRole("textbox", { name: "New meal name" });
    await input.fill("Unfinished dinner");
    await screen.getByRole("spinbutton", { name: "New meal calories" }).fill("625");
    const confirm = vi.spyOn(window, "confirm");
    await tab(screen, "TODAY");
    await screen.getByRole("button", { name: "Search everything", exact: true }).click();
    await tab(screen, "BODY");
    await expect.element(input).toHaveValue("Unfinished dinner");
    await expect.element(screen.getByRole("spinbutton", { name: "New meal calories" })).toHaveValue(625);
    expect(confirm).not.toHaveBeenCalled();
    expect(await db.savedMeals.count()).toBe(0); expect(await db.events.count()).toBe(0);
  });
  it("keeps sleep input and its open form across a planning detour", async () => {
    const screen = await render(<App />);
    await tab(screen, "BODY"); await screen.getByRole("button", { name: "Open SLEEP", exact: true }).click();
    await screen.getByRole("spinbutton", { name: "Hours", exact: true }).fill("7");
    await screen.getByRole("spinbutton", { name: "Minutes", exact: true }).fill("25");
    await tab(screen, "TODAY"); await screen.getByRole("button", { name: /PLAN TODAY/ }).click();
    await tab(screen, "BODY");
    await expect.element(screen.getByRole("spinbutton", { name: "Hours", exact: true })).toHaveValue(7);
    await expect.element(screen.getByRole("spinbutton", { name: "Minutes", exact: true })).toHaveValue(25);
    expect(await db.events.count()).toBe(0);
  });
  it("keeps an unfinished workout set when leaving and resuming", async () => {
    const day = await startDay(); await startWorkout(day.id, "A", "STANDARD");
    const screen = await render(<App />);
    const reps = screen.getByRole("spinbutton", { name: "Set 1 repetitions", exact: true });
    await reps.fill("9");
    await screen.getByRole("spinbutton", { name: "Set 1 weight in pounds", exact: true }).fill("85");
    await tab(screen, "BODY"); await tab(screen, "TRAIN");
    await expect.element(reps).toHaveValue(9);
    await expect.element(screen.getByRole("spinbutton", { name: "Set 1 weight in pounds", exact: true })).toHaveValue(85);
    expect(await db.performedSets.count()).toBe(0);
  });
  it("keeps Journal creation and review input across tabs", async () => {
    await createDecisionJournalEntry({ title: "Training choice", decision: "Try mornings" });
    const screen = await render(<App />);
    await tab(screen, "COMMAND"); await screen.getByRole("button", { name: "Open DECISION JOURNAL", exact: true }).click();
    await screen.getByRole("button", { name: "RECORD A DECISION", exact: true }).click();
    await screen.getByRole("textbox", { name: "Decision title", exact: true }).fill("An unfinished choice");
    await tab(screen, "BODY"); await tab(screen, "COMMAND");
    await expect.element(screen.getByRole("textbox", { name: "Decision title", exact: true })).toHaveValue("An unfinished choice");
    await screen.getByRole("button", { name: "Open Training choice", exact: true }).click();
    await screen.getByRole("button", { name: "REVIEW", exact: true }).click();
    await screen.getByRole("textbox", { name: "Outcome", exact: true }).fill("Still considering the result");
    await tab(screen, "TODAY"); await tab(screen, "COMMAND");
    await expect.element(screen.getByRole("textbox", { name: "Outcome", exact: true })).toHaveValue("Still considering the result");
    expect(await db.decisionJournalEntries.count()).toBe(1);
  });
  it("keeps Capture text across tabs and restores its input focus", async () => {
    const screen = await render(<App />);
    await openCaptureFromLog(screen);
    const input = screen.getByRole("textbox", { name: "Capture a thought", exact: true });
    await input.fill("Remember this thought");
    const element = input.element();
    await tab(screen, "TRAIN"); await tab(screen, "TODAY");
    await expect.element(input).toHaveValue("Remember this thought");
    // Return to the task position; reopening the explicit action restores writing focus.
    await openCaptureFromLog(screen);
    await expect.poll(() => document.activeElement).toBe(element);
    expect(await db.captureItems.count()).toBe(0);
  });
});

describe("Plan Today and truthful guidance", () => {
  it("lists explicit planned and due tasks once and opens the exact commitment", async () => {
    const mission = await createMission({ title: "Health" });
    await createObligation({ title: "Planned appointment", plannedAt: "2026-10-13", dueAt: "2026-10-13", missionId: mission.id });
    await createObligation({ title: "Overdue call", dueAt: "2026-10-12" });
    await createObligation({ title: "Later task", plannedAt: "2026-10-14" });
    const screen = await render(<App />);
    await screen.getByRole("button", { name: /PLAN TODAY/ }).click();
    await expect.element(screen.getByRole("button", { name: /Planned appointment/ })).toBeVisible();
    await expect.element(screen.getByRole("button", { name: /Overdue call/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /Later task/ }).elements()).toHaveLength(0);
    expect(screen.getByRole("button", { name: /Planned appointment/ }).elements()).toHaveLength(1);
    await screen.getByRole("button", { name: /Planned appointment/ }).click();
    await expect.element(screen.getByRole("heading", { name: "Planned appointment", exact: true })).toBeVisible();
  });
  it("keeps the task composer across navigation, then creates one explicit planned task", async () => {
    const screen = await render(<App />); await screen.getByRole("button", { name: /PLAN TODAY/ }).click();
    const title = screen.getByRole("textbox", { name: "Add a task for today" });
    await title.fill("Book dentist"); await tab(screen, "BODY"); await tab(screen, "COMMAND");
    await expect.element(title).toHaveValue("Book dentist");
    const add = screen.getByRole("button", { name: "ADD TO TODAY", exact: true }).element() as HTMLButtonElement;
    add.click(); add.click();
    await expect.poll(() => db.obligations.count()).toBe(1);
    expect((await db.obligations.toArray())[0]!.plannedAt).toBe("2026-10-13");
    expect(await db.events.where("type").equals("OBLIGATION_CREATED").count()).toBe(1);
  });
  it("retains composer input after a canonical write failure and retries once", async () => {
    const screen = await render(<App />); await screen.getByRole("button", { name: /PLAN TODAY/ }).click();
    await screen.getByRole("textbox", { name: "Add a task for today" }).fill("Call home");
    const failure = vi.spyOn(db.obligations, "add").mockRejectedValue(new Error("Storage full"));
    await screen.getByRole("button", { name: "ADD TO TODAY", exact: true }).click();
    await expect.element(screen.getByRole("alert")).toHaveTextContent("Storage full");
    expect(await db.obligations.count()).toBe(0);
    await expect.element(screen.getByRole("textbox", { name: "Add a task for today" })).toHaveValue("Call home");
    failure.mockRestore(); await screen.getByRole("button", { name: "ADD TO TODAY", exact: true }).click();
    await expect.poll(() => db.obligations.count()).toBe(1);
  });
  it("keeps RED recorded signals distinct from unchanged Engine guidance", async () => {
    const day = await startDay(); await setWorkContext(day.id, "OFF", "MANUAL"); await logSleep(day.id, 180, "PRIMARY");
    await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    const screen = await render(<App />);
    // SUIT-001: SYSTEMS carries the level and the sleep fact on TODAY; STATE keeps the full sentence.
    await expect.element(screen.getByRole("button", { name: /^Systems: RED, Sleep 3:00, Fuel 0g, Check-in GREEN\. Open readout$/ })).toBeVisible();
    await expect.element(screen.getByText("Nothing needs you right now.", { exact: true })).toBeVisible();
    await expect.element(screen.getByText(/Status reports recorded signals/)).toBeVisible();
  });
  for (const width of [320, 360, 412]) it(`has one main landmark, compact destination access and accessible controls at ${width}px`, async () => {
    await page.viewport(width, 800);
    const screen = await render(<App />);
    await expect.element(screen.getByRole("main")).toBeVisible();
    expect(screen.getByRole("main").elements()).toHaveLength(1);
    await tab(screen, "COMMAND");
    const plans = screen.getByRole("button", { name: "PLAN TODAY", exact: true }).element();
    expect(plans.getBoundingClientRect().bottom).toBeLessThan(700);
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    for (const animation of document.getAnimations()) animation.finish();
    const results = await axe.run(document.body, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
    expect(results.violations).toEqual([]);
  });
});

it.each([320, 360, 412])("keeps focused Capture input clear of navigation when usable height shrinks at %ipx", async (width) => {
  await page.viewport(width, 800);
  const screen = await render(<App />);
  await openCaptureFromLog(screen);
  const input = screen.getByRole("textbox", { name: "Capture a thought", exact: true });
  await input.fill("Keep writing through keyboard changes");
  await page.viewport(width, 420);
  await expect.poll(() => {
    const rect = input.element().getBoundingClientRect();
    const nav = document.querySelector(".shell-nav")!.getBoundingClientRect();
    return rect.top >= 12 && rect.bottom <= nav.top;
  }).toBe(true);
  await expect.element(input).toHaveValue("Keep writing through keyboard changes");
  expect(document.activeElement).toBe(input.element());
  expect(await db.captureItems.count()).toBe(0);
});

it("refreshes a retained commitment after completion elsewhere", async () => {
  const task = await createObligation({ title: "A shared commitment", plannedAt: "2026-10-13" });
  const screen = await render(<App />);
  await screen.getByRole("button", { name: /PLAN TODAY/ }).click();
  await screen.getByRole("button", { name: /A shared commitment/ }).click();
  await expect.element(screen.getByRole("heading", { name: "A shared commitment", exact: true })).toBeVisible();
  await tab(screen, "BODY");
  await satisfyObligation(task.id);
  await tab(screen, "COMMAND");
  await expect.element(screen.getByText("SATISFIED", { exact: true })).toBeVisible();
  expect(screen.getByRole("button", { name: "SATISFY", exact: true }).elements()).toHaveLength(0);
});
