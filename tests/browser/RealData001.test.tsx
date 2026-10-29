import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { createObligation } from "../../src/application/intentCommands";
import { db } from "../../src/persistence/db";
import { formatLocalDate } from "../../src/engine/scheduledContext";
import { DailyControls as TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { getLastStrengthSession } from "../../src/application/trainQueries";
import { App } from "../../src/app/App";
import { importSleepSnapshot } from "../../src/application/externalSleepCommands";
import { syntheticGarminMonth } from "../helpers/syntheticGarminMonth";

/** REAL-DATA-001: findings from the owner's real backup, each closed on the screen where it hurt. */
const GREEN = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 } as const;
beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"], shouldAdvanceTime: true }); vi.setSystemTime(new Date(2026, 9, 5, 12, 0, 0)); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const ago = (days: number) => { const d = new Date(); d.setDate(d.getDate() - days); return formatLocalDate(d); };

describe("an overdue task closes on its own card", () => {
  it("NOT A TASK asks once, releases the task and the card stops naming it", async () => {
    const note = await createObligation({ title: "Renew library card", dueAt: ago(33) });
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TodayScreen />);
    await expect.element(screen.getByRole("heading", { name: "Renew library card · Overdue" })).toBeVisible();
    const card = screen.getByRole("group", { name: "Task: Renew library card" });
    expect((await axe.run(card.element())).violations).toEqual([]);
    await card.getByRole("button", { name: "NOT A TASK", exact: true }).click();
    // One-way, so it asks first and nothing is written yet.
    expect((await db.obligations.get(note.id))!.status).toBe("OPEN");
    await card.getByRole("button", { name: "YES, DROP IT", exact: true }).click();
    await expect.poll(async () => (await db.obligations.get(note.id))!.status).toBe("RELEASED");
    await expect.element(screen.getByRole("heading", { name: "Renew library card · Overdue" })).not.toBeInTheDocument();
  });

  it("DONE satisfies it; NEW DATE moves it and keeps it open", async () => {
    const a = await createObligation({ title: "Return the drill", dueAt: ago(7) });
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const screen = await render(<TodayScreen />);
    let card = screen.getByRole("group", { name: "Task: Return the drill" });
    await card.getByRole("button", { name: "NEW DATE", exact: true }).click();
    await card.getByLabelText("New due date").fill(ago(-3));
    await card.getByRole("button", { name: "SAVE DATE", exact: true }).click();
    await expect.poll(async () => (await db.obligations.get(a.id))!.dueAt).toBe(ago(-3));
    expect((await db.obligations.get(a.id))!.status).toBe("OPEN");

    const b = await createObligation({ title: "Oil change", dueAt: ago(1) });
    await cleanup();
    const again = await render(<TodayScreen />);
    card = again.getByRole("group", { name: "Task: Oil change" });
    await card.getByRole("button", { name: "DONE", exact: true }).click();
    await card.getByRole("button", { name: "YES, DONE", exact: true }).click();
    await expect.poll(async () => (await db.obligations.get(b.id))!.status).toBe("SATISFIED");
  });
});

describe("TRAIN's last training is real training", () => {
  it("skips a session completed with no sets (the owner's record read 0 working sets · 0 min)", async () => {
    const day = await startDay();
    const real = await startWorkout(day.id, "A", "STANDARD", { overrideConfirmed: true });
    await logSet(day.id, real.id, "machine-chest-press", 1, 100, 10);
    await completeWorkout(day.id, real.id, "STANDARD", "PARTIAL");
    vi.setSystemTime(new Date(2026, 9, 5, 13, 0, 0));
    const empty = await startWorkout(day.id, "B", "REDUCED", { overrideConfirmed: true });
    await completeWorkout(day.id, empty.id, "REDUCED", "COMPLETED");
    const last = await getLastStrengthSession();
    expect(last?.templateId).toBe("A");
    expect(last?.workingSetCount).toBe(1);
  });
});

describe("an old workout doesn't take over the app", () => {
  it("opens on TRAIN for a workout in use, on TODAY for one idle past two hours", async () => {
    const day = await startDay();
    await startWorkout(day.id, "C", "STANDARD", { overrideConfirmed: true });
    vi.setSystemTime(new Date(2026, 9, 5, 12, 40, 0));
    let screen = await render(<App />);
    await expect.element(screen.getByRole("button", { name: "TRAIN", exact: true })).toHaveAttribute("aria-current", "page");
    await cleanup();
    vi.setSystemTime(new Date(2026, 9, 5, 15, 30, 0));
    screen = await render(<App />);
    await expect.element(screen.getByRole("button", { name: "TODAY", exact: true })).toHaveAttribute("aria-current", "page");
    await new Promise((r) => setTimeout(r, 600));
    await expect.element(screen.getByRole("button", { name: "TODAY", exact: true })).toHaveAttribute("aria-current", "page");
  });
});

describe("DATA and TODAY read the same night", () => {
  it("with no sleep logged, DATA's MAIN SLEEP shows Garmin's last night instead of Not logged", async () => {
    const H = 3600_000, start = new Date(2026, 9, 20, 16, 30).getTime(), now = start + 34 * H;
    const { days, sleep } = syntheticGarminMonth(start, 2, now);
    await db.beyondDays.bulkAdd(days);
    vi.setSystemTime(now); await importSleepSnapshot(sleep);
    // The owner's backup: Garmin nights that never became a sleep log (71 nights, 23 logs).
    await db.events.where("type").equals("SLEEP_LOGGED").delete();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "DATA", exact: true }).click();
    await expect.element(screen.getByText("Garmin · last main sleep", { exact: true })).toBeVisible();
  });
});
