import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../src/persistence/db";
import { startDay, logBodyweight, submitCheckIn } from "../../src/application/commands";
import { getLatestBodyweight, getLatestCheckIn, getLatestRecommendation } from "../../src/application/queries";
import { applyAnyRestore } from "../../src/persistence/restore";

/**
 * Follow-up to the CI-discovered flake fixed in c66d559 and then correctly
 * rejected: that fix nudged occurredAt/recordedAt forward on a same-
 * millisecond collision, which manufactures historical time that never
 * actually happened. This is the redesign — occurredAt/recordedAt/issuedAt
 * are always the real, unmodified instant; a genuine tie is resolved by an
 * explicit `seq` field instead (application/commands.ts's nextSeq).
 *
 * Uses `vi.useFakeTimers({ toFake: ["Date"] })` (not the full fake-timer
 * set) specifically so setTimeout/microtask scheduling stays real —
 * fake-indexeddb relies on real async scheduling internally, and faking
 * Date alone is enough to force genuine same-instant collisions on demand.
 */

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  db.close();
  vi.useRealTimers();
});

describe("occurredAt/recordedAt are never manufactured", () => {
  it("two events logged at the exact same frozen instant keep identical, unmodified timestamps", async () => {
    const day = await startDay();
    const frozen = new Date("2026-08-21T12:00:00.000Z");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(frozen);

    await logBodyweight(day.id, 210);
    await logBodyweight(day.id, 208.5);

    vi.useRealTimers();

    const events = (await db.events.where("beyondDayId").equals(day.id).toArray()).filter(
      (e) => e.type === "BODYWEIGHT_LOGGED",
    );
    expect(events).toHaveLength(2);
    for (const e of events) {
      expect(e.occurredAt).toBe(frozen.toISOString());
      expect(e.recordedAt).toBe(frozen.toISOString());
    }
  });

  it("the tie-break still correctly identifies which of the two identically-timestamped logs was more recent", async () => {
    const day = await startDay();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-21T12:00:00.000Z"));

    await logBodyweight(day.id, 210);
    await logBodyweight(day.id, 208.5); // logged second, must win "most recent" despite the identical timestamp

    vi.useRealTimers();

    expect(await getLatestBodyweight(day.id)).toBe(208.5);
  });

  it("checkIns and recommendations get the same treatment (submitCheckIn touches both tables)", async () => {
    const day = await startDay();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-21T12:00:00.000Z"));

    const first = await submitCheckIn(day.id, { energy: 3, stress: 3, mood: 3, soreness: 0, alcoholUrge: 0 });
    const second = await submitCheckIn(day.id, { energy: 4, stress: 2, mood: 4, soreness: 0, alcoholUrge: 0 });

    vi.useRealTimers();

    expect(first.checkIn.recordedAt).toBe(second.checkIn.recordedAt);
    expect(first.recommendation.issuedAt).toBe(second.recommendation.issuedAt);
    expect((await getLatestCheckIn(day.id))!.id).toBe(second.checkIn.id);
    expect((await getLatestRecommendation(day.id))!.id).toBe(second.recommendation.id);
  });
});

describe("seq is assigned deterministically and never re-derived from the clock", () => {
  it("seq strictly increases across calls even when the timestamp does not", async () => {
    const day = await startDay();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-21T12:00:00.000Z"));

    await logBodyweight(day.id, 210);
    await logBodyweight(day.id, 208.5);

    vi.useRealTimers();

    const events = (await db.events.where("beyondDayId").equals(day.id).toArray())
      .filter((e) => e.type === "BODYWEIGHT_LOGGED")
      .sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
    expect(events[0]!.seq).toBeTypeOf("number");
    expect(events[1]!.seq).toBeTypeOf("number");
    expect(events[1]!.seq!).toBeGreaterThan(events[0]!.seq!);
  });

  it("a system-clock rollback cannot corrupt ordering: seq keeps incrementing regardless of what the clock reports, and real time still sorts first", async () => {
    const day = await startDay();

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-21T12:00:00.000Z"));
    await logBodyweight(day.id, 210); // "later" wall-clock reading, logged first

    vi.setSystemTime(new Date("2026-08-21T06:00:00.000Z")); // clock rolled BACKWARD
    await logBodyweight(day.id, 208.5); // "earlier" wall-clock reading, logged second

    vi.useRealTimers();

    const events = (await db.events.where("beyondDayId").equals(day.id).toArray()).filter(
      (e) => e.type === "BODYWEIGHT_LOGGED",
    );
    const rolledBack = events.find((e) => (e.payload as { weightLbs: number }).weightLbs === 208.5)!;
    const original = events.find((e) => (e.payload as { weightLbs: number }).weightLbs === 210)!;

    // seq is clock-independent: it kept incrementing even though the clock went backward.
    expect(rolledBack.seq!).toBeGreaterThan(original.seq!);
    // occurredAt is honest: the rolled-back event's real recorded instant is
    // genuinely earlier, and nothing here pretends otherwise.
    expect(rolledBack.occurredAt < original.occurredAt).toBe(true);
    // "Most recent by real time" must still resolve to the chronologically
    // later one (210, at 12:00) even though it was logged first and has the
    // lower seq — seq only ever breaks a genuine tie, it never overrides a
    // real time difference.
    expect(await getLatestBodyweight(day.id)).toBe(210);
  });

  it("survives a fresh module load (simulated app restart): next seq continues above what's already on disk, never collides", async () => {
    const day = await startDay();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-21T12:00:00.000Z"));
    await logBodyweight(day.id, 210);
    vi.useRealTimers();

    const before = (await db.events.where("beyondDayId").equals(day.id).toArray()).find(
      (e) => e.type === "BODYWEIGHT_LOGGED",
    )!;

    // A real restart re-evaluates every module from scratch; resetModules +
    // re-import is the faithful way to reproduce that in-process, rather
    // than trusting the already-warm in-memory counter this test file's
    // first import initialized.
    vi.resetModules();
    const freshCommands = await import("../../src/application/commands");

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-21T12:00:00.000Z")); // identical instant to the pre-"restart" write
    await freshCommands.logBodyweight(day.id, 205);
    vi.useRealTimers();

    const after = (await db.events.where("beyondDayId").equals(day.id).toArray())
      .filter((e) => e.type === "BODYWEIGHT_LOGGED")
      .find((e) => (e.payload as { weightLbs: number }).weightLbs === 205)!;

    expect(after.seq!).toBeGreaterThan(before.seq!);
  });
});

describe("records without seq (pre-existing historical data) degrade gracefully", () => {
  it("does not throw when sorting a mix of seq-less and seq-bearing entries, and seq-bearing still wins a real tie", async () => {
    const day = await startDay();
    // Simulate a historical BODYWEIGHT_LOGGED row from before this field
    // existed — no seq at all, exactly like a real pre-migration event.
    await db.events.add({
      id: "legacy-event-1",
      type: "BODYWEIGHT_LOGGED",
      beyondDayId: day.id,
      occurredAt: "2026-08-21T12:00:00.000Z",
      recordedAt: "2026-08-21T12:00:00.000Z",
      payload: { commandId: "legacy", weightLbs: 200 },
      source: "USER",
      correlationId: "legacy-corr-1",
    });

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-21T12:00:00.000Z")); // same instant as the legacy row
    await expect(logBodyweight(day.id, 210)).resolves.not.toThrow();
    vi.useRealTimers();

    // The new, seq-bearing entry must win over the legacy seq-less one at
    // the exact same timestamp (seq-less compares as seq 0 — always oldest
    // on a tie, never accidentally "most recent").
    expect(await getLatestBodyweight(day.id)).toBe(210);
  });
});

describe("seq survives native backup export/restore", () => {
  it("round-trips two same-instant entries with their seq values and correct order intact", async () => {
    const day = await startDay();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-21T12:00:00.000Z"));
    await logBodyweight(day.id, 210);
    await logBodyweight(day.id, 208.5);
    vi.useRealTimers();

    const blob = await db.export({ prettyJson: true });
    const backupFile = new File([blob], "native-backup.json", { type: "application/json" });

    // Diverge current state so the restore has something real to undo.
    await logBodyweight(day.id, 190);
    expect(await getLatestBodyweight(day.id)).toBe(190);

    await applyAnyRestore(backupFile);

    expect(await getLatestBodyweight(day.id)).toBe(208.5);
  });
});
