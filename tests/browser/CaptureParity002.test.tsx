import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "vitest-browser-react";
import { captureItem, setWorkContext, startDay } from "../../src/application/commands";
import { DailyControls } from "../../src/ui/screens/today/TodayScreen";
import { db } from "../../src/persistence/db";

/**
 * CAPTURE-PARITY-002: in MORE → TODAY TOOLS an open capture is listed once.
 * Before, Attention and the TOOLS Capture card both listed every open capture,
 * so → TASK opened the same task form in two rows at once.
 */
afterEach(async () => {
  await cleanup();
});

async function dayWith(context: "OFF" | "WORK", texts: string[]) {
  const day = await startDay();
  await setWorkContext(day.id, context, "MANUAL");
  for (const text of texts) await captureItem(text);
  // Mounted the way MORE → TODAY TOOLS mounts it (MoreScreen: openToolsOnMount, no focus).
  return render(<DailyControls openToolsOnMount />);
}

function taskButtons() {
  return [...document.querySelectorAll("button")].filter((button) => button.textContent === "→ TASK");
}

describe("CAPTURE-PARITY-002 — one row per open capture in TODAY TOOLS", () => {
  it("a work day lists each open capture once, in Attention, and TOOLS keeps the capture box", async () => {
    const screen = await dayWith("WORK", ["Call the dentist", "Renew truck registration"]);
    await expect.element(screen.getByText("CAPTURE (2)").first()).toBeVisible();
    await expect.poll(() => taskButtons().length).toBe(2);
    expect(screen.getByText("Call the dentist", { exact: true }).elements()).toHaveLength(1);
    expect(screen.getByText("Renew truck registration", { exact: true }).elements()).toHaveLength(1);
    const attention = screen.getByText("Call the dentist", { exact: true }).element().closest(".signal-row");
    expect(attention).not.toBeNull();
    // The TOOLS card still captures.
    await expect.element(screen.getByRole("textbox", { name: "Capture a thought" })).toBeVisible();
  });

  it("→ TASK opens one task form, and CANCEL closes it without a write", async () => {
    const screen = await dayWith("WORK", ["Call the dentist", "Renew truck registration"]);
    await expect.poll(() => taskButtons().length).toBe(2);
    taskButtons()[0]!.click();
    await expect.element(screen.getByRole("textbox", { name: "Task title", exact: true })).toHaveValue("Call the dentist");
    expect(screen.getByRole("textbox", { name: "Task title", exact: true }).elements()).toHaveLength(1);
    expect(screen.getByRole("button", { name: "CANCEL", exact: true }).elements()).toHaveLength(1);
    await screen.getByRole("button", { name: "CANCEL", exact: true }).click();
    await expect.poll(() => screen.getByRole("textbox", { name: "Task title", exact: true }).elements().length).toBe(0);
    expect(await db.obligations.count()).toBe(0);
    expect((await db.captureItems.toArray()).every((item) => item.status === "OPEN")).toBe(true);
  });

  it("a confirmed task from the single row resolves that capture once and leaves the other listed once", async () => {
    const screen = await dayWith("WORK", ["Call the dentist", "Renew truck registration"]);
    await expect.poll(() => taskButtons().length).toBe(2);
    taskButtons()[0]!.click();
    await screen.getByRole("button", { name: "CREATE TASK", exact: true }).click();
    await expect.element(screen.getByText(/Task created: Call the dentist/)).toBeVisible();
    expect(await db.obligations.count()).toBe(1);
    await expect.poll(() => taskButtons().length).toBe(1);
    expect(screen.getByText("Renew truck registration", { exact: true }).elements()).toHaveLength(1);
  });

  it("on a day off Attention still points to the sweep and the rows stay reachable once, in TOOLS", async () => {
    const screen = await dayWith("OFF", ["Call the dentist", "Renew truck registration"]);
    await expect.element(screen.getByText(/2 notes waiting\. SWEEP above/)).toBeVisible();
    await expect.poll(() => taskButtons().length).toBe(2);
    const pointer = screen.getByText(/2 notes waiting\. SWEEP above/).element().closest(".signal-row")!;
    expect(pointer.querySelectorAll("button")).toHaveLength(0);
    expect(screen.getByText("Call the dentist", { exact: true }).elements()).toHaveLength(1);
  });
});
