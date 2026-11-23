import { describe, expect, it } from "vitest";
import { deriveTrainProgress, weeklyCounts, MIN_SESSIONS_28D, type FinishedSession } from "../src/application/trainProgress";
import type { LiftStrengthReview } from "../src/engine/strengthReview";

/** GRAYSON-TRAIN-PROGRESS-001: read-only Progress & Direction from existing records, in the design's vocabulary. */
const now = new Date(2026, 10, 23, 12);
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();
const sessions = (n: number, form: FinishedSession["form"] = "FULL") => Array.from({ length: n }, (_, i) => ({ at: daysAgo(1 + i * 3), form, status: "COMPLETED" as const }));
const lift = (exerciseId: string, status: LiftStrengthReview["status"], change?: number): LiftStrengthReview => ({
  exerciseId, recentSessions: 3, previousSessions: 3, recentBest: { weight: 135, reps: 6, estimatedMax: 162 }, previousBest: { weight: 130, reps: 6, estimatedMax: 156 },
  bestSetChangePercent: change, recentVolume: 1, previousVolume: 1, volumeChangePercent: change, estimatedMaxChangePercent: change, relativeStrength: undefined, indexChangePercent: change, status,
});
const base = {
  now, next: "B · Pull", sessions: sessions(8), lifts: [lift("barbell-bench-press", "IMPROVING", 4), lift("lat-pulldown", "STEADY", 0), lift("leg-press", "BUILDING")],
  names: { "barbell-bench-press": "Barbell Bench Press", "lat-pulldown": "Lat Pulldown" }, strengthIndexChangePercent: 2, comparableLifts: 2,
  bodyweights: [{ recordedAt: daysAgo(30), weightLbs: 210 }, { recordedAt: daysAgo(1), weightLbs: 206 }],
  benchRelative: { weight: 135, reps: 6, bodyweightLbs: 206 }, sitUpBestReps: 32,
};

describe("deriveTrainProgress", () => {
  it("WORKING with enough evidence; names a falling bodyweight without claiming muscle", () => {
    const p = deriveTrainProgress(base);
    expect(p.assessment.state).toBe("WORKING");
    expect(p.assessment.verdict).toContain("doesn't prove muscle was gained");
    expect(p.assessment.confidence).toBe("MODERATE");
    expect(p.lifts.map((l) => l.name)).toEqual(["Barbell Bench Press", "Lat Pulldown"]); // BUILDING lifts aren't judged
    expect(p.standards.map((s) => s.evidence)).toEqual(["OBSERVED", "OBSERVED", "UNKNOWN", "UNKNOWN"]);
    expect(p.standards[0]!.text).toContain("0.66× bodyweight");
    expect(p.bodyweight.text).toContain("(-4 lb)");
  });
  it("UNCERTAIN below the evidence floors, saying exactly what's missing", () => {
    const p = deriveTrainProgress({ ...base, sessions: sessions(3), comparableLifts: 1, strengthIndexChangePercent: undefined });
    expect(p.assessment.state).toBe("UNCERTAIN");
    expect(p.assessment.missing).toEqual([`3 of ${MIN_SESSIONS_28D} finished sessions in 4 weeks`, "1 of 2 lifts with sessions in both of the last two 4-week periods"]);
    expect(p.assessment.confidence).toBe("LOW");
  });
  it("NEEDS ATTENTION when comparable strength is lower, and suggests a look, not a change", () => {
    const p = deriveTrainProgress({ ...base, strengthIndexChangePercent: -5 });
    expect(p.assessment.state).toBe("NEEDS ATTENTION");
    expect(p.assessment.verdict).toContain("before changing anything");
  });
  it("unknowns stay unknown, never zero or failure", () => {
    const p = deriveTrainProgress({ ...base, benchRelative: null, sitUpBestReps: null, bodyweights: [] });
    expect(p.standards.every((s) => s.evidence === "UNKNOWN")).toBe(true);
    expect(p.bodyweight).toEqual({ evidence: "UNKNOWN", text: "No weigh-ins recorded." });
  });
  it("counts forms and weeks; an empty week is 0, and no streak, missed or failure words appear", () => {
    const p = deriveTrainProgress({ ...base, sessions: [...sessions(2, "SHORT"), { at: daysAgo(20), form: "HOME", status: "PARTIAL" }] });
    expect(p.where.byForm).toEqual({ SHORT: 2, HOME: 1 });
    expect(weeklyCounts([{ at: daysAgo(1), form: "FULL", status: "COMPLETED" }], now)).toEqual([0, 0, 0, 1]);
    const text = JSON.stringify(deriveTrainProgress({ ...base, sessions: [] }));
    expect(text).not.toMatch(/streak|missed|fail|behind|grew|unlock/i);
  });
});
