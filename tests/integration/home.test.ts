import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { addHomeItem, getHomeView, repeatRule } from "../../src/application/homeCommands";
import { satisfyObligation } from "../../src/application/intentCommands";
import { confirmProposal, describeProposal, toProposal } from "../../src/application/alfred/alfredActions";
import { deriveNextOccurrenceDate } from "../../src/engine/recurrence";

/** HOME-001. Invented house details only. */
beforeEach(async () => { await db.open(); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 31, 17)); });
afterEach(() => { vi.useRealTimers(); db.close(); });

it("saves a fact and an every-3-months job together; the next one comes round on schedule", async () => {
  const { memory, reminder } = await addHomeItem({ item: "Furnace filter", details: "16x25x1", repeat: { every: 3, unit: "MONTHS", firstDue: "2026-11-15" } });
  expect(memory).toMatchObject({ topic: "HOME", text: "Furnace filter: 16x25x1" });
  expect(reminder).toMatchObject({ title: "Home: Furnace filter", dueAt: "2026-11-15", description: "16x25x1" });
  await satisfyObligation(reminder!.id);
  const next = (await db.obligations.toArray()).find((o) => o.status === "OPEN")!;
  expect(next).toMatchObject({ title: "Home: Furnace filter", dueAt: "2027-02-15" });
  const view = await getHomeView();
  expect(view.due.map((d) => [d.reminder.title, d.daysAway])).toEqual([["Home: Furnace filter", 107]]);
  expect(view.facts.map((f) => f.text)).toEqual(["Furnace filter: 16x25x1"]);
});

it("keeps a fact on its own, or a job on its own, and refuses an empty or broken item", async () => {
  await addHomeItem({ item: "Water heater", details: "Model AB-40, warranty to 2030" });
  await addHomeItem({ item: "Smoke alarm batteries", repeat: { every: 1, unit: "YEARS", firstDue: "2027-01-01" } });
  expect(await db.alfredMemories.count()).toBe(1);
  expect(await db.obligations.count()).toBe(1);
  await expect(addHomeItem({ item: "Gutters" })).rejects.toThrow("NOTHING_TO_KEEP");
  await expect(addHomeItem({ item: "Gutters", details: "x", repeat: { every: 0, unit: "MONTHS", firstDue: "2026-11-01" } })).rejects.toThrow("INVALID_REPEAT");
  await expect(addHomeItem({ item: "Gutters", details: "x", repeat: { every: 2, unit: "MONTHS", firstDue: "soon" } })).rejects.toThrow("INVALID_DATE");
  expect(await db.alfredMemories.count()).toBe(1);
});

it("rolls the fact back if the job can't be saved", async () => {
  const spy = vi.spyOn(db.obligations, "add").mockRejectedValueOnce(new Error("disk full"));
  await expect(addHomeItem({ item: "Filter", details: "16x25x1", repeat: { every: 3, unit: "MONTHS", firstDue: "2026-11-15" } })).rejects.toThrow();
  spy.mockRestore();
  expect(await db.alfredMemories.count()).toBe(0);
});

it("weekly rules stay on their weekday", () => {
  expect(deriveNextOccurrenceDate(repeatRule(2, "WEEKS", "2026-11-02"), "2026-11-05")).toBe("2026-11-16");
});

it("Alfred's home card describes itself and saves on confirm; needs a date to repeat", async () => {
  const p = toProposal("home_item", { item: "Furnace filter", details: "16x25x1", every: 3, unit: "MONTHS", first_due: "2026-11-15" })!;
  expect(describeProposal(p)).toBe("Home: Furnace filter · 16x25x1 · every 3 months from 2026-11-15");
  expect(toProposal("home_item", { item: "Gutters", every: 6, unit: "MONTHS" })).toBeNull();
  expect(describeProposal(toProposal("home_item", { item: "Plumber", details: "Ace Plumbing" })!)).toBe("Home: Plumber · Ace Plumbing");
  await confirmProposal(p);
  expect((await getHomeView()).due[0]!.reminder.title).toBe("Home: Furnace filter");
});

it("yearly home jobs stay out of People; bad repeats and impossible person dates are refused up front", async () => {
  const { getPeopleView, anchorRule } = await import("../../src/application/peopleCommands");
  await addHomeItem({ item: "Smoke alarm batteries", repeat: { every: 1, unit: "YEARS", firstDue: "2027-01-01" } });
  expect((await getPeopleView()).upcoming).toEqual([]);
  expect(() => anchorRule("FREQ=WEEKLY;INTERVAL=abc", "2026-11-02")).toThrow();
  expect(toProposal("person_date", { person: "Sam", occasion: "Birthday", month: 2, day: 30 })).toBeNull();
  expect(toProposal("person_date", { person: "Sam", occasion: "Birthday", month: 2, day: 29 })).not.toBeNull();
});
