import { afterEach, describe, expect, it, vi } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { App } from "../../src/app/App";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";
import { NotesSweep } from "../../src/ui/components/NotesSweep";
import { captureItem, restoreCaptureItem, setWorkContext, startDay, submitCheckIn } from "../../src/application/commands";
import { completeWorkout, logSet, startWorkout } from "../../src/application/trainCommands";
import { getPerformedSets } from "../../src/application/trainQueries";
import type { CheckInValues } from "../../src/ui/screens/today/checkInFields";
import { holdToConfirm } from "./helpers/hold";

/** CLEANUP-002: walk-through findings 1–4, 11, 13 and the sweep's silent UNDO failure. */

// restoreCaptureItem stays the real one unless a test makes it fail.
vi.mock("../../src/application/commands", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/application/commands")>();
  return { ...actual, restoreCaptureItem: vi.fn(actual.restoreCaptureItem) };
});

const GREEN: CheckInValues = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };

afterEach(() => {
  cleanup();
});

describe("CLEANUP-002", () => {
  it("gym mode shows the last set with its PR tag, and UNDO removes it (findings 1, 2)", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, GREEN);
    const past = await startWorkout(day.id, "A", "STANDARD");
    await logSet(day.id, past.id, "machine-chest-press", 1, 100, 10);
    await completeWorkout(day.id, past.id, "STANDARD", "COMPLETED");
    const session = await startWorkout(day.id, "A", "STANDARD");
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "GYM MODE" }).click();
    const dialog = screen.getByRole("dialog", { name: "Gym mode" });
    await dialog.getByRole("spinbutton", { name: "Weight" }).fill("110");
    await dialog.getByRole("button", { name: "LOG SET 1" }).click();

    await expect.element(dialog.getByText("Last set: Machine Chest Press #1 — 110 × 10")).toBeVisible();
    await expect.element(dialog.getByText("heaviest yet (110 lb)")).toBeVisible();
    expect(document.querySelector(".gym-mode .pr-tag")?.textContent).toBe("PR");

    await dialog.getByRole("button", { name: "UNDO", exact: true }).click();
    await expect.poll(async () => (await getPerformedSets(session.id)).length).toBe(0);
    await expect.element(dialog.getByRole("button", { name: "LOG SET 1" })).toBeVisible();
  });

  it("TODAY's own lines sit under the header (finding 3)", async () => {
    localStorage.setItem("beyond:autoBackupPreference", JSON.stringify({ enabled: true, everyDays: 7 }));
    await startDay();
    await render(<App />);
    await expect.poll(() => document.querySelector(".today-banners .backup-due")).not.toBeNull();
    const header = document.querySelector(".field-header")!;
    const banners = document.querySelector(".today-banners")!;
    expect(header.compareDocumentPosition(banners) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("on a day off, Attention points to the sweep instead of repeating the notes; work days say TASK (finding 4)", async () => {
    const day = await startDay();
    await setWorkContext(day.id, "OFF", "MANUAL");
    await captureItem("Call the dentist");
    await captureItem("Renew truck registration");
    const screen = await render(<App />);
    await expect.element(screen.getByText("Sweep your notes · 2 waiting")).toBeVisible();
    await expect.element(screen.getByText(/2 notes waiting\. SWEEP above/)).toBeVisible();
    expect(screen.getByRole("button", { name: "→ TASK" }).elements()).toHaveLength(0);
    cleanup();

    await setWorkContext(day.id, "WORK", "MANUAL");
    const work = await render(<App />);
    await expect.element(work.getByRole("button", { name: "→ TASK" }).first()).toBeVisible();
    expect(document.querySelector(".notes-sweep")).toBeNull();
  });

  it("the start card centers its contents (finding 11)", async () => {
    const screen = await render(<App />);
    await expect.element(screen.getByRole("button", { name: "START DAY" })).toBeVisible();
    const surface = document.querySelector(".today-field .command-surface")!;
    expect(getComputedStyle(surface).justifyContent).toBe("center");
  });

  it("the sweep line re-reads when the day's context changes (finding 13)", async () => {
    const day = await startDay();
    await setWorkContext(day.id, "WORK", "MANUAL");
    await captureItem("Call the dentist");
    const screen = await render(<NotesSweep onSwept={() => {}} refreshKey={0} />);
    await new Promise((r) => setTimeout(r, 200));
    expect(document.querySelector(".notes-sweep")).toBeNull();
    await setWorkContext(day.id, "OFF", "MANUAL");
    await screen.rerender(<NotesSweep onSwept={() => {}} refreshKey={1} />);
    await expect.element(screen.getByText("Sweep your notes · 1 waiting")).toBeVisible();
  });

  it("switching to a day off on TODAY brings up the sweep line without reopening (finding 13, App wiring)", async () => {
    const day = await startDay();
    await setWorkContext(day.id, "WORK", "MANUAL");
    await captureItem("Call the dentist");
    const screen = await render(<App />);
    await expect.element(screen.getByRole("button", { name: "MORE", exact: true })).toBeVisible();
    expect(document.querySelector(".notes-sweep")).toBeNull();
    await screen.getByRole("button", { name: "Open TOOLS" }).click();
    await screen.getByRole("button", { name: "CHANGE WORK CONTEXT" }).click();
    await screen.getByRole("button", { name: "NO", exact: true }).click();
    await expect.element(screen.getByText("Sweep your notes · 1 waiting")).toBeVisible();
  });

  it("a failed sweep UNDO says so", async () => {
    const day = await startDay();
    await setWorkContext(day.id, "OFF", "MANUAL");
    await captureItem("Old grocery list");
    await captureItem("Call the dentist");
    vi.mocked(restoreCaptureItem).mockRejectedValueOnce(new Error("boom"));
    const screen = await render(<NotesSweep onSwept={() => {}} />);
    await screen.getByRole("button", { name: "SWEEP" }).click();
    await holdToConfirm(screen.getByRole("button", { name: "DELETE" }));
    await screen.getByRole("button", { name: "UNDO", exact: true }).click();
    await expect.element(screen.getByText("Couldn't bring it back. Try again.")).toBeVisible();
  });
});
