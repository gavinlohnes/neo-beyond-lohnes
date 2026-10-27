import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { answerFollowUp, closeShift, debriefForNote, getFollowUpsDue, getReflectionFor, livedDayStartOf, reflectOnDecline } from "../../src/application/reflect";
import { startDay } from "../../src/application/commands";
import { createDecisionJournalEntry, modifyDecisionJournalEntry } from "../../src/application/journalCommands";
import { getDecisionJournalEntries, getDecisionJournalHistory } from "../../src/application/journalQueries";

beforeEach(async () => { await db.open(); });
afterEach(() => { vi.useRealTimers(); db.close(); });

const at = (day: number, hour: number, minute = 0) => vi.setSystemTime(new Date(2026, 9, day, hour, minute));

describe("LOOP step 2 — REFLECT", () => {
  it("a decline's reason is a journal entry linked to the recommendation, with the link in its history", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); at(27, 2);
    const entry = await reflectOnDecline({ id: "rec-1", title: "Recover", why: "Capacity is moderate." }, "Wrong for me", "  Felt fine after sleep  ");
    expect(entry).toMatchObject({ title: "Not doing: Recover", decision: "Wrong for me", reasoning: "Felt fine after sleep", linkedRecommendationId: "rec-1", status: "OPEN", source: "USER" });
    expect(entry.context).toBe("BEYOND suggested it: Capacity is moderate.");
    expect((await getReflectionFor("rec-1"))?.id).toBe(entry.id);
    expect(await getReflectionFor("rec-2")).toBeUndefined();
    const [created] = await getDecisionJournalHistory(entry.id);
    expect(created!.payload).toMatchObject({ linkedRecommendationId: "rec-1" });
    // The link is fixed at creation: modify cannot carry it.
    await modifyDecisionJournalEntry(entry.id, { linkedRecommendationId: "rec-9", reasoning: "edited" } as never);
    expect((await getReflectionFor("rec-1"))?.reasoning).toBe("edited");
  });

  it("asks how it went only from the next lived day (16:30), and the answer is the journal's review", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); at(27, 2);
    const entry = await reflectOnDecline({ id: "rec-1", title: "Recover", why: "x" }, "Not today");
    await createDecisionJournalEntry({ title: "Unlinked choice", decision: "Something" });
    at(27, 16, 29);
    expect(await getFollowUpsDue()).toEqual([]);
    at(27, 16, 30);
    expect((await getFollowUpsDue()).map((e) => e.id)).toEqual([entry.id]); // unlinked entries are not asked about
    const reviewed = await answerFollowUp(entry.id, "Glad I didn't", " Trust the morning ");
    expect(reviewed).toMatchObject({ status: "REVIEWED", outcome: "Glad I didn't", lesson: "Trust the morning" });
    expect(await getFollowUpsDue()).toEqual([]);
  });

  it("LOOP-002: closing a shift writes the handoff note and a debrief that carries it, found from the note", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); at(27, 7, 15);
    expect(livedDayStartOf(new Date())).toEqual(new Date(2026, 9, 26, 16, 30));
    const day = await startDay();
    await closeShift(day.id, { felt: "Rough", note: " Nap before " });
    const [noted] = await db.events.where("type").equals("SHIFT_HANDOFF_NOTED").toArray();
    expect(noted!.payload).toMatchObject({ note: "Nap before" });
    const debrief = debriefForNote(await getDecisionJournalEntries(), noted!.recordedAt)!;
    expect(debrief).toMatchObject({ title: "Shift debrief", decision: "Shift felt rough", expectation: "Next shift: Nap before" });
    expect(debrief.context).toBe("Lived day starting Mon, Oct 26");
    // A note from another lived day does not pick it up.
    expect(debriefForNote(await getDecisionJournalEntries(), new Date(2026, 9, 27, 17).toISOString())).toBeUndefined();
    at(27, 17);
    expect((await getFollowUpsDue()).map((e) => e.id)).toEqual([debrief.id]);
    await expect(closeShift(day.id, {})).rejects.toThrow("EMPTY_HANDOFF");
  });
});
