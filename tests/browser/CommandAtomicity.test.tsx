import { openCommandPanel } from "./helpers/command";
/// <reference types="@vitest/browser-playwright" />
import { afterEach, describe, expect, it, vi } from "vitest";
import { page } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import axe from "axe-core";
import { db } from "../../src/persistence/db";
import { startDay, submitCheckIn } from "../../src/application/commands";
import { archiveMission, createMission, createObligation, satisfyObligation } from "../../src/application/intentCommands";
import { createDecisionJournalEntry, reviewDecisionJournalEntry } from "../../src/application/journalCommands";
import { buildRecurrenceRule } from "../../src/engine/recurrence";
import { IntentScreen } from "../../src/ui/screens/more/IntentScreen";
import { MoreScreen } from "../../src/ui/screens/more/MoreScreen";

/**
 * COMMAND-ATOMICITY-002 (owner approval 2026-10-13, issue #225), against
 * real Chromium IndexedDB: compound commands roll back as a unit, the
 * screen's error matches what was saved (nothing), an explicit retry saves
 * exactly once, and MORE's read-only record check lists a split.
 */

afterEach(async () => {
  vi.restoreAllMocks();
  await cleanup();
  await page.viewport(1280, 800);
});

/** Lets the first `allowed` event writes through, then rejects the next one. */
function failEventWrite(allowed = 0) {
  const original = db.events.add.bind(db.events);
  let calls = 0;
  return vi.spyOn(db.events, "add").mockImplementation((...args: Parameters<typeof db.events.add>) => {
    calls += 1;
    if (calls === allowed + 1) return Promise.reject(new Error("Storage write failed")) as ReturnType<typeof db.events.add>;
    return original(...args);
  });
}

describe("COMMAND-ATOMICITY-002 in a real browser", () => {
  it("rolls back check-in + recommendation, recurring satisfy and journal review in real IndexedDB", async () => {
    const day = await startDay();
    const eventsBefore = await db.events.count();
    failEventWrite(1);
    await expect(submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 })).rejects.toThrow("Storage write failed");
    vi.restoreAllMocks();
    expect(await db.checkIns.count()).toBe(0);
    expect(await db.recommendations.count()).toBe(0);
    expect(await db.events.count()).toBe(eventsBefore);

    const rrule = buildRecurrenceRule({ freq: "DAILY", interval: 1, anchor: "2026-09-14" });
    const obligation = await createObligation({ title: "Water the plants", dueAt: "2026-09-14", recurrence: { rrule } });
    failEventWrite(1);
    await expect(satisfyObligation(obligation.id)).rejects.toThrow("Storage write failed");
    vi.restoreAllMocks();
    expect((await db.obligations.get(obligation.id))?.status).toBe("OPEN");
    expect(await db.obligations.count()).toBe(1);

    const entry = await createDecisionJournalEntry({ title: "Job", decision: "Take it" });
    failEventWrite();
    await expect(reviewDecisionJournalEntry(entry.id, { outcome: "Went well" })).rejects.toThrow("Storage write failed");
    vi.restoreAllMocks();
    expect((await db.decisionJournalEntries.get(entry.id))?.status).toBe("OPEN");
  });

  it("a failed SATISFY shows an error, keeps the obligation unresolved, and an explicit retry saves once", async () => {
    await createObligation({ title: "Submit signed agreement" });
    const screen = await render(<IntentScreen />);
    await screen.getByRole("button", { name: "Open Submit signed agreement" }).click();
    await screen.getByRole("button", { name: "SATISFY", exact: true }).click();
    failEventWrite();
    await screen.getByRole("button", { name: "CONFIRM SATISFIED" }).click();
    await expect.element(screen.getByText(/Storage write failed/)).toBeVisible();
    vi.restoreAllMocks();
    expect((await db.obligations.toArray())[0]?.status).toBe("OPEN");
    expect(await db.events.where("type").equals("OBLIGATION_SATISFIED").count()).toBe(0);

    await screen.getByRole("button", { name: "CONFIRM SATISFIED" }).click();
    await expect.element(screen.getByText("Historical commitment · resolution already recorded.", { exact: true })).toBeVisible();
    expect(await db.events.where("type").equals("OBLIGATION_SATISFIED").count()).toBe(1);
  });

  it("D1: satisfying a recurring obligation of an archived mission saves nothing and says why", async () => {
    const mission = await createMission({ title: "Former direction" });
    const rrule = buildRecurrenceRule({ freq: "DAILY", interval: 1, anchor: "2026-09-14" });
    await createObligation({ title: "Weekly report", missionId: mission.id, dueAt: "2026-09-14", recurrence: { rrule } });
    await archiveMission(mission.id);
    const screen = await render(<IntentScreen />);
    await screen.getByRole("button", { name: "Open Weekly report" }).click();
    await screen.getByRole("button", { name: "SATISFY", exact: true }).click();
    await screen.getByRole("button", { name: "CONFIRM SATISFIED" }).click();
    await expect.element(screen.getByText("Nothing was saved. This repeats under an archived mission, so its next occurrence can't be created. Release it instead.", { exact: true })).toBeVisible();
    expect((await db.obligations.toArray()).map((o) => o.status)).toEqual(["OPEN"]);
    expect(await db.events.where("type").equals("OBLIGATION_SATISFIED").count()).toBe(0);
  });

  it.each([320, 412])("MORE lists a split mission record as plain read-only text at %ipx", async (width) => {
    await page.viewport(width, 800);
    const mission = await createMission({ title: "Direction" });
    await db.missions.put({ ...mission, id: "split-mission", title: "Half-saved direction" });
    const eventsBefore = await db.events.toArray();

    const screen = await render(<MoreScreen />);
    await openCommandPanel(screen, "backup");
    await openCommandPanel(screen, "settings");
    await screen.getByText("Diagnostic detail", { exact: true }).click();
    const label = screen.getByText("Record mismatches", { exact: true });
    await expect.element(label).toBeVisible();
    expect(label.element().parentElement?.textContent).toBe("Record mismatches1");
    const message = screen.getByText("Mission “Half-saved direction” is saved without its MISSION_CREATED event.", { exact: true });
    await expect.element(message).toBeVisible();
    expect(message.element().closest("button, a")).toBeNull();
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
    expect((await axe.run(screen.container)).violations).toEqual([]);
    expect(await db.events.toArray()).toEqual(eventsBefore);
  });
});
