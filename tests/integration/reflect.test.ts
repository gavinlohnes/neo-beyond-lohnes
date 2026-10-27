import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { answerFollowUp, getFollowUpsDue, getReflectionFor, getShiftDebriefFor, livedDayStartOf, recordShiftDebrief, reflectOnDecline } from "../../src/application/reflect";
import { createDecisionJournalEntry, modifyDecisionJournalEntry } from "../../src/application/journalCommands";
import { getDecisionJournalHistory } from "../../src/application/journalQueries";

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

  it("a shift debrief belongs to its lived day and its plan comes back the next one", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); at(27, 7, 15);
    expect(livedDayStartOf(new Date())).toEqual(new Date(2026, 9, 26, 16, 30));
    expect(await getShiftDebriefFor()).toBeUndefined();
    const debrief = await recordShiftDebrief({ felt: "Rough", because: ["Sleep", "Workload"], next: " Nap before ", now: new Date() });
    expect(debrief).toMatchObject({ title: "Shift debrief", decision: "Shift felt rough", reasoning: "Mostly: sleep, workload", expectation: "Next shift: Nap before" });
    expect(debrief.context).toBe("Lived day starting Mon, Oct 26");
    expect((await getShiftDebriefFor())?.id).toBe(debrief.id);
    at(27, 17);
    expect(await getShiftDebriefFor()).toBeUndefined();
    expect((await getFollowUpsDue()).map((e) => e.id)).toEqual([debrief.id]);
  });
});
