import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { PlanTodayScreen } from "../../src/ui/screens/more/PlanTodayScreen";
import { createObligation } from "../../src/application/intentCommands";
import { db } from "../../src/persistence/db";

const reads = vi.hoisted(() => ({ fail: false }));
vi.mock("../../src/application/planTodayQueries", async (original) => {
  const actual = await original<typeof import("../../src/application/planTodayQueries")>();
  return { ...actual, getTaskSmartLists: (...args: Parameters<typeof actual.getTaskSmartLists>) => reads.fail ? Promise.reject(new Error("Synthetic interrupted read")) : actual.getTaskSmartLists(...args) };
});
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 4, 22)); });
afterEach(() => { cleanup(); reads.fail = false; vi.useRealTimers(); });

it.each([320, 360, 412])("browses three views, retains a draft and opens the existing task route without writes at %ipx", async (width) => {
  await page.viewport(width, 800);
  await createObligation({ title: "Synthetic earlier task", dueAt: "2026-11-02" });
  const future = await createObligation({ title: "Synthetic next task", plannedAt: "2026-11-05", dueAt: "2026-11-06" });
  await createObligation({ title: "Synthetic undated task" });
  const events = await db.events.toArray(), obligations = await db.obligations.toArray();
  const onOpen = vi.fn();
  const screen = await render(<div className="screen more-operator"><PlanTodayScreen onOpen={onOpen} /></div>);
  await expect.element(screen.getByText("Due · from Mon, Nov 2", { exact: true })).toBeVisible();
  expect(screen.container.textContent).not.toMatch(/overdue|missed/i);
  const input = screen.getByRole("textbox", { name: "Add a task for today", exact: true });
  await input.fill("Synthetic retained draft");
  const views = screen.getByRole("group", { name: "Task views" });
  await views.getByRole("button", { name: "Next 7", exact: true }).click();
  const task = screen.getByRole("button", { name: /^Synthetic next task/ });
  await expect.element(task).toBeVisible();
  await task.click();
  expect(onOpen).toHaveBeenCalledWith({ kind: "OBLIGATION", obligationId: future.id });
  await views.getByRole("button", { name: "No date", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: /^Synthetic undated task/ })).toBeVisible();
  await expect.element(input).toHaveValue("Synthetic retained draft");
  for (const button of views.getByRole("button").elements()) expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  await document.fonts.ready;
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect((await axe.run(screen.container)).violations).toEqual([]);
  expect(await db.events.toArray()).toEqual(events);
  expect(await db.obligations.toArray()).toEqual(obligations);
});

it("uses the shared section shape for commitments and task creation with a kind empty state", async () => {
  await page.viewport(360, 800);
  const onOpen = vi.fn();
  const screen = await render(<div className="screen more-operator"><PlanTodayScreen onOpen={onOpen} /></div>);
  const commitments = screen.getByRole("region", { name: "Today", exact: true });
  await expect.element(commitments).toBeVisible();
  await expect.element(commitments.getByText("A little breathing room.", { exact: true })).toBeVisible();
  await expect.element(commitments.getByText("No tasks are planned or due today.", { exact: true })).toBeVisible();
  const allMissions = screen.getByRole("button", { name: "Open all missions and obligations", exact: true });
  expect(allMissions.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  await allMissions.click();
  expect(onOpen).toHaveBeenCalledWith(null);
  const addTask = screen.getByRole("region", { name: "Add a task", exact: true });
  await expect.element(addTask.getByRole("button", { name: "ADD TO TODAY", exact: true })).toBeDisabled();
  expect(document.body.textContent).not.toMatch(/\b0\b|you haven't|don't forget/i);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  expect((await axe.run(screen.container)).violations).toEqual([]);
});

it("keeps the selected view and composer on read failure, then retries without writing", async () => {
  reads.fail = true;
  const screen = await render(<div className="screen more-operator"><PlanTodayScreen onOpen={() => {}} /></div>);
  await expect.element(screen.getByRole("alert")).toHaveTextContent("unavailable, not empty");
  await screen.getByRole("button", { name: "No date", exact: true }).click();
  const input = screen.getByRole("textbox", { name: "Add a task for today" });
  await input.fill("Synthetic kept after read failure");
  await expect.element(screen.getByRole("button", { name: "ADD TO TODAY" })).toBeDisabled();
  reads.fail = false;
  await screen.getByRole("button", { name: "RETRY PLAN" }).click();
  await expect.element(screen.getByText("No undated tasks.", { exact: true })).toBeVisible();
  await expect.element(input).toHaveValue("Synthetic kept after read failure");
  expect(await db.events.count()).toBe(0);
});

it("refreshes across midnight on resume and only adds to the current date after explicit submission", async () => {
  await createObligation({ title: "Synthetic tomorrow becomes today", dueAt: "2026-11-05" });
  const screen = await render(<div className="screen more-operator"><PlanTodayScreen onOpen={() => {}} /></div>);
  await screen.getByRole("button", { name: "Next 7", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: /^Synthetic tomorrow becomes today/ })).toBeVisible();
  const input = screen.getByRole("textbox", { name: "Add a task for today" });
  await input.fill("Synthetic explicit add");
  vi.setSystemTime(new Date(2026, 10, 5, 0, 5));
  document.dispatchEvent(new Event("visibilitychange"));
  await expect.element(screen.getByText(/^Thu, Nov 5 · Your choices/)).toBeVisible();
  await expect.element(input).toHaveValue("Synthetic explicit add");
  await expect.element(screen.getByRole("button", { name: "Next 7", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(await db.obligations.count()).toBe(1);
  await screen.getByRole("button", { name: "ADD TO TODAY" }).click();
  await expect.poll(async () => (await db.obligations.toArray()).find((o) => o.title === "Synthetic explicit add")?.plannedAt).toBe("2026-11-05");
  await screen.getByRole("button", { name: "Today", exact: true }).click();
  await expect.element(screen.getByRole("button", { name: /^Synthetic explicit add/ })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: /^Synthetic tomorrow becomes today/ })).toBeVisible();
});

it("QUICK-ADD-001: plain words with a date plan the task for that day, shown before adding", async () => {
  await page.viewport(360, 800);
  const screen = await render(<div className="screen more-operator"><PlanTodayScreen onOpen={vi.fn()} /></div>);
  const box = screen.getByRole("textbox", { name: "Add a task for today" });
  await box.fill("dentist tomorrow 3pm");
  await expect.element(screen.getByText(/^Understood: “Dentist” on Thu, Nov 5 at 15:00\. Choose a date below to override\./)).toBeVisible();
  await screen.getByRole("button", { name: "ADD FOR THU, NOV 5", exact: true }).click();
  await expect.element(screen.getByText("Added “Dentist” for Thu, Nov 5 at 15:00.", { exact: true })).toBeVisible();
  const saved = (await db.obligations.toArray()).find((o) => o.title === "Dentist");
  expect(saved).toMatchObject({ plannedAt: "2026-11-05", description: "At 15:00" });
  await box.fill("Water the plants");
  await expect.element(screen.getByRole("button", { name: "ADD TO TODAY", exact: true })).toBeVisible();
  expect(screen.getByText(/^Understood:/).elements()).toHaveLength(0);
});

it("SHUTDOWN-001: wraps up today by moving planned tasks to tomorrow, one tap each or all", async () => {
  await page.viewport(360, 800);
  await createObligation({ title: "Clean the gutters", plannedAt: "2026-11-04" });
  await createObligation({ title: "Return library book", plannedAt: "2026-11-04" });
  await createObligation({ title: "Pay the water bill", dueAt: "2026-11-04" });
  const screen = await render(<div className="screen more-operator"><PlanTodayScreen onOpen={vi.fn()} /></div>);
  await expect.element(screen.getByRole("heading", { name: "Wrap up today" })).toBeVisible();
  await expect.element(screen.getByText("1 task is due today or earlier; it stays here until done or given a new due date.", { exact: true })).toBeVisible();
  await screen.getByRole("button", { name: "Move Clean the gutters to tomorrow" }).click();
  await expect.element(screen.getByText("Moved “Clean the gutters” to Thu, Nov 5.", { exact: true })).toBeVisible();
  expect((await db.obligations.toArray()).find((o) => o.title === "Clean the gutters")?.plannedAt).toBe("2026-11-05");
  await expect.element(screen.getByText("Nothing planned is left open today.").or(screen.getByRole("button", { name: "Move Return library book to tomorrow" }))).toBeVisible();
  expect((await axe.run(screen.container)).violations).toEqual([]);
});

it("QUICK-ADD-001: one tap keeps the words exactly as typed, for today", async () => {
  await page.viewport(360, 800);
  const screen = await render(<div className="screen more-operator"><PlanTodayScreen onOpen={vi.fn()} /></div>);
  await screen.getByRole("textbox", { name: "Add a task for today" }).fill("Sunday school prep");
  await screen.getByRole("button", { name: "Keep as typed, today" }).click();
  await screen.getByRole("button", { name: "ADD TO TODAY", exact: true }).click();
  await expect.element(screen.getByText("Added “Sunday school prep” to your plan.", { exact: true })).toBeVisible();
  expect((await db.obligations.toArray()).find((o) => o.title === "Sunday school prep")?.plannedAt).toBe("2026-11-04");
});
