import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { render, cleanup } from "vitest-browser-react";
import axe from "axe-core";
import { NotesSweep } from "../../src/ui/components/NotesSweep";
import { captureItem, setWorkContext, startDay, submitCheckIn } from "../../src/application/commands";
import { DailyControls as TodayScreen } from "../../src/ui/screens/today/TodayScreen";
import { convertCaptureToObligation } from "../../src/application/intentCommands";
import { db } from "../../src/persistence/db";

/**
 * CAPTURE-PARITY-001 (owner-approved ranked item, 2026-11-15): an older
 * capture processed later — in Notes Sweep or the older Capture list —
 * offers the same confirm-first title / planned day / due date choices as
 * quick capture, through the same convertCaptureToObligation command.
 */
vi.mock("../../src/application/intentCommands", async (load) => {
  const actual = await load<typeof import("../../src/application/intentCommands")>();
  return { ...actual, convertCaptureToObligation: vi.fn(actual.convertCaptureToObligation) };
});

afterEach(async () => {
  await cleanup();
  vi.mocked(convertCaptureToObligation).mockReset();
});

async function settle() {
  for (const animation of document.getAnimations()) if (animation.effect?.getComputedTiming().iterations !== Infinity) animation.finish();
}

const GREEN = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };

/** TODAY's attention-tier Capture list, exactly as TodayScreen.test reaches it. */
async function captureList(texts: string[]) {
  for (const text of texts) await captureItem(text);
  const day = await startDay();
  await submitCheckIn(day.id, GREEN);
  return render(<TodayScreen />);
}

async function dayWith(context: "OFF" | "WORK", texts: string[]) {
  const day = await startDay();
  await setWorkContext(day.id, context, "MANUAL");
  for (const text of texts) await captureItem(text);
  return day;
}

describe("CAPTURE-PARITY-001 — Notes Sweep", () => {
  it("MAKE IT A TASK previews the same fields; CANCEL writes nothing and returns to the four choices", async () => {
    await dayWith("OFF", ["Call the bank next Tuesday"]);
    const screen = await render(<NotesSweep onSwept={() => {}} />);
    await screen.getByRole("button", { name: "SWEEP", exact: true }).click();
    await screen.getByRole("button", { name: "MAKE IT A TASK", exact: true }).click();
    await expect.element(screen.getByRole("textbox", { name: "Task title", exact: true })).toHaveValue("Call the bank next Tuesday");
    // Same as quick capture: no date is inferred from the words.
    await expect.element(screen.getByLabelText("Planned day (optional)")).toHaveValue("");
    await expect.element(screen.getByLabelText("Due date (optional)")).toHaveValue("");
    expect(await db.obligations.count()).toBe(0);
    await screen.getByRole("button", { name: "CANCEL", exact: true }).click();
    for (const name of ["DONE", "MAKE IT A TASK", "KEEP", "DELETE"]) await expect.element(screen.getByRole("button", { name, exact: true })).toBeVisible();
    expect(await db.obligations.count()).toBe(0);
    expect((await db.captureItems.toArray())[0]?.status).toBe("OPEN");
  });

  it("confirmed plan item carries title, planned day and due date with its source capture, once", async () => {
    await dayWith("OFF", ["A long thought about the truck registration"]);
    const capture = (await db.captureItems.toArray())[0]!;
    const screen = await render(<NotesSweep onSwept={() => {}} />);
    await screen.getByRole("button", { name: "SWEEP", exact: true }).click();
    await screen.getByRole("button", { name: "MAKE IT A TASK", exact: true }).click();
    await screen.getByRole("textbox", { name: "Task title", exact: true }).fill("Renew registration");
    await screen.getByLabelText("Planned day (optional)").fill("2026-11-20");
    await screen.getByLabelText("Due date (optional)").fill("2026-11-23");
    const save = screen.getByRole("button", { name: "CREATE PLAN ITEM", exact: true }).element() as HTMLButtonElement;
    save.click(); save.click();
    await expect.element(screen.getByText("Swept 1: 1 task.", { exact: true })).toBeVisible();
    expect(vi.mocked(convertCaptureToObligation)).toHaveBeenCalledTimes(1);
    expect(await db.obligations.toArray()).toEqual([expect.objectContaining({ title: "Renew registration", plannedAt: "2026-11-20", dueAt: "2026-11-23" })]);
    expect(await db.captureItems.get(capture.id)).toMatchObject({ text: capture.text, status: "RESOLVED" });
    const event = (await db.events.where("type").equals("OBLIGATION_CREATED").toArray())[0]!;
    expect(event.payload).toMatchObject({ sourceCaptureId: capture.id });
  });

  it("a failed task keeps the note open and the typed draft for an explicit retry", async () => {
    await dayWith("OFF", ["Keep it safe"]);
    const screen = await render(<NotesSweep onSwept={() => {}} />);
    await screen.getByRole("button", { name: "SWEEP", exact: true }).click();
    await screen.getByRole("button", { name: "MAKE IT A TASK", exact: true }).click();
    await screen.getByRole("textbox", { name: "Task title", exact: true }).fill("My chosen task");
    await screen.getByLabelText("Due date (optional)").fill("2026-11-23");
    vi.mocked(convertCaptureToObligation).mockRejectedValueOnce(new Error("Task storage unavailable"));
    await screen.getByRole("button", { name: "CREATE TASK", exact: true }).click();
    await expect.element(screen.getByRole("alert")).toBeVisible();
    expect(await db.obligations.count()).toBe(0);
    expect((await db.captureItems.toArray())[0]?.status).toBe("OPEN");
    await expect.element(screen.getByRole("textbox", { name: "Task title", exact: true })).toHaveValue("My chosen task");
    await expect.element(screen.getByLabelText("Due date (optional)")).toHaveValue("2026-11-23");
    await screen.getByRole("button", { name: "CREATE TASK", exact: true }).click();
    await expect.poll(() => db.obligations.count()).toBe(1);
    expect((await db.obligations.toArray())[0]).toMatchObject({ title: "My chosen task", dueAt: "2026-11-23" });
  });

  it.each([320, 375])("the sweep's task form fits %spx and passes axe", async (width) => {
    await page.viewport(width, 850);
    await dayWith("OFF", ["A thought that needs no folder or type, and is long enough to wrap twice on a small phone"]);
    const screen = await render(<NotesSweep onSwept={() => {}} />);
    await screen.getByRole("button", { name: "SWEEP", exact: true }).click();
    await screen.getByRole("button", { name: "MAKE IT A TASK", exact: true }).click();
    await expect.element(screen.getByRole("textbox", { name: "Task title", exact: true })).toBeVisible();
    await settle();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    for (const name of ["CREATE TASK", "CANCEL"]) {
      expect(screen.getByRole("button", { name, exact: true }).element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
    expect((await axe.run(screen.container)).violations).toEqual([]);
  });
});

describe("CAPTURE-PARITY-001 — older Capture list", () => {
  it("→ TASK offers a planned day too; a plan item keeps both dates and resolves the capture", async () => {
    const screen = await captureList(["renew the car registration"]);
    const capture = (await db.captureItems.toArray())[0]!;
    await screen.getByRole("button", { name: "→ TASK" }).click();
    await expect.element(screen.getByRole("textbox", { name: "Task title", exact: true })).toHaveValue("renew the car registration");
    await screen.getByLabelText("Planned day (optional)").fill("2026-11-20");
    await screen.getByLabelText("Due date (optional)").fill("2026-11-23");
    await screen.getByRole("button", { name: "CREATE PLAN ITEM", exact: true }).click();
    await expect.element(screen.getByText(/Plan item created: renew the car registration/)).toBeVisible();
    expect(vi.mocked(convertCaptureToObligation)).toHaveBeenCalledWith(capture.id, { title: "renew the car registration", plannedAt: "2026-11-20", dueAt: "2026-11-23" });
    expect(await db.obligations.toArray()).toEqual([expect.objectContaining({ plannedAt: "2026-11-20", dueAt: "2026-11-23" })]);
    expect((await db.captureItems.get(capture.id))?.status).toBe("RESOLVED");
  });

  it("a capture processed elsewhere is named plainly and the typed draft stays", async () => {
    const screen = await captureList(["handled on another screen"]);
    const capture = (await db.captureItems.toArray())[0]!;
    await screen.getByRole("button", { name: "→ TASK" }).click();
    await screen.getByRole("textbox", { name: "Task title", exact: true }).fill("My typed title");
    await convertCaptureToObligation(capture.id, { title: "Elsewhere" });
    await screen.getByRole("button", { name: "CREATE TASK", exact: true }).click();
    await expect.element(screen.getByText(/already processed or removed elsewhere/)).toBeVisible();
    await expect.element(screen.getByRole("textbox", { name: "Task title", exact: true })).toHaveValue("My typed title");
    expect(await db.obligations.count()).toBe(1);
  });

  it("the Capture list's task form fits 320px and passes axe", async () => {
    await page.viewport(320, 850);
    const screen = await captureList(["call the dentist tomorrow about the long-standing appointment"]);
    await screen.getByRole("button", { name: "→ TASK" }).click();
    const form = screen.getByRole("group", { name: "OPTIONAL · CREATE A TASK OR PLAN ITEM" });
    await expect.element(form).toBeVisible();
    // The older list's detected-date proposal survives, still editable and clearable.
    await expect.element(screen.getByText(/Detected from/)).toBeVisible();
    await settle();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
    expect((await axe.run(form.element())).violations).toEqual([]);
  });
});
