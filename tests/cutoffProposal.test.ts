import { describe, expect, it } from "vitest";
import { MAX_SUGGESTED_HOURS, QUIET_DAYS, SHORT_SLEEP_MINUTES, SOURCES, SUGGEST_MIN_NIGHTS, suggestCaffeineCutoff } from "../src/application/cutoffProposal";
import type { RhythmNight } from "../src/engine/sleepRhythm";

/** C4.2a: DELTA's caffeine cut-off suggestion from his own work-day sleeps. Invented nights only. */
const now = new Date(2026, 10, 20, 12);
const DAY = 86_400_000;
/** n work-day main sleeps, newest first, one a day back from yesterday, each `minutes` long. */
const nights = (minutes: number[], kind: RhythmNight["kind"] = "WORK"): RhythmNight[] =>
  minutes.map((m, i) => ({ livedDayStart: new Date(now.getTime() - (i + 1) * DAY).toISOString(), kind, start: 450, end: 450 + m, asleepMinutes: m }));
const short = (n: number) => Array.from({ length: n }, () => 5 * 60 + 40);
const long = (n: number) => Array.from({ length: n }, () => 7 * 60 + 20);

describe("C4.2a: DELTA suggests a caffeine cut-off", () => {
  it("cites its two sources, quoted from their full texts", () => {
    expect(SOURCES.SHORT_SLEEP.quote).toBe("Adults should sleep 7 or more hours per night on a regular basis to promote optimal health.");
    expect(SOURCES.CAFFEINE_STILL_CUTS.quote).toContain("reducing TST between 1.1 to 1.2 hours");
    expect(SHORT_SLEEP_MINUTES).toBe(420);
  });

  it("waits for enough work-day nights, and counts nothing else", () => {
    expect(suggestCaffeineCutoff({ nights: nights(short(SUGGEST_MIN_NIGHTS - 1)), currentHours: 6, now })).toEqual({ kind: "WAITING", have: 6, need: 7 });
    // Days off and unknown days never count.
    expect(suggestCaffeineCutoff({ nights: [...nights(short(3)), ...nights(short(10), "OFF").map((n, i) => ({ ...n, livedDayStart: new Date(now.getTime() - (i + 20) * DAY).toISOString() }))], currentHours: 6, now }).kind).toBe("WAITING");
  });

  it("suggests one 2-hour step when most recent sleeps after a shift are under 7 h; low confidence under 10 nights", () => {
    const s = suggestCaffeineCutoff({ nights: nights([...short(6), ...long(2)]), currentHours: 6, now });
    expect(s).toMatchObject({ kind: "PROPOSAL", hours: 8, currentHours: 6, nights: 8, shortNights: 6, medianMinutes: 340, confidence: "LOW" });
    if (s.kind === "PROPOSAL") expect(s.evidence).toHaveLength(8);
    expect(suggestCaffeineCutoff({ nights: nights(short(12)), currentHours: 6, now })).toMatchObject({ kind: "PROPOSAL", confidence: "MODERATE" });
    // From 7 h the step stops at the 8 h ceiling; below the study's minimum it steps up by 2.
    expect(suggestCaffeineCutoff({ nights: nights(short(8)), currentHours: 7, now })).toMatchObject({ kind: "PROPOSAL", hours: MAX_SUGGESTED_HOURS });
    expect(suggestCaffeineCutoff({ nights: nights(short(8)), currentHours: 4, now })).toMatchObject({ kind: "PROPOSAL", hours: 6 });
  });

  it("says nothing new when sleeps are mostly 7 h or more, or the share of short nights is too small", () => {
    expect(suggestCaffeineCutoff({ nights: nights(long(9)), currentHours: 6, now })).toMatchObject({ kind: "FITS", nights: 9, shortNights: 0 });
    expect(suggestCaffeineCutoff({ nights: nights([...short(5), ...long(4)]), currentHours: 6, now })).toMatchObject({ kind: "FITS", shortNights: 5 });
  });

  it("only the 14 most recent nights count", () => {
    const s = suggestCaffeineCutoff({ nights: nights([...long(14), ...short(14)]), currentHours: 6, now });
    expect(s).toMatchObject({ kind: "FITS", nights: 14, shortNights: 0 });
  });

  it("never past 8 h, quiet for two weeks after NOT NOW, and a change is judged only on nights since it", () => {
    expect(suggestCaffeineCutoff({ nights: nights(short(10)), currentHours: 8, now })).toEqual({ kind: "AT_MOST", currentHours: 8 });
    const declinedAt = new Date(now.getTime() - 3 * DAY).toISOString();
    expect(suggestCaffeineCutoff({ nights: nights(short(10)), currentHours: 6, declinedAt, now })).toEqual({ kind: "QUIET", until: new Date(Date.parse(declinedAt) + QUIET_DAYS * DAY).toISOString() });
    expect(suggestCaffeineCutoff({ nights: nights(short(10)), currentHours: 6, declinedAt: new Date(now.getTime() - 15 * DAY).toISOString(), now }).kind).toBe("PROPOSAL");
    // Set 4 days ago: only the 3 nights whose lived day began since then count.
    const setAt = new Date(now.getTime() - 4 * DAY + 60_000).toISOString();
    expect(suggestCaffeineCutoff({ nights: nights(short(10)), currentHours: 7, setAt, now })).toEqual({ kind: "WAITING", have: 3, need: 7, since: setAt });
  });
});
