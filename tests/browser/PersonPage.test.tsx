import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { page } from "vitest/browser";
import axe from "axe-core";
import { PeoplePanel } from "../../src/ui/components/PeoplePanel";
import { addPersonDate } from "../../src/application/peopleCommands";
import { getPersonPage } from "../../src/application/personQueries";
import { startDay } from "../../src/application/commands";
import { saveDailyNote } from "../../src/application/dailyNoteCommands";
import { db } from "../../src/persistence/db";

beforeEach(async () => { await page.viewport(360, 800); });
afterEach(async () => { await cleanup(); });

it("PEOPLE-PAGE-001: a person's page shows their dates, what you kept and what links to them, writing nothing", async () => {
  const day = await startDay();
  await addPersonDate({ person: "Sam", occasion: "Birthday", month: 3, day: 3 });
  await addPersonDate({ person: "Samantha", occasion: "Birthday", month: 5, day: 9 });
  await db.alfredMemories.add({ id: "f1", text: "Sam: likes black coffee", topic: "PERSON", savedAt: "2026-11-01T12:00:00.000Z" });
  await saveDailyNote(day.id, "Called [[Sam]] about Saturday.");
  const before = await db.events.count();

  const read = await getPersonPage("Sam");
  expect(read.state === "ready" && read.value.dates.length).toBe(1); // whole names only: Samantha is someone else

  const screen = await render(<PeoplePanel active />);
  await screen.getByRole("button", { name: "Sam", exact: true }).click();
  await expect.element(screen.getByRole("heading", { name: "Sam", exact: true })).toBeVisible();
  await expect.element(screen.getByText("Sam: likes black coffee")).toBeVisible();
  await expect.element(screen.getByRole("heading", { name: "Linked to Sam" })).toBeVisible();
  await expect.element(screen.getByRole("button", { name: /^Open daily note: / })).toBeVisible();
  expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(360);
  expect((await axe.run(screen.container)).violations).toEqual([]);
  await screen.getByRole("button", { name: "BACK TO PEOPLE" }).click();
  await expect.element(screen.getByRole("heading", { name: "THE PEOPLE WHO MATTER" })).toBeVisible();
  expect(await db.events.count()).toBe(before);
});

it("reads a person's name from their dates, not the occasion", async () => {
  await addPersonDate({ person: "Alex", occasion: "Anniversary", month: 6, day: 1 });
  const { getPeopleNames } = await import("../../src/application/personQueries");
  expect(await getPeopleNames()).toEqual(["Alex"]);
});
