import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { RoutinesPanel } from "../../src/ui/components/RoutinesPanel";
import { TodayRoutine } from "../../src/ui/components/TodayRoutine";
import { startDay, updateSchedulePattern } from "../../src/application/commands";
import { createRoutine, getRoutineTicks, getRoutines, modifyRoutine, stepKey } from "../../src/application/routineCommands";
import { DEFAULT_SCHEDULE_PATTERN } from "../../src/engine/scheduledContext";
import { db } from "../../src/persistence/db";

beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 10, 4, 17)); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

it.each([320, 360, 412])("plays one step at a time, expiry/SKIP write nothing and DONE ticks only its step at %ipx", async (width) => {
  await page.viewport(width, 800);
  const day = await startDay();
  const r = await createRoutine({ title: "Synthetic departure", moment: "DAY_OFF", steps: [{ text: "Synthetic timed step", minutes: 1 }, "Synthetic next step", { text: "Synthetic last step", minutes: 2 }] });
  const before = await db.events.count();
  const screen = await render(<div className="screen more-operator"><RoutinesPanel active /></div>);
  const play = screen.getByRole("button", { name: "PLAY", exact: true });
  await play.click();
  const player = screen.getByRole("dialog", { name: "Synthetic departure", exact: true });
  await expect.element(player.getByRole("heading", { name: "Synthetic timed step", exact: true })).toBeVisible();
  await expect.element(player.getByRole("timer")).toHaveTextContent("1:00");
  expect(await db.events.count()).toBe(before);
  await player.getByRole("button", { name: "START TIMER", exact: true }).click();
  vi.setSystemTime(new Date(2026, 10, 4, 17, 1, 1));
  document.dispatchEvent(new Event("visibilitychange"));
  await expect.element(player.getByRole("status")).toHaveTextContent("Timer finished");
  expect(await db.events.count()).toBe(before);
  await player.getByRole("button", { name: "SKIP", exact: true }).click();
  await expect.element(player.getByRole("heading", { name: "Synthetic next step", exact: true })).toHaveFocus();
  expect((await getRoutineTicks(day.id)).size).toBe(0);
  await player.getByRole("button", { name: "DONE", exact: true }).click();
  await expect.element(player.getByRole("heading", { name: "Synthetic last step", exact: true })).toBeVisible();
  expect([...(await getRoutineTicks(day.id))]).toEqual([stepKey(r.id, r.steps[1]!.id)]);
  expect((await axe.run(player.element())).violations).toEqual([]);
  for (const button of player.getByRole("button").elements()) expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  expect(player.element().textContent).not.toMatch(/missed|streak/i);
  await player.getByRole("button", { name: "CLOSE PLAYER" }).click();
  await expect.element(play).toHaveFocus();
  expect(await db.events.count()).toBe(before + 1);
});

it("saves estimates only with SAVE and keeps them with steps across reorder and clearing", async () => {
  await page.viewport(360, 800);
  const screen = await render(<div className="screen more-operator"><RoutinesPanel active /></div>);
  await screen.getByRole("button", { name: "NEW ROUTINE" }).click();
  await screen.getByRole("textbox", { name: "Name", exact: true }).fill("Synthetic estimated routine");
  await screen.getByRole("textbox", { name: "Steps, one per line" }).fill("Synthetic first\nSynthetic second");
  const minutes = screen.getByRole("spinbutton", { name: "Step 1 minutes (optional)" });
  await minutes.fill("0");
  await expect.element(screen.getByRole("button", { name: "SAVE ROUTINE" })).toBeDisabled();
  expect(await db.routines.count()).toBe(0);
  await minutes.fill("2");
  expect(await db.routines.count()).toBe(0);
  await screen.getByRole("button", { name: "SAVE ROUTINE" }).click();
  await expect.element(screen.getByRole("heading", { name: "Synthetic estimated routine", exact: true })).toBeVisible();
  const original = (await getRoutines())[0]!;
  expect(original.steps.map((s) => s.minutes)).toEqual([2, undefined]);
  await screen.getByRole("button", { name: "EDIT", exact: true }).click();
  await screen.getByRole("textbox", { name: "Steps, one per line" }).first().fill("Synthetic second\nSynthetic first");
  await expect.element(screen.getByRole("spinbutton", { name: "Step 2 minutes (optional)" }).first()).toHaveValue(2);
  await screen.getByRole("spinbutton", { name: "Step 2 minutes (optional)" }).first().fill("");
  await screen.getByRole("button", { name: "SAVE", exact: true }).click();
  await expect.poll(async () => (await getRoutines())[0]!.steps[1]!.minutes).toBeUndefined();
  expect((await getRoutines())[0]!.steps.map((s) => s.id)).toEqual([original.steps[1]!.id, original.steps[0]!.id]);
});

it("only starts a day on explicit START DAY and keeps the current skipped position", async () => {
  const r = await createRoutine({ title: "Synthetic no day", moment: "DAY_OFF", steps: ["Synthetic first", "Synthetic second"] });
  const screen = await render(<div className="screen more-operator"><RoutinesPanel active /></div>);
  await screen.getByRole("button", { name: "PLAY", exact: true }).click();
  const player = screen.getByRole("dialog", { name: r.title, exact: true });
  await expect.element(player.getByRole("button", { name: "DONE", exact: true })).toBeDisabled();
  expect(await db.beyondDays.count()).toBe(0);
  await player.getByRole("button", { name: "SKIP", exact: true }).click();
  await player.getByRole("button", { name: "START DAY", exact: true }).click();
  await expect.element(player.getByRole("heading", { name: "Synthetic second", exact: true })).toBeVisible();
  await expect.element(player.getByRole("button", { name: "DONE", exact: true })).toBeEnabled();
  expect(await db.beyondDays.count()).toBe(1);
  expect(await db.events.where("type").equals("ROUTINE_STEP_SET").count()).toBe(0);
});

it("re-reads an edited routine before DONE, and rejects a later lived day", async () => {
  await startDay();
  const r = await createRoutine({ title: "Synthetic changed", moment: "DAY_OFF", steps: ["Synthetic step"] });
  const screen = await render(<div className="screen more-operator"><RoutinesPanel active /></div>);
  await screen.getByRole("button", { name: "PLAY", exact: true }).click();
  const player = screen.getByRole("dialog", { name: r.title, exact: true });
  await expect.element(player.getByRole("heading", { name: "Synthetic step", exact: true })).toBeVisible();
  await modifyRoutine(r.id, { steps: [{ ...r.steps[0]!, minutes: 2 }] });
  await player.getByRole("button", { name: "DONE", exact: true }).click();
  await expect.element(player.getByRole("alert")).toHaveTextContent("routine changed");
  expect(await db.events.where("type").equals("ROUTINE_STEP_SET").count()).toBe(0);
  await player.getByRole("button", { name: "RELOAD PLAYER" }).click();
  await expect.element(player.getByRole("timer")).toHaveTextContent("2:00");
  vi.setSystemTime(new Date(2026, 10, 5, 16, 31));
  await player.getByRole("button", { name: "DONE", exact: true }).click();
  await expect.element(player.getByRole("alert")).toHaveTextContent("lived day changed");
  expect(await db.events.where("type").equals("ROUTINE_STEP_SET").count()).toBe(0);
});

it("exposes PLAY on the single TODAY row and labels a fully estimated scheduled start", async () => {
  await updateSchedulePattern({ ...DEFAULT_SCHEDULE_PATTERN, anchorMonday: "2026-11-02", weeks: [{ workdays: [3] }, { workdays: [3] }] });
  const day = await startDay();
  await createRoutine({ title: "Synthetic before shift", moment: "BEFORE_SHIFT", steps: [{ text: "Synthetic first", minutes: 10 }, { text: "Synthetic second", minutes: 5 }] });
  const screen = await render(<div className="screen"><TodayRoutine dayId={day.id} moment="BEFORE_SHIFT" active /></div>);
  expect(screen.container.querySelectorAll("summary")).toHaveLength(1);
  await screen.getByRole("button", { name: "PLAY", exact: true }).click();
  const player = screen.getByRole("dialog", { name: "Synthetic before shift", exact: true });
  await expect.element(player.getByText(/Scheduled start by 17:45/)).toBeVisible();
  expect(await db.events.where("type").equals("ROUTINE_STEP_SET").count()).toBe(0);
});

it("speaks only after opt-in and cancels speech on close", async () => {
  const speak = vi.spyOn(speechSynthesis, "speak").mockImplementation(() => {});
  const cancel = vi.spyOn(speechSynthesis, "cancel").mockImplementation(() => {});
  await startDay(); await createRoutine({ title: "Synthetic spoken", moment: "DAY_OFF", steps: ["Synthetic spoken step"] });
  const screen = await render(<div className="screen more-operator"><RoutinesPanel active /></div>);
  await screen.getByRole("button", { name: "PLAY", exact: true }).click();
  const player = screen.getByRole("dialog", { name: "Synthetic spoken", exact: true });
  await expect.element(player.getByRole("heading", { name: "Synthetic spoken step", exact: true })).toBeVisible();
  expect(speak).not.toHaveBeenCalled();
  await player.getByRole("checkbox", { name: "Speak step names" }).click();
  await expect.poll(() => speak.mock.calls.length).toBe(1);
  expect(speak.mock.calls[0]![0].text).toBe("Synthetic spoken step");
  await player.getByRole("button", { name: "CLOSE PLAYER" }).click();
  expect(cancel).toHaveBeenCalled();
});
