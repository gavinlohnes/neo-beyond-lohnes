import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import { App } from "../../src/app/App";
import { markWorkEnded, noteShiftHandoff, setWorkContext, startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";

/**
 * NOTES-HANDOFF-001 (owner rulings 2026-10-04): "Note for next shift?" right
 * after MARK WORK ENDED; "From last shift" at the top of the next work day.
 */

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function workDay() {
  const day = await startDay();
  await setWorkContext(day.id, "WORK", "MANUAL");
  return day;
}

describe("NOTES-HANDOFF-001 — shift handoff", () => {
  it("MARK WORK ENDED on TODAY brings up the question straight away; SAVE keeps the note", async () => {
    await page.viewport(360, 800);
    // The last hour of a Week A work night, when MARK WORK ENDED is on TODAY (see TodayScreen tests).
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 13, 5, 10));
    await workDay();
    const screen = await render(<App />);
    await expect.element(screen.getByRole("button", { name: "MARK WORK ENDED" })).toBeVisible();
    expect(document.querySelector(".shift-handoff")).toBeNull();

    await screen.getByRole("button", { name: "MARK WORK ENDED" }).click();
    const field = screen.getByRole("textbox", { name: "NOTE FOR NEXT SHIFT?" });
    await expect.element(field).toBeVisible();
    await field.fill("Truck 12 brakes still soft, check first thing");
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.element(screen.getByText("Saved for your next shift.")).toBeVisible();
    const [noted] = await db.events.where("type").equals("SHIFT_HANDOFF_NOTED").toArray();
    expect(noted?.payload).toMatchObject({ note: "Truck 12 brakes still soft, check first thing" });
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  });

  it("SKIP writes nothing and the question goes away", async () => {
    const day = await workDay();
    await markWorkEnded(day.id);
    const before = await db.events.count();
    const screen = await render(<App />);
    await screen.getByRole("button", { name: "SKIP", exact: true }).click();
    await expect.poll(() => document.querySelector(".shift-handoff")).toBeNull();
    expect(await db.events.count()).toBe(before);
  });

  it("the next work day opens with the note; GOT IT puts it away", async () => {
    const first = await workDay();
    await markWorkEnded(first.id);
    await noteShiftHandoff(first.id, "Truck 12 brakes still soft");
    await workDay();
    const screen = await render(<App />);
    await expect.element(screen.getByText("Truck 12 brakes still soft")).toBeVisible();
    await expect.element(screen.getByText(/^FROM LAST SHIFT · /)).toBeVisible();
    expect(screen.getByRole("button", { name: "GOT IT", exact: true }).element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    await screen.getByRole("button", { name: "GOT IT", exact: true }).click();
    await expect.poll(() => document.querySelector(".shift-handoff")).toBeNull();
    expect(await db.events.where("type").equals("SHIFT_HANDOFF_READ").count()).toBe(1);
  });
});
