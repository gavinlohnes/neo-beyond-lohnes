import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import { WeeklyInterviewView } from "../../src/ui/screens/weekly/WeeklyInterviewView";
import { startDay } from "../../src/application/commands";
import { db } from "../../src/persistence/db";
import { seedRotation } from "./helpers/rotation";

/** BIG-IDEAS-001 item 5: the week as recorded, a short interview, and saving only on CONFIRM. */
beforeEach(async () => { await page.viewport(360, 800); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it("shows the recorded week, previews before saving, then adds a #timeline note and, separately, a plan item", async () => {
  await seedRotation();
  const now = new Date(2026, 9, 27, 12);
  vi.setSystemTime(now);
  const today = await startDay();
  const before = { notes: await db.dailyNotes.count(), obligations: await db.obligations.count(), events: await db.events.count() };

  const screen = await render(<WeeklyInterviewView now={now} />);
  await expect.element(screen.getByText(/^THE WEEK AS RECORDED · /)).toBeVisible();
  await expect.poll(() => screen.container.querySelectorAll("[data-timeline-day]").length).toBe(7);
  // Every seeded day has sleep and a check-in, so each line shows them.
  for (const li of screen.container.querySelectorAll("[data-timeline-day]")) expect(li.textContent).toMatch(/(Shift|Day off) · sleep \d+\.\d h · energy \d of 5/);
  await expect.element(screen.getByText(/was your highest-energy day this week\. What made it work\?$/)).toBeVisible();
  await expect.element(screen.getByText(/had your shortest sleep this week\. What got in the way\?$/)).toBeVisible();
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);

  await userEvent.fill(screen.getByLabelText(/What made it work\?$/), "Slept after the shift");
  await userEvent.fill(screen.getByLabelText("What's one thing to carry into next week?"), "Nap before the first night");
  await screen.getByRole("button", { name: "SAVE TO NOTE" }).click();
  const preview = screen.getByRole("group", { name: "Preview" });
  await expect.element(preview.getByText(/^#timeline Week /)).toBeVisible();
  // The preview writes nothing.
  expect({ notes: await db.dailyNotes.count(), obligations: await db.obligations.count(), events: await db.events.count() }).toEqual(before);
  await preview.getByRole("button", { name: "CONFIRM" }).click();
  await expect.element(screen.getByText(/^Saved to the note for .*, tagged #timeline\.$/)).toBeVisible();
  const note = (await db.dailyNotes.get(today.id))!.text;
  expect(note).toMatch(/^#timeline Week /);
  expect(note).toContain("A: Slept after the shift");
  expect(note).toContain("A: Nap before the first night");
  expect(await db.obligations.count()).toBe(before.obligations);
  await expect.element(screen.getByText(/^#timeline Week .*A: Slept after the shift/s)).toBeVisible();

  await screen.getByRole("button", { name: "ADD CARRY-FORWARD AS A PLAN ITEM" }).click();
  await screen.getByRole("group", { name: "Preview" }).getByRole("button", { name: "CONFIRM" }).click();
  await expect.element(screen.getByText("Added plan item: Nap before the first night.")).toBeVisible();
  const plans = (await db.obligations.toArray()).filter((o) => o.title === "Nap before the first night");
  expect(plans).toHaveLength(1);
  expect(plans[0]!.dueAt).toBeUndefined();
});
