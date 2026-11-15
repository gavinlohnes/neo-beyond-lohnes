import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import { db } from "../../src/persistence/db";
import { PlanTodayScreen } from "../../src/ui/screens/more/PlanTodayScreen";
import { createObligation } from "../../src/application/intentCommands";
import { getObligation } from "../../src/application/intentQueries";
import { moveWeekTask } from "../../src/application/weekPlannerCommands";
import { getWeekPlanner } from "../../src/application/weekPlannerQueries";
import "../../src/ui/screens/more/operator.css";

vi.mock("../../src/application/weekPlannerCommands", async (original) => {
  const actual = await original<typeof import("../../src/application/weekPlannerCommands")>();
  return { ...actual, moveWeekTask: vi.fn(actual.moveWeekTask) };
});
vi.mock("../../src/application/weekPlannerQueries", async (original) => {
  const actual = await original<typeof import("../../src/application/weekPlannerQueries")>();
  return { ...actual, getWeekPlanner: vi.fn(actual.getWeekPlanner) };
});
beforeEach(async () => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 14, 12)); await page.viewport(375, 850); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });
async function open() {
  const onOpen = vi.fn(); const screen = await render(<div className="screen more-operator"><PlanTodayScreen onOpen={onOpen} /></div>);
  await screen.getByRole("button", { name: "Week planner", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "Make room for your week" })).toBeVisible();
  await expect.poll(() => screen.container.querySelectorAll(".week-planner__day").length).toBe(7);
  return { screen, onOpen };
}
it("moves a planned task while its original deadline stays visible, survives remount and opens the canonical detail", async () => {
  const task = await createObligation({ title: "Book dentist", plannedAt: "2026-11-14", dueAt: "2026-11-15" });
  const { screen, onOpen } = await open();
  await screen.getByRole("button", { name: "Plan Book dentist", exact: true }).click();
  const sheet = screen.getByRole("dialog", { name: "Choose a planned day" });
  await sheet.getByRole("combobox", { name: "Planned day" }).selectOptions("2026-11-17");
  await sheet.getByRole("button", { name: "SAVE PLANNED DAY", exact: true }).click();
  await expect.element(screen.getByRole("status").filter({ hasText: "Deadline unchanged" })).toBeVisible();
  expect(await getObligation(task.id)).toMatchObject({ plannedAt: "2026-11-17", dueAt: "2026-11-15" });
  await screen.getByRole("button", { name: /^Sun, Nov 15/ }).click();
  await expect.element(screen.getByRole("button", { name: /^Book dentist/ })).toBeVisible();
  await screen.getByRole("button", { name: /^Book dentist/ }).click();
  expect(onOpen).toHaveBeenCalledWith({ kind: "OBLIGATION", obligationId: task.id });
  await cleanup(); const resumed = await open();
  await resumed.screen.getByRole("button", { name: /^Tue, Nov 17/ }).click();
  await expect.element(resumed.screen.getByRole("button", { name: /^Book dentist/ })).toBeVisible();
});
it("adds explicitly to the selected day and retains words across existing task views", async () => {
  const { screen } = await open();
  await screen.getByRole("button", { name: /^Mon, Nov 16/ }).click();
  await screen.getByLabelText("Add a task for Mon, Nov 16").fill("Prepare lunches");
  await screen.getByRole("button", { name: "Today", exact: true }).click();
  await screen.getByRole("button", { name: "Week planner", exact: true }).click();
  await expect.element(screen.getByLabelText("Add a task for Mon, Nov 16")).toHaveValue("Prepare lunches");
  await screen.getByRole("button", { name: "ADD TO THIS DAY", exact: true }).click();
  await expect.element(screen.getByRole("status").filter({ hasText: "Prepare lunches" })).toBeVisible();
  const tasks = (await getWeekPlanner()).days[2]!.tasks;
  expect(tasks).toHaveLength(1); expect(tasks[0]).toMatchObject({ title: "Prepare lunches", plannedAt: "2026-11-16" });
  expect(tasks[0]!.dueAt).toBeUndefined();
});
it("failed save keeps the choice, retry commits once, and Escape returns focus without a write", async () => {
  const task = await createObligation({ title: "Call bank", plannedAt: "2026-11-14" });
  const { screen } = await open();
  await screen.getByRole("button", { name: "Plan Call bank", exact: true }).click();
  const sheet = screen.getByRole("dialog", { name: "Choose a planned day" });
  await sheet.getByRole("combobox", { name: "Planned day" }).selectOptions("2026-11-15");
  vi.mocked(moveWeekTask).mockRejectedValueOnce(new Error("Save unavailable"));
  await sheet.getByRole("button", { name: "SAVE PLANNED DAY", exact: true }).click();
  await expect.element(sheet.getByRole("alert")).toBeVisible();
  expect((await getObligation(task.id))?.plannedAt).toBe("2026-11-14");
  await expect.element(sheet.getByRole("combobox", { name: "Planned day" })).toHaveValue("2026-11-15");
  await sheet.getByRole("button", { name: "SAVE PLANNED DAY", exact: true }).click();
  await expect.poll(async () => (await getObligation(task.id))?.plannedAt).toBe("2026-11-15");
  const trigger = screen.getByRole("button", { name: "Plan Call bank", exact: true }); await trigger.click();
  await userEvent.keyboard("{Escape}");
  await expect.poll(() => document.activeElement?.getAttribute("aria-label")).toBe("Plan Call bank");
});
it("failed reads show unavailable rather than empty and retry restores the week", async () => {
  vi.mocked(getWeekPlanner).mockRejectedValueOnce(new Error("Read unavailable"));
  const screen = await render(<div className="screen more-operator"><PlanTodayScreen onOpen={() => {}} /></div>);
  await screen.getByRole("button", { name: "Week planner", exact: true }).click();
  await expect.element(screen.getByRole("alert")).toBeVisible();
  await screen.getByRole("button", { name: "RETRY WEEK", exact: true }).click();
  await expect.poll(() => screen.container.querySelectorAll(".week-planner__day").length).toBe(7);
});
it.each([320, 375, 768, 1024])("fits %spx with labelled touch controls and no axe violations", async (width) => {
  await createObligation({ title: "Arrange next month’s appointments and review the equipment maintenance paperwork", plannedAt: "2026-11-14", dueAt: "2026-11-15" });
  await page.viewport(width, 850); const { screen } = await open(); await page.viewport(width, 850);
  for (const animation of document.getAnimations()) animation.finish();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect(getComputedStyle(screen.getByRole("textbox", { name: /^Add a task for/ }).element()).fontSize).toBe("16px");
  expect((await axe.run(screen.container, { rules: { region: { enabled: false } } })).violations).toEqual([]);
});

it("midnight keeps a typed draft attached to its intended day until explicitly reselected", async () => {
  const { screen } = await open();
  await screen.getByRole("textbox", { name: /^Add a task for/ }).fill("Keep this thought");
  vi.setSystemTime(new Date(2026, 10, 15, 0, 1)); document.dispatchEvent(new Event("visibilitychange"));
  await expect.element(screen.getByText(/Your draft was written for Sat, Nov 14/)).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "ADD TO THIS DAY", exact: true })).toBeDisabled();
  await expect.element(screen.getByRole("textbox", { name: /^Add a task for/ })).toHaveValue("Keep this thought");
  await screen.getByRole("button", { name: /^Sun, Nov 15/ }).click();
  await screen.getByRole("button", { name: "ADD TO THIS DAY", exact: true }).click();
  await expect.element(screen.getByRole("status").filter({ hasText: "Added" })).toBeVisible();
  expect((await getWeekPlanner()).days[0]?.tasks[0]?.plannedAt).toBe("2026-11-15");
});
it("a failed background refresh can be retried inside the move sheet without losing the selected day", async () => {
  const item = await createObligation({ title: "Keep choice", plannedAt: "2026-11-14" });
  const { screen } = await open(); await screen.getByRole("button", { name: "Plan Keep choice", exact: true }).click();
  const sheet = screen.getByRole("dialog", { name: "Choose a planned day" });
  await sheet.getByRole("combobox", { name: "Planned day" }).selectOptions("2026-11-17");
  vi.mocked(getWeekPlanner).mockRejectedValueOnce(new Error("Background unavailable"));
  document.dispatchEvent(new Event("visibilitychange"));
  await expect.element(sheet.getByRole("button", { name: "RETRY WEEK IN FORM", exact: true })).toBeVisible();
  await expect.element(sheet.getByRole("combobox", { name: "Planned day" })).toHaveValue("2026-11-17");
  await expect.element(sheet.getByRole("button", { name: "SAVE PLANNED DAY", exact: true })).toBeDisabled();
  await sheet.getByRole("button", { name: "RETRY WEEK IN FORM", exact: true }).click();
  await expect.element(sheet.getByRole("button", { name: "SAVE PLANNED DAY", exact: true })).toBeEnabled();
  await sheet.getByRole("button", { name: "SAVE PLANNED DAY", exact: true }).click();
  await expect.poll(async () => (await getObligation(item.id))?.plannedAt).toBe("2026-11-17");
});
it("same-tick saves commit once and a failed post-save refresh still reports the saved move", async () => {
  const item = await createObligation({ title: "Saved fact", plannedAt: "2026-11-14" });
  const { screen } = await open(); await screen.getByRole("button", { name: "Plan Saved fact", exact: true }).click();
  const sheet = screen.getByRole("dialog", { name: "Choose a planned day" });
  await sheet.getByRole("combobox", { name: "Planned day" }).selectOptions("2026-11-17");
  const commands = await vi.importActual<typeof import("../../src/application/weekPlannerCommands")>("../../src/application/weekPlannerCommands");
  vi.mocked(moveWeekTask).mockImplementationOnce(async (...args) => { const result = await commands.moveWeekTask(...args); vi.mocked(getWeekPlanner).mockRejectedValueOnce(new Error("Refresh unavailable")); return result; });
  const save = sheet.getByRole("button", { name: "SAVE PLANNED DAY", exact: true }).element() as HTMLButtonElement;
  save.click(); save.click();
  await expect.element(screen.getByRole("status").filter({ hasText: "Planned “Saved fact”" })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: "RETRY WEEK", exact: true })).toBeVisible();
  expect(vi.mocked(moveWeekTask)).toHaveBeenCalledTimes(1);
  expect((await getObligation(item.id))?.plannedAt).toBe("2026-11-17");
  await screen.getByRole("button", { name: "RETRY WEEK", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: /^Saved fact/ })).toBeVisible();
});


it("keeps the move unsaved when midnight passes during the eligibility read", async () => {
  const item = await createObligation({ title: "Midnight pending", plannedAt: "2026-11-15" });
  const { screen } = await open();
  await screen.getByRole("button", { name: /^Sun, Nov 15/ }).click();
  await screen.getByRole("button", { name: "Plan Midnight pending", exact: true }).click();
  const sheet = screen.getByRole("dialog", { name: "Choose a planned day" });
  await sheet.getByRole("combobox", { name: "Planned day" }).selectOptions("2026-11-14");
  const count = await db.events.count();
  const crossMidnight = (value: unknown) => { vi.setSystemTime(new Date(2026, 10, 15, 0, 1)); return value; };
  db.obligations.hook("reading", crossMidnight);
  try {
    await sheet.getByRole("button", { name: "SAVE PLANNED DAY", exact: true }).click();
    await expect.element(sheet.getByRole("alert")).toHaveTextContent("outside the current seven-day plan");
  } finally { db.obligations.hook("reading").unsubscribe(crossMidnight); }
  expect((await getObligation(item.id))?.plannedAt).toBe("2026-11-15");
  expect(await db.events.count()).toBe(count);
});
