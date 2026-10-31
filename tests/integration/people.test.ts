import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { addPersonDate, anchorRule, getPeopleView, nextAnnualDate } from "../../src/application/peopleCommands";
import { confirmProposal, toProposal, describeProposal } from "../../src/application/alfred/alfredActions";
import { satisfyObligation } from "../../src/application/intentCommands";
import { deriveNextOccurrenceDate } from "../../src/engine/recurrence";

/** RELATIONSHIPS-001. Invented people only. */
beforeEach(async () => { await db.open(); vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date(2026, 9, 31, 17)); });
afterEach(() => { vi.useRealTimers(); db.close(); });

it("finds the next yearly date, today included, and waits for a leap year for Feb 29", () => {
  expect(nextAnnualDate(3, 14, "2026-10-31")).toBe("2027-03-14");
  expect(nextAnnualDate(10, 31, "2026-10-31")).toBe("2026-10-31");
  expect(nextAnnualDate(2, 29, "2026-10-31")).toBe("2028-02-29");
});

it("saves the fact and a yearly reminder together, and the reminder comes round again", async () => {
  const { memory, reminder } = await addPersonDate({ person: "Sam", occasion: "Birthday", month: 3, day: 14, note: "Likes gardening" });
  expect(memory).toMatchObject({ topic: "PERSON", text: "Sam: birthday March 14. Likes gardening" });
  expect(reminder).toMatchObject({ title: "Sam's birthday", dueAt: "2027-03-14", description: "Likes gardening" });
  await satisfyObligation(reminder.id);
  const next = (await db.obligations.toArray()).find((o) => o.status === "OPEN")!;
  expect(next).toMatchObject({ title: "Sam's birthday", dueAt: "2028-03-14" });
  const view = await getPeopleView();
  expect(view.upcoming.map((u) => [u.reminder.title, u.daysAway])).toEqual([["Sam's birthday", 500]]);
  expect(view.facts.map((f) => f.text)).toEqual(["Sam: birthday March 14. Likes gardening"]);
});

it("saves nothing for an impossible date or a missing name", async () => {
  await expect(addPersonDate({ person: "Sam", occasion: "Birthday", month: 2, day: 30 })).rejects.toThrow("INVALID_DATE");
  await expect(addPersonDate({ person: " ", occasion: "Birthday", month: 1, day: 1 })).rejects.toThrow("PERSON_REQUIRED");
  expect(await db.alfredMemories.count()).toBe(0);
  expect(await db.obligations.count()).toBe(0);
});

it("rolls the fact back if the reminder can't be saved", async () => {
  const spy = vi.spyOn(db.obligations, "add").mockRejectedValueOnce(new Error("disk full"));
  await expect(addPersonDate({ person: "Sam", occasion: "Birthday", month: 3, day: 14 })).rejects.toThrow();
  spy.mockRestore();
  expect(await db.alfredMemories.count()).toBe(0);
});

it("Alfred's person card saves both on confirm and describes itself plainly", async () => {
  const p = toProposal("person_date", { person: "Alex", occasion: "Anniversary", month: 6, day: 2 })!;
  expect(describeProposal(p)).toBe("Remember Alex's anniversary · June 2 · reminder every year");
  expect(toProposal("person_date", { person: "Alex", occasion: "Birthday", month: 13, day: 2 })).toBeNull();
  await confirmProposal(p);
  expect((await getPeopleView()).upcoming[0]!.reminder).toMatchObject({ title: "Alex's anniversary", dueAt: "2027-06-02" });
});

it("anchors Alfred's bare repeat rules so a weekly reminder doesn't drift to the day it's ticked", async () => {
  expect(anchorRule("FREQ=WEEKLY", "2026-11-02")).toBe("DTSTART:20261102T000000Z\nRRULE:FREQ=WEEKLY");
  expect(anchorRule("RRULE:FREQ=MONTHLY;BYMONTHDAY=15", "2026-11-15")).toBe("DTSTART:20261115T000000Z\nRRULE:FREQ=MONTHLY;BYMONTHDAY=15");
  expect(() => anchorRule("FREQ=SOMETIMES", "2026-11-02")).toThrow();
  await confirmProposal(toProposal("add_reminder", { title: "Bins out", due_date: "2026-11-02", repeat_rrule: "FREQ=WEEKLY" })!);
  const task = (await db.obligations.toArray())[0]!;
  // Ticked on a Thursday, the next one is still the following Monday.
  expect(deriveNextOccurrenceDate(task.recurrence!.rrule, "2026-11-05")).toBe("2026-11-09");
  await expect(confirmProposal(toProposal("add_reminder", { title: "Odd", repeat_rrule: "FREQ=SOMETIMES" })!)).rejects.toThrow("INVALID_REPEAT");
});
