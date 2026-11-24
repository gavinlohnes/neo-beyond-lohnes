import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { applyAnyRestore } from "../../src/persistence/restore";
import { endDay, recordRecommendation, startDay, submitCheckIn } from "../../src/application/commands";
import { correctCheckIn, undoCheckInCorrection } from "../../src/application/checkInCorrectionCommands";
import { getCheckInChain, getEffectiveCheckIns, getLatestCheckIn, getLatestRecommendation, getRecommendationDecision } from "../../src/application/queries";
import { getDaySummaries } from "../../src/application/dayLedgerQueries";
import { getCheckInDraft } from "../../src/application/checkInDraftQueries";
import { getDeltaKnowledge } from "../../src/application/delta";
import { getRecordMismatches } from "../../src/application/recordIntegrityQueries";
import type { StateCheckIn } from "../../src/domain/common/types";

/**
 * GRAYSON-CHECKIN-EDIT-001: fixing a sent check-in, and undoing the fix. Invented data. The day opens Mon Nov 23 2026
 * 17:00 local and runs past midnight. Run under TZ=UTC and TZ=America/Chicago.
 */
type Answers = Pick<StateCheckIn, "energy" | "stress" | "mood" | "soreness" | "alcoholUrge">;
const RED: Answers = { energy: 1, stress: 3, mood: 3, soreness: 1, alcoholUrge: 0 };
const GREEN: Answers = { energy: 4, stress: 2, mood: 4, soreness: 1, alcoholUrge: 0 };
const YELLOW: Answers = { energy: 2, stress: 2, mood: 3, soreness: 1, alcoholUrge: 0 };

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  await db.open();
  await db.transaction("rw", db.tables, async () => { for (const table of db.tables) await table.clear(); });
  vi.setSystemTime(new Date(2026, 10, 23, 17, 0));
});
afterEach(() => { vi.useRealTimers(); });

const summary = async (dayId: string) => (await getDaySummaries()).find((s) => s.beyondDayId === dayId)!;
const answers = (c: StateCheckIn | undefined) => c && { energy: c.energy, stress: c.stress, mood: c.mood, soreness: c.soreness, alcoholUrge: c.alcoholUrge };

describe("fixing today's latest check-in", () => {
  it("re-works today's advice through the Engine; the old recommendation and its decision stay in history", async () => {
    const day = await startDay();
    vi.setSystemTime(new Date(2026, 10, 23, 23, 50));
    const { checkIn, recommendation: before } = await submitCheckIn(day.id, RED);
    await recordRecommendation(day.id, before);
    expect((await summary(day.id)).checkIn?.capacity).toBe("RED");

    vi.setSystemTime(new Date(2026, 10, 24, 0, 20)); // past midnight, same lived day
    const result = await correctCheckIn(checkIn.id, GREEN);
    expect(result.status).toBe("CORRECTED");
    if (result.status !== "CORRECTED") return;
    expect(result.recommendation).toBeDefined();
    expect(result.recommendation!.kind).not.toBe(before.kind);
    expect((await getLatestRecommendation(day.id))?.id).toBe(result.recommendation!.id);
    expect(await db.recommendations.get(before.id)).toBeDefined();
    expect(await getRecommendationDecision(day.id, before.id)).toBe("ACCEPTED");
    expect(answers(await getLatestCheckIn(day.id))).toEqual(GREEN);
    expect((await getLatestCheckIn(day.id))?.recordedAt).toBe(checkIn.recordedAt);
    expect((await getLatestCheckIn(day.id))?.draft).toBeUndefined();

    const ledger = await summary(day.id);
    expect(ledger.checkIn).toMatchObject({ capacity: "GREEN", count: 1 });
    expect(ledger.checkIn?.at).toBe((await db.events.where("type").equals("STATE_CHECKED_IN").first())!.occurredAt);
    expect(ledger.burden.corrections).toBe(1);
    expect(ledger.recommendation?.recommendationId).toBe(result.recommendation!.id);

    const undo = await undoCheckInCorrection(result.correctionEventId);
    expect(undo.status).toBe("UNDONE");
    if (undo.status !== "UNDONE") return;
    expect(undo.recommendation?.kind).toBe(before.kind);
    expect(answers(await getLatestCheckIn(day.id))).toEqual(RED);
    const afterUndo = await summary(day.id);
    expect(afterUndo.checkIn).toMatchObject({ capacity: "RED", count: 1 });
    expect(afterUndo.burden.corrections).toBe(2);
    expect(await getRecordMismatches()).toEqual([]);
  });

  it("an earlier check-in today is fixed without a new recommendation", async () => {
    const day = await startDay();
    const first = (await submitCheckIn(day.id, RED)).checkIn;
    vi.setSystemTime(new Date(2026, 10, 23, 18, 0));
    await submitCheckIn(day.id, YELLOW);
    const recs = await db.recommendations.count();
    const result = await correctCheckIn(first.id, GREEN);
    expect(result).toMatchObject({ status: "CORRECTED" });
    expect(result.status === "CORRECTED" && result.recommendation).toBeFalsy();
    expect(await db.recommendations.count()).toBe(recs);
    expect(answers(await getLatestCheckIn(day.id))).toEqual(YELLOW);
    expect((await summary(day.id)).checkIn).toMatchObject({ capacity: "YELLOW", count: 2 });
  });
});

describe("fixing a past day's check-in", () => {
  it("changes the Day Ledger, Delta's reading and the next draft, and never re-issues a past recommendation", async () => {
    const past = await startDay();
    const { checkIn } = await submitCheckIn(past.id, RED);
    vi.setSystemTime(new Date(2026, 10, 24, 9, 0));
    await endDay(past.id);
    vi.setSystemTime(new Date(2026, 10, 24, 17, 0));
    await startDay();
    const recs = await db.recommendations.count();
    const delta = await getDeltaKnowledge(new Date());
    const topic = () => delta.topics.find((t) => t.id === "check-ins")?.have;
    const haveBefore = topic();

    const result = await correctCheckIn(checkIn.id, GREEN);
    expect(result.status).toBe("CORRECTED");
    expect(result.status === "CORRECTED" && result.recommendation).toBeFalsy();
    expect(await db.recommendations.count()).toBe(recs);
    expect((await summary(past.id)).checkIn).toMatchObject({ capacity: "GREEN", count: 1 });
    expect((await summary(past.id)).burden.corrections).toBe(1);
    expect((await getEffectiveCheckIns()).map(answers)).toEqual([GREEN]);
    expect((await getEffectiveCheckIns([past.id])).map(answers)).toEqual([GREEN]);
    expect((await getDeltaKnowledge(new Date())).topics.find((t) => t.id === "check-ins")?.have).toBe(haveBefore);
    expect((await getCheckInDraft(new Date()))?.value).toMatchObject(GREEN);
    expect(await getRecordMismatches()).toEqual([]);

    if (result.status !== "CORRECTED") return;
    expect((await undoCheckInCorrection(result.correctionEventId)).status).toBe("UNDONE");
    expect((await getEffectiveCheckIns()).map(answers)).toEqual([RED]);
    expect((await summary(past.id)).checkIn?.capacity).toBe("RED");
    expect((await summary(past.id)).burden.corrections).toBe(2);
    expect(await db.recommendations.count()).toBe(recs);
  });
});

describe("refusals", () => {
  it("unchanged answers are a no-op; a superseded row or an older fix is stale; an undone fix can't be undone twice", async () => {
    const day = await startDay();
    const { checkIn } = await submitCheckIn(day.id, RED);
    expect(await correctCheckIn(checkIn.id, RED)).toEqual({ status: "NO_OP" });
    const first = await correctCheckIn(checkIn.id, YELLOW);
    expect(first.status).toBe("CORRECTED");
    expect(await correctCheckIn(checkIn.id, GREEN)).toEqual({ status: "STALE" });
    if (first.status !== "CORRECTED") return;
    const second = await correctCheckIn(first.checkIn.id, GREEN);
    expect(second.status).toBe("CORRECTED");
    expect(await undoCheckInCorrection(first.correctionEventId)).toEqual({ status: "STALE" });
    if (second.status !== "CORRECTED") return;
    expect((await undoCheckInCorrection(second.correctionEventId)).status).toBe("UNDONE");
    expect(await undoCheckInCorrection(second.correctionEventId)).toEqual({ status: "NO_OP" });
    expect(answers(await getLatestCheckIn(day.id))).toEqual(YELLOW);
    await expect(correctCheckIn(first.checkIn.id, { ...GREEN, energy: 9 as never })).rejects.toThrow();
    expect(await correctCheckIn("missing", GREEN)).toEqual({ status: "NOT_FOUND" });
  });

  it("the original row, after a fix, opens the current version", async () => {
    const day = await startDay();
    const { checkIn } = await submitCheckIn(day.id, RED);
    const fix = await correctCheckIn(checkIn.id, GREEN);
    if (fix.status !== "CORRECTED") throw new Error("expected a fix");
    const chain = await getCheckInChain(checkIn.id);
    expect(chain?.current.id).toBe(fix.checkIn.id);
    expect(chain?.fixes).toHaveLength(1);
    expect((await correctCheckIn(chain!.current.id, YELLOW)).status).toBe("CORRECTED");
  });
});

describe("unchanged paths", () => {
  it("submitCheckIn still adds a check-in, counted, with its draft marker, and a recommendation", async () => {
    const day = await startDay();
    await submitCheckIn(day.id, RED);
    const { checkIn, recommendation } = await submitCheckIn(day.id, GREEN, "CONFIRMED");
    expect(checkIn.draft).toBe("CONFIRMED");
    expect(checkIn.correctsCheckInId).toBeUndefined();
    expect((await getLatestRecommendation(day.id))?.id).toBe(recommendation.id);
    expect((await summary(day.id)).checkIn).toMatchObject({ capacity: "GREEN", count: 2 });
    expect((await summary(day.id)).burden.corrections).toBe(0);
  });

  it("the draft marker stays on the original row, which History still shows; the fixed row carries none", async () => {
    const day = await startDay();
    const { checkIn } = await submitCheckIn(day.id, RED, "ADJUSTED");
    const fix = await correctCheckIn(checkIn.id, GREEN);
    if (fix.status !== "CORRECTED") throw new Error("expected a fix");
    expect((await db.checkIns.get(checkIn.id))?.draft).toBe("ADJUSTED");
    expect(fix.checkIn.draft).toBeUndefined();
    expect(fix.checkIn.correctsCheckInId).toBe(checkIn.id);
  });

  it("a native backup round trip keeps the fix and its edited mark", async () => {
    const day = await startDay();
    const { checkIn } = await submitCheckIn(day.id, RED);
    const fix = await correctCheckIn(checkIn.id, GREEN);
    if (fix.status !== "CORRECTED") throw new Error("expected a fix");
    const file = new File([await db.export({ prettyJson: true })], "native-backup.json", { type: "application/json" });
    await undoCheckInCorrection(fix.correctionEventId);
    await applyAnyRestore(file);
    expect(answers(await getLatestCheckIn(day.id))).toEqual(GREEN);
    expect((await getLatestCheckIn(day.id))?.correctsCheckInId).toBe(checkIn.id);
    expect((await getCheckInChain(checkIn.id))?.fixes).toHaveLength(1);
    expect(await getRecordMismatches()).toEqual([]);
  });
});
