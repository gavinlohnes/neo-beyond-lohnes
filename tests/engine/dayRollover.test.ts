import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  computeDueRollover,
  evaluateDayRolloverAmbiguity,
  DAY_ROLLOVER_HOUR,
  DAY_ROLLOVER_MINUTE,
} from "../../src/engine/dayRollover";

/**
 * DAY-ROLLOVER-001 — pure unit tests for the automatic 16:30 boundary
 * (direct owner mission + doctrine-override ruling, 2026-09-21). No
 * Dexie, no fake-indexeddb, matching every other engine/* test file's
 * zero-I/O contract.
 */
describe("computeDueRollover", () => {
  it("is not due at 16:29:59 local", () => {
    const dayStartedAt = new Date(2026, 8, 21, 10, 0, 0, 0); // Mon Sep 21, 10:00
    const now = new Date(2026, 8, 21, DAY_ROLLOVER_HOUR, DAY_ROLLOVER_MINUTE - 1, 59, 0);
    expect(computeDueRollover(dayStartedAt, now)).toBeNull();
  });

  it("is due at exactly 16:30:00 local, returning that exact boundary instant", () => {
    const dayStartedAt = new Date(2026, 8, 21, 10, 0, 0, 0);
    const now = new Date(2026, 8, 21, DAY_ROLLOVER_HOUR, DAY_ROLLOVER_MINUTE, 0, 0);
    const boundary = computeDueRollover(dayStartedAt, now);
    expect(boundary).not.toBeNull();
    expect(boundary!.getTime()).toBe(now.getTime());
    expect(boundary!.getHours()).toBe(DAY_ROLLOVER_HOUR);
    expect(boundary!.getMinutes()).toBe(DAY_ROLLOVER_MINUTE);
  });

  it("stays due any time after 16:30 the same day", () => {
    const dayStartedAt = new Date(2026, 8, 21, 10, 0, 0, 0);
    const now = new Date(2026, 8, 21, 23, 0, 0, 0);
    const boundary = computeDueRollover(dayStartedAt, now);
    expect(boundary).not.toBeNull();
    expect(boundary!.getDate()).toBe(21);
    expect(boundary!.getHours()).toBe(DAY_ROLLOVER_HOUR);
  });

  it("a day started well before today's boundary and re-checked before today's 16:30 is not yet due (yesterday's boundary already used up)", () => {
    // Day started yesterday afternoon, already past yesterday's boundary —
    // but that boundary is presumably already how this day itself came to
    // exist (or was never rolled), so a re-check before TODAY's own 16:30
    // must not treat yesterday's already-passed boundary as newly due
    // again — only a boundary strictly after dayStartedAt counts.
    const dayStartedAt = new Date(2026, 8, 21, 18, 0, 0, 0); // Mon 18:00, already past Mon's 16:30
    const now = new Date(2026, 8, 22, 9, 0, 0, 0); // Tue 09:00, before Tue's 16:30
    expect(computeDueRollover(dayStartedAt, now)).toBeNull();
  });

  it("a day started days ago, checked after the app was closed across several boundaries, rolls over to exactly the single most recent boundary — never a multi-day backfill", () => {
    const dayStartedAt = new Date(2026, 8, 18, 10, 0, 0, 0); // Fri Sep 18, 10:00
    const now = new Date(2026, 8, 22, 12, 0, 0, 0); // Tue Sep 22, 12:00 — several 16:30s have elapsed since
    const boundary = computeDueRollover(dayStartedAt, now);
    expect(boundary).not.toBeNull();
    // The most recent elapsed boundary is Monday Sep 21's 16:30, not
    // Friday's, Saturday's, or Sunday's, and not a future Tuesday one.
    expect(boundary!.getFullYear()).toBe(2026);
    expect(boundary!.getMonth()).toBe(8);
    expect(boundary!.getDate()).toBe(21);
    expect(boundary!.getHours()).toBe(DAY_ROLLOVER_HOUR);
    expect(boundary!.getMinutes()).toBe(DAY_ROLLOVER_MINUTE);
  });

  it("a day that itself started exactly at a boundary instant is not immediately due again at that same instant", () => {
    const boundaryInstant = new Date(2026, 8, 21, DAY_ROLLOVER_HOUR, DAY_ROLLOVER_MINUTE, 0, 0);
    expect(computeDueRollover(boundaryInstant, boundaryInstant)).toBeNull();
  });

  it("that same rollover-created day becomes due again once tomorrow's boundary arrives", () => {
    const boundaryInstant = new Date(2026, 8, 21, DAY_ROLLOVER_HOUR, DAY_ROLLOVER_MINUTE, 0, 0);
    const nextBoundary = new Date(2026, 8, 22, DAY_ROLLOVER_HOUR, DAY_ROLLOVER_MINUTE, 0, 0);
    const boundary = computeDueRollover(boundaryInstant, nextBoundary);
    expect(boundary).not.toBeNull();
    expect(boundary!.getTime()).toBe(nextBoundary.getTime());
  });

  /**
   * Real DST transitions, not a vacuous same-offset check: this Node
   * runtime's ambient timezone is UTC (no DST), so process.env.TZ is
   * overridden for exactly these two tests to actually exercise a 23-hour
   * (spring-forward) and a 25-hour (fall-back) local day. Verified 2026 US
   * transition dates: March 8 (spring-forward), November 1 (fall-back).
   * The boundary math never assumes a 24-hour day (see this module's own
   * doc comment) — these tests prove that structural claim with real
   * transition behavior, not just by inspection.
   */
  describe("DST transitions (process.env.TZ override)", () => {
    let originalTZ: string | undefined;

    beforeEach(() => {
      originalTZ = process.env.TZ;
      process.env.TZ = "America/New_York";
    });

    afterEach(() => {
      process.env.TZ = originalTZ;
    });

    it("still correctly computes rollover across a spring-forward transition (2026-03-08, a 23-hour local day)", () => {
      const dayStartedAt = new Date(2026, 2, 7, 10, 0, 0, 0); // Sat Mar 7, before transition
      const now = new Date(2026, 2, 8, 17, 0, 0, 0); // Sun Mar 8, after the 2am->3am jump, past 16:30
      const boundary = computeDueRollover(dayStartedAt, now);
      expect(boundary).not.toBeNull();
      expect(boundary!.getFullYear()).toBe(2026);
      expect(boundary!.getMonth()).toBe(2);
      expect(boundary!.getDate()).toBe(8);
      expect(boundary!.getHours()).toBe(DAY_ROLLOVER_HOUR);
      expect(boundary!.getMinutes()).toBe(DAY_ROLLOVER_MINUTE);
    });

    it("still correctly computes rollover across a fall-back transition (2026-11-01, a 25-hour local day)", () => {
      const dayStartedAt = new Date(2026, 9, 31, 10, 0, 0, 0); // Sat Oct 31, before transition
      const now = new Date(2026, 10, 1, 17, 0, 0, 0); // Sun Nov 1, after fall-back, past 16:30
      const boundary = computeDueRollover(dayStartedAt, now);
      expect(boundary).not.toBeNull();
      expect(boundary!.getFullYear()).toBe(2026);
      expect(boundary!.getMonth()).toBe(10);
      expect(boundary!.getDate()).toBe(1);
      expect(boundary!.getHours()).toBe(DAY_ROLLOVER_HOUR);
      expect(boundary!.getMinutes()).toBe(DAY_ROLLOVER_MINUTE);
    });

    it("is not falsely due mid-transition-day before 16:30 (spring-forward)", () => {
      const dayStartedAt = new Date(2026, 2, 8, 4, 0, 0, 0); // Sun Mar 8, just after the jump
      const now = new Date(2026, 2, 8, 12, 0, 0, 0); // still before 16:30
      expect(computeDueRollover(dayStartedAt, now)).toBeNull();
    });
  });
});

describe("evaluateDayRolloverAmbiguity", () => {
  it("flags when the day was rollover-created AND a PRIMARY sleep is logged", () => {
    expect(
      evaluateDayRolloverAmbiguity({ dayWasRolloverCreated: true, hasPrimarySleepLogged: true }),
    ).toEqual({ kind: "PRIMARY_SLEEP_ON_ROLLOVER_DAY" });
  });

  it("does not flag a rollover-created day with no PRIMARY sleep logged", () => {
    expect(evaluateDayRolloverAmbiguity({ dayWasRolloverCreated: true, hasPrimarySleepLogged: false })).toBeNull();
  });

  it("does not flag a PRIMARY sleep on a day that was not rollover-created", () => {
    expect(evaluateDayRolloverAmbiguity({ dayWasRolloverCreated: false, hasPrimarySleepLogged: true })).toBeNull();
  });

  it("does not flag when neither is true", () => {
    expect(evaluateDayRolloverAmbiguity({ dayWasRolloverCreated: false, hasPrimarySleepLogged: false })).toBeNull();
  });
});
