import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { CaveMonthView } from "../../src/ui/screens/systems/CaveMonth";
import { startDay } from "../../src/application/commands";
import { saveDailyNote } from "../../src/application/dailyNoteCommands";
import { db } from "../../src/persistence/db";
import { seedRotation } from "./helpers/rotation";

/** YEAR-REVIEW-001: "Your year in BEYOND" opens on a tap under the month recap, adds the months up and writes nothing. */
beforeEach(async () => { await page.viewport(320, 800); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

it("adds the counted months up from records at 320px, names every month's status, and writes nothing", async () => {
  await seedRotation();
  const october = (await db.beyondDays.toArray()).filter((d) => d.startedAt.startsWith("2026-10-1"));
  await saveDailyNote(october[0]!.id, "Long night #nap");
  await saveDailyNote(october[1]!.id, "Slept well #nap");
  vi.setSystemTime(new Date(2026, 9, 27, 12));
  const before = { events: await db.events.count(), notes: JSON.stringify(await db.dailyNotes.toArray()) };

  const screen = await render(<CaveMonthView />);
  await screen.getByRole("button", { name: "SEE YOUR YEAR IN BEYOND" }).click();
  const year = screen.getByRole("region", { name: "Your year in BEYOND · 2026, so far" });
  await expect.element(year.getByText(/^Your year in BEYOND · [1-9]\d* of 12 months counted$/)).toBeVisible();
  await expect.element(year.getByText(/^Counted \d+ months? of 10: \d+ logged days/)).toBeVisible();
  await expect.element(year.getByText(/^#nap: 2 days, in 1 month$/)).toBeVisible();
  await year.getByText("Which months count").click();
  await expect.element(year.getByText("December: not yet")).toBeVisible();
  await expect.element(year.getByText(/^October: counted \(\d+ days logged\)$/)).toBeVisible();
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);

  await year.getByRole("button", { name: "DONE" }).click();
  await expect.element(screen.getByRole("button", { name: "SEE YOUR YEAR IN BEYOND" })).toBeVisible();
  expect({ events: await db.events.count(), notes: JSON.stringify(await db.dailyNotes.toArray()) }).toEqual(before);
});

it("a thin year says there is nothing to add up yet, and names the month", async () => {
  vi.setSystemTime(new Date(2026, 9, 27, 12));
  await startDay();
  const screen = await render(<CaveMonthView />);
  await screen.getByRole("button", { name: "SEE YOUR YEAR IN BEYOND" }).click();
  await expect.element(screen.getByText("No month had at least 7 logged days yet, so there is nothing to add up.")).toBeVisible();
  await expect.element(screen.getByText("Too little to count: October (1 day).")).toBeVisible();
  await expect.element(screen.getByText("Your year in BEYOND · 0 of 12 months counted")).toBeVisible();
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
});
