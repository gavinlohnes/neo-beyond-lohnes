import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page, userEvent } from "vitest/browser";
import axe from "axe-core";
import { CaveMonthView } from "../../src/ui/screens/systems/CaveMonth";
import { startDay } from "../../src/application/commands";
import { saveDailyNote } from "../../src/application/dailyNoteCommands";
import { db } from "../../src/persistence/db";
import { seedRotation } from "./helpers/rotation";

/** BIG-IDEAS-001 item 6: "Your month in BEYOND" plays card by card from records and writes nothing. */
beforeEach(async () => { await page.viewport(360, 800); });
afterEach(async () => { await cleanup(); vi.useRealTimers(); });

it("plays the month from records, one card at a time, and writes nothing", async () => {
  await seedRotation();
  const october = (await db.beyondDays.toArray()).filter((d) => d.startedAt.startsWith("2026-10-1"));
  await saveDailyNote(october[0]!.id, "Long night #nap");
  await saveDailyNote(october[1]!.id, "Slept well #nap #goodtalk");
  vi.setSystemTime(new Date(2026, 9, 27, 12));
  const before = { events: await db.events.count(), notes: JSON.stringify(await db.dailyNotes.toArray()) };

  const screen = await render(<CaveMonthView />);
  await screen.getByRole("button", { name: "PLAY YOUR MONTH IN BEYOND" }).click();
  const recap = screen.getByRole("region", { name: /^Your month in BEYOND · October 2026, so far$/ });
  await expect.element(recap.getByText(/^You recorded \d+ days/)).toBeVisible();
  await expect.element(recap.getByText(/^Your month in BEYOND · 1 of \d+$/)).toBeVisible();
  expect((await axe.run(screen.container, { rules: { "color-contrast": { enabled: false } } })).violations).toEqual([]);
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);

  const seen: string[] = [];
  for (let i = 0; i < 10; i++) {
    seen.push(screen.container.querySelector("[data-recap-card]")!.getAttribute("data-recap-card")!);
    const next = recap.getByRole("button", { name: "NEXT" });
    if (!next.elements().length) break;
    await next.click();
  }
  // The seeded rotation has check-ins on work runs, workouts and the two tagged notes above.
  expect(seen).toEqual(expect.arrayContaining(["MONTH", "BEST_RUN", "TAGS"]));
  await expect.element(recap.getByText("#nap: 2 days")).toBeInTheDocument();
  await recap.getByRole("button", { name: "DONE" }).click();
  await expect.element(screen.getByRole("button", { name: "PLAY YOUR MONTH IN BEYOND" })).toBeVisible();
  expect({ events: await db.events.count(), notes: JSON.stringify(await db.dailyNotes.toArray()) }).toEqual(before);
});

it("GUIDANCE-001: a thin month says what fills the recap in", async () => {
  vi.setSystemTime(new Date(2026, 9, 27, 12));
  await startDay();
  const screen = await render(<CaveMonthView />);
  await screen.getByRole("button", { name: "PLAY YOUR MONTH IN BEYOND" }).click();
  await expect.element(screen.getByText(/^Your month in BEYOND · 1 of 1$/)).toBeVisible();
  await expect.element(screen.getByText("More cards appear as you log days: check-ins, workouts, notes and Garmin-timed sleep.", { exact: true })).toBeVisible();
});

it("WEEKLY-CLOSE-001: the last card offers one thing to carry into next month, saved only on CONFIRM", async () => {
  vi.setSystemTime(new Date(2026, 9, 27, 12));
  await startDay();
  const screen = await render(<CaveMonthView />);
  await screen.getByRole("button", { name: "PLAY YOUR MONTH IN BEYOND" }).click();
  await userEvent.fill(screen.getByLabelText("What's one thing to carry into next month?"), "Earlier bedtimes on days off");
  await screen.getByRole("button", { name: "ADD AS A PLAN ITEM" }).click();
  expect(await db.obligations.count()).toBe(0);
  await screen.getByRole("group", { name: "Preview" }).getByRole("button", { name: "CONFIRM" }).click();
  await expect.element(screen.getByText("Added plan item: Earlier bedtimes on days off. It has no day yet; find it in MORE → PLAN TODAY, under No date.")).toBeVisible();
  const [item] = await db.obligations.toArray();
  expect([item!.title, item!.description, item!.plannedAt]).toEqual(["Earlier bedtimes on days off", "From your month recap.", undefined]);
  await expect.element(screen.getByRole("button", { name: "ADD AS A PLAN ITEM" })).toBeDisabled();
});
