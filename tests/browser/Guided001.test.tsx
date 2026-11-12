import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import { WeeklyInterviewView } from "../../src/ui/screens/weekly/WeeklyInterviewView";
import { startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";

/** GUIDED-001: the weekly interview always names its next step, and still saves only on CONFIRM. */
beforeEach(async () => { await page.viewport(390, 844); });
afterEach(async () => { await cleanup(); });

it("names the next step at each stage: answer, save to note, then the optional plan item", async () => {
  await startDay();
  const screen = await render(<WeeklyInterviewView />);
  const next = () => document.querySelector("[data-interview-next]")?.textContent ?? null;
  await expect.poll(next).toBe("Answer any question to save it to your note.");

  await userEvent.fill(screen.getByLabelText("What's one thing to carry into next week?"), "Rest first");
  await expect.poll(next).toBe("Next: SAVE TO NOTE shows exactly what will be added before anything saves.");
  expect(await db.dailyNotes.count()).toBe(0);

  await screen.getByRole("button", { name: "SAVE TO NOTE" }).click();
  // While the preview is open, the preview itself is the guidance.
  await expect.poll(next).toBe(null);
  await screen.getByRole("group", { name: "Preview" }).getByRole("button", { name: "CONFIRM" }).click();
  await expect.poll(next).toBe("Saved. Your carry-forward can also become a plan item, if you want one.");
  expect(await db.obligations.count()).toBe(0);

  await screen.getByRole("button", { name: "ADD CARRY-FORWARD AS A PLAN ITEM" }).click();
  await screen.getByRole("group", { name: "Preview" }).getByRole("button", { name: "CONFIRM" }).click();
  await expect.poll(next).toBe(null);
  await expect.poll(() => db.obligations.count()).toBe(1);
});
