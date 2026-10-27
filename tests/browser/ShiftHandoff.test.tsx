import { commandResult } from "./helpers/command";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import { App } from "../../src/app/App";
import { markWorkEnded, noteShiftHandoff, setWorkContext, startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";
import { closeShift } from "../../src/application/reflect";
import axe from "axe-core";

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
    await (await commandResult(screen, "TODAY TOOLS")).click();
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
    await (await commandResult(screen, "TODAY TOOLS")).click();
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
    await (await commandResult(screen, "TODAY TOOLS")).click();
    await expect.element(screen.getByText("Truck 12 brakes still soft")).toBeVisible();
    await expect.element(screen.getByText(/^FROM LAST SHIFT · /)).toBeVisible();
    // Inside TODAY, whose entrance animation briefly scales it; measure at rest.
    for (const animation of document.getAnimations()) animation.finish();
    expect(screen.getByRole("button", { name: "GOT IT", exact: true }).element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    await screen.getByRole("button", { name: "GOT IT", exact: true }).click();
    await expect.poll(() => document.querySelector(".shift-handoff")).toBeNull();
    expect(await db.events.where("type").equals("SHIFT_HANDOFF_READ").count()).toBe(1);
  });

  it("LOOP-002: the same prompt asks how the shift was; the note becomes the debrief's plan", async () => {
    await page.viewport(320, 800);
    const day = await workDay();
    await markWorkEnded(day.id);
    const screen = await render(<App />);
    await (await commandResult(screen, "TODAY TOOLS")).click();
    await screen.getByRole("button", { name: "Rough", exact: true }).click();
    await screen.getByRole("textbox", { name: "NOTE FOR NEXT SHIFT?" }).fill("Nap before");
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
    expect((await axe.run(document.querySelector(".shift-handoff")!)).violations).toEqual([]);
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.element(screen.getByText("Saved for your next shift.")).toBeVisible();
    expect((await db.events.where("type").equals("SHIFT_HANDOFF_NOTED").toArray())[0]?.payload).toMatchObject({ note: "Nap before" });
    expect(await db.decisionJournalEntries.toArray()).toEqual([expect.objectContaining({ title: "Shift debrief", decision: "Shift felt rough", expectation: "Next shift: Nap before", status: "OPEN" })]);
  });

  it("LOOP-002: how it felt without a note saves only the debrief and closes the prompt", async () => {
    const day = await workDay();
    await markWorkEnded(day.id);
    const screen = await render(<App />);
    await (await commandResult(screen, "TODAY TOOLS")).click();
    await screen.getByRole("button", { name: "Good", exact: true }).click();
    await screen.getByRole("button", { name: "SAVE", exact: true }).click();
    await expect.element(screen.getByText("Saved to your journal.")).toBeVisible();
    expect(await db.events.where("type").equals("SHIFT_HANDOFF_NOTED").count()).toBe(0);
    expect(await db.decisionJournalEntries.toArray()).toEqual([expect.objectContaining({ decision: "Shift felt good" })]);
    expect(screen.getByRole("textbox", { name: "NOTE FOR NEXT SHIFT?" }).elements()).toHaveLength(0);
  });

  it("LOOP-002: next shift, one tap says whether the plan happened and puts the note away", async () => {
    await page.viewport(360, 800);
    const first = await workDay();
    await markWorkEnded(first.id);
    await closeShift(first.id, { felt: "Rough", note: "Nap before" });
    await workDay();
    const screen = await render(<App />);
    await (await commandResult(screen, "TODAY TOOLS")).click();
    await expect.element(screen.getByText("Shift felt rough last time. Did this happen?")).toBeVisible();
    expect((await axe.run(document.querySelector(".shift-handoff")!)).violations).toEqual([]);
    await screen.getByRole("button", { name: "Did it", exact: true }).click();
    await expect.poll(() => document.querySelector(".shift-handoff")).toBeNull();
    expect(await db.events.where("type").equals("SHIFT_HANDOFF_READ").count()).toBe(1);
    expect(await db.decisionJournalEntries.toArray()).toEqual([expect.objectContaining({ status: "REVIEWED", outcome: "Did it" })]);
  });
});
