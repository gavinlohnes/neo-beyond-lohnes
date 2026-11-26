/// <reference types="@vitest/browser-playwright" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { endDay, startDay, submitCheckIn } from "../../src/application/commands";
import { completeWorkout, logSet, skipSet, startWorkout } from "../../src/application/trainCommands";
import { TrainScreen } from "../../src/ui/screens/train/TrainScreen";

/**
 * GRAYSON-TRAIN-EDIT-001: fix any logged set from a past session's record or the live workout.
 * VITE_WALKTHROUGH_SHOTS=<dir> saves the PR screenshots.
 */
const SHOTS = import.meta.env.VITE_WALKTHROUGH_SHOTS as string | undefined;
const CHEST = "machine-chest-press";
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute);

async function settle(ms = 120) { await new Promise<void>((r) => setTimeout(r, ms)); }
async function shot(name: string, el: Element | null) {
  if (!SHOTS || !el) return;
  await settle();
  await page.screenshot({ path: `${SHOTS}/${name}.png`, element: el as HTMLElement });
}
async function axeClean(label: string, root: Element | null) {
  expect(root, label).not.toBeNull();
  const r = await axe.run(root!, { runOnly: ["wcag2a", "wcag2aa"] });
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), label).toEqual([]);
}
async function noOverflow(label: string, root: () => Element | null, name?: string) {
  for (const width of [320, 360, 412]) {
    await page.viewport(width, 900);
    await settle();
    expect(document.documentElement.scrollWidth, `${label} at ${width}`).toBeLessThanOrEqual(width);
    if (name && width !== 360) await shot(`${width}-${name}`, root());
  }
  await page.viewport(360, 900);
}
const record = () => document.querySelector('[aria-labelledby="session-record-heading"]');
const sheet = () => document.querySelector("[data-set-fix-sheet]");

async function pastWorkout(withSkip = false) {
  vi.setSystemTime(at(16, 16, 30));
  const d = await startDay(at(16, 16, 30).toISOString());
  await submitCheckIn(d.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
  vi.setSystemTime(at(16, 18));
  const s = await startWorkout(d.id, "A", "STANDARD");
  vi.setSystemTime(at(16, 18, 1)); await logSet(d.id, s.id, CHEST, 1, 1350, 10);
  vi.setSystemTime(at(16, 18, 3)); await logSet(d.id, s.id, CHEST, 2, 135, 10);
  vi.setSystemTime(at(16, 18, 5));
  if (withSkip) await skipSet(d.id, s.id, CHEST, 3); else await logSet(d.id, s.id, CHEST, 3, 135, 9);
  vi.setSystemTime(at(16, 18, 30));
  await completeWorkout(d.id, s.id, "STANDARD", withSkip ? "PARTIAL" : "COMPLETED");
  vi.setSystemTime(at(17, 16, 29));
  await endDay(d.id);
  vi.setSystemTime(at(17, 17));
  await startDay(at(17, 16, 30).toISOString());
}
async function openRecord() {
  const screen = await render(<TrainScreen />);
  await screen.getByRole("button", { name: "HISTORY", exact: true }).click();
  await screen.getByRole("list").getByRole("button").first().click();
  await expect.poll(() => record()?.querySelector(".set-fix-row")).not.toBeNull();
  // The record moves focus to its heading once it loads (an effect after paint). Wait for that, so a row the test
  // focuses next keeps focus (#727 CI: Enter landed on the heading when the effect ran after the test's focus()).
  await expect.poll(() => document.activeElement?.id).toBe("session-record-heading");
  return screen;
}

beforeEach(async () => {
  await page.viewport(360, 900);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(at(17, 17));
  localStorage.clear();
});
afterEach(async () => {
  await cleanup();
  vi.useRealTimers();
});

describe("GRAYSON-TRAIN-EDIT-001 fix any logged set", () => {
  it("fixes a past set by keyboard, undoes within the window, shows the edited mark and puts it back", async () => {
    await pastWorkout();
    const screen = await openRecord();
    await shot("360-past-session-record", record());
    const row = screen.getByRole("button", { name: /^Set 1 · 1350 lb × 10\. Fix this set$/ });
    (row.element() as HTMLElement).focus();
    await userEvent.keyboard("{Enter}");
    await expect.element(screen.getByRole("heading", { name: "Fix Machine Chest Press, set 1" })).toBeVisible();
    await expect.poll(() => (document.activeElement as HTMLElement).textContent).toBe("Fix Machine Chest Press, set 1");
    await axeClean("fix sheet", sheet());
    await shot("360-fix-sheet", sheet());
    await noOverflow("fix sheet", sheet, "fix-sheet");

    await screen.getByRole("spinbutton", { name: "Weight (lb)" }).fill("135");
    await screen.getByRole("button", { name: "SAVE" }).click();
    await expect.element(screen.getByText("Fixed: set 1, 135 lb × 10.")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: /^Set 1 · 135 lb × 10\. Fix this set$/ })).toBeVisible();
    await shot("360-undo-toast", document.querySelector(".set-fix-undo"));
    await screen.getByRole("button", { name: "UNDO" }).click();
    await expect.element(screen.getByRole("button", { name: /^Set 1 · 1350 lb × 10\. Fix this set$/ })).toBeVisible();

    // Fix again, let the window pass, then put it back from the edited detail.
    await screen.getByRole("button", { name: /^Set 1 · 1350 lb × 10/ }).click();
    await screen.getByRole("spinbutton", { name: "Weight (lb)" }).fill("135");
    await screen.getByRole("button", { name: "SAVE" }).click();
    await expect.element(screen.getByRole("button", { name: /^Set 1 · 135 lb × 10/ })).toBeVisible();
    await screen.getByText("edited", { exact: true }).click();
    // The undone first fix stays in the detail, marked "undone"; the standing one is last.
    await expect.element(screen.getByText(/^Was 1350 lb × 10, now 135 lb × 10 · .* · undone$/)).toBeVisible();
    await expect.element(screen.getByText(/^Was 1350 lb × 10, now 135 lb × 10 · [^·]+$/)).toBeVisible();
    await shot("360-edited-detail", document.querySelector(".set-fix-history"));
    await axeClean("record with edit", record());
    await screen.getByRole("button", { name: "PUT IT BACK" }).click();
    await expect.element(screen.getByRole("button", { name: /^Set 1 · 1350 lb × 10/ })).toBeVisible();
    await noOverflow("record", record, "past-session-record");
  });

  it("removes a set and puts it back, and adds a set he forgot", async () => {
    await pastWorkout();
    const screen = await openRecord();
    await screen.getByRole("button", { name: /^Set 2 · 135 lb × 10/ }).click();
    await screen.getByRole("button", { name: "REMOVE SET" }).click();
    await expect.element(screen.getByText("Removed: set 2.")).toBeVisible();
    await expect.element(screen.getByText("Set 2 · removed")).toBeVisible();
    await shot("360-removed-set", record());
    await screen.getByRole("button", { name: "Put set 2 of Machine Chest Press back" }).click();
    await expect.element(screen.getByRole("button", { name: /^Set 2 · 135 lb × 10/ })).toBeVisible();

    await screen.getByRole("button", { name: "Add a set" }).click();
    await expect.element(screen.getByRole("heading", { name: "Add a set to Machine Chest Press" })).toBeVisible();
    await screen.getByRole("spinbutton", { name: "Reps" }).fill("8");
    await shot("360-add-a-set", sheet());
    await screen.getByRole("button", { name: "SAVE" }).click();
    await expect.element(screen.getByText("Added: 135 lb × 8.")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: /^Set 4 · 135 lb × 8/ })).toBeVisible();
    // Set 2 (removed, put back) and the added set 4 both carry the edited mark.
    await expect.poll(() => record()!.querySelectorAll(".set-fix-history").length).toBe(2);
  });

  it("fills in a skipped set", async () => {
    await pastWorkout(true);
    const screen = await openRecord();
    await screen.getByRole("button", { name: /^Set 3 · skipped/ }).click();
    await expect.element(screen.getByRole("heading", { name: "Fill in Machine Chest Press, set 3" })).toBeVisible();
    await screen.getByRole("spinbutton", { name: "Weight (lb)" }).fill("135");
    await screen.getByRole("spinbutton", { name: "Reps" }).fill("8");
    await shot("360-fill-in-skipped", sheet());
    await screen.getByRole("button", { name: "SAVE" }).click();
    await expect.element(screen.getByText("Filled in: set 3, 135 lb × 8.")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: /^Set 3 · 135 lb × 8/ })).toBeVisible();
  });

  it("opens a live set mid-workout and fixes it", async () => {
    vi.setSystemTime(at(17, 17));
    const d = await startDay(at(17, 16, 30).toISOString());
    await submitCheckIn(d.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 });
    const s = await startWorkout(d.id, "A", "STANDARD");
    await logSet(d.id, s.id, CHEST, 1, 185, 10);
    await logSet(d.id, s.id, CHEST, 2, 175, 10);
    const screen = await render(<TrainScreen />);
    await screen.getByRole("button", { name: "Fix set 1" }).click();
    await expect.element(screen.getByRole("heading", { name: "Fix Machine Chest Press, set 1" })).toBeVisible();
    await shot("360-live-set-opened", sheet());
    await axeClean("live sheet", sheet());
    await noOverflow("live sheet", sheet, "live-set-opened");
    await screen.getByRole("spinbutton", { name: "Weight (lb)" }).fill("175");
    await screen.getByRole("button", { name: "SAVE" }).click();
    await expect.element(screen.getByText("Fixed: set 1, 175 lb × 10.")).toBeVisible();
    await expect.element(screen.getByText(/#1 — 175 lb x 10/)).toBeVisible();
  });
});
