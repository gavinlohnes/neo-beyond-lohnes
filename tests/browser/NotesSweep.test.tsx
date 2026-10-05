import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import { App } from "../../src/app/App";
import { NotesSweep, describeSweep } from "../../src/ui/components/NotesSweep";
import { captureItem, setWorkContext, startDay } from "../../src/application/commands";
import { getAllCaptureItems, getOpenCaptureItems } from "../../src/application/queries";
import { getObligations } from "../../src/application/intentQueries";
import { holdToConfirm } from "./helpers/hold";

/**
 * NOTES-SWEEP-001 (owner rulings 2026-10-04): on a day off, sweep open notes
 * one at a time — DONE, MAKE IT A TASK, KEEP, or hold DELETE (with UNDO).
 */

afterEach(() => {
  cleanup();
});

async function dayOffWithNotes(texts: string[]) {
  const day = await startDay();
  await setWorkContext(day.id, "OFF", "MANUAL");
  for (const text of texts) await captureItem(text);
  return day;
}

describe("NOTES-SWEEP-001 — day-off notes sweep", () => {
  it("shows on a day off with notes, not on a work day", async () => {
    const day = await dayOffWithNotes(["Call the dentist"]);
    const screen = await render(<App />);
    await expect.element(screen.getByText("Sweep your notes · 1 waiting")).toBeVisible();
    cleanup();

    await setWorkContext(day.id, "WORK", "MANUAL");
    const again = await render(<App />);
    await expect.element(again.getByRole("button", { name: "MORE", exact: true })).toBeVisible();
    expect(document.querySelector(".notes-sweep")).toBeNull();
  });

  it("each choice does what it says, and the end sums it up", async () => {
    await page.viewport(360, 800);
    await dayOffWithNotes(["Call the dentist", "Renew truck registration", "Idea: deadlift on Fridays", "Old grocery list"]);
    const onSwept = vi.fn();
    const screen = await render(<NotesSweep onSwept={onSwept} />);
    await screen.getByRole("button", { name: "SWEEP" }).click();

    await expect.element(screen.getByText("Call the dentist")).toBeVisible();
    await expect.element(screen.getByText(/^Note 1 of 4/)).toBeVisible();
    for (const name of ["DONE", "MAKE IT A TASK", "KEEP", "DELETE"]) {
      expect(screen.getByRole("button", { name, exact: true }).element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
    await screen.getByRole("button", { name: "DONE", exact: true }).click();

    await expect.element(screen.getByText("Renew truck registration")).toBeVisible();
    await screen.getByRole("button", { name: "MAKE IT A TASK" }).click();

    await expect.element(screen.getByText("Idea: deadlift on Fridays")).toBeVisible();
    await screen.getByRole("button", { name: "KEEP" }).click();

    await expect.element(screen.getByText("Old grocery list")).toBeVisible();
    // A quick tap on DELETE deletes nothing.
    await screen.getByRole("button", { name: "DELETE" }).click();
    expect((await getAllCaptureItems()).map((c) => c.text)).toContain("Old grocery list");
    await holdToConfirm(screen.getByRole("button", { name: "DELETE" }));

    await expect.element(screen.getByText("Swept 4: 1 done, 1 task, 1 kept, 1 deleted.")).toBeVisible();
    const all = await getAllCaptureItems();
    expect(all.map((c) => [c.text, c.status])).toEqual([
      ["Call the dentist", "RESOLVED"],
      ["Renew truck registration", "RESOLVED"],
      ["Idea: deadlift on Fridays", "OPEN"],
    ]);
    expect((await getObligations()).map((o) => o.title)).toEqual(["Renew truck registration"]);

    await screen.getByRole("button", { name: "CLOSE" }).click();
    expect(onSwept).toHaveBeenCalledTimes(1);
    // The kept note is still waiting.
    await expect.element(screen.getByText("Sweep your notes · 1 waiting")).toBeVisible();
  });

  it("UNDO brings a deleted note back exactly as it was", async () => {
    await dayOffWithNotes(["Old grocery list", "Call the dentist"]);
    const before = (await getOpenCaptureItems())[0]!;
    const screen = await render(<NotesSweep onSwept={() => {}} />);
    await screen.getByRole("button", { name: "SWEEP" }).click();
    await holdToConfirm(screen.getByRole("button", { name: "DELETE" }));
    await expect.element(screen.getByText("Call the dentist")).toBeVisible();
    expect((await getAllCaptureItems()).map((c) => c.text)).toEqual(["Call the dentist"]);

    await screen.getByRole("button", { name: "UNDO", exact: true }).click();
    await expect.element(screen.getByText("Old grocery list")).toBeVisible();
    expect((await getOpenCaptureItems())[0]).toEqual(before);
  });

  it("KEEP writes nothing", async () => {
    await dayOffWithNotes(["Call the dentist"]);
    const before = await getAllCaptureItems();
    const screen = await render(<NotesSweep onSwept={() => {}} />);
    await screen.getByRole("button", { name: "SWEEP" }).click();
    await screen.getByRole("button", { name: "KEEP" }).click();
    await expect.element(screen.getByText("Swept 1: 1 kept.")).toBeVisible();
    expect(await getAllCaptureItems()).toEqual(before);
  });

  it("sums up only what happened", () => {
    expect(describeSweep(["DONE", "DONE", "TASK"])).toBe("Swept 3: 2 done, 1 task.");
    expect(describeSweep(["TASK", "TASK"])).toBe("Swept 2: 2 tasks.");
  });
});
