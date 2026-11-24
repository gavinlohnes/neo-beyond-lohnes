import { describe, expect, it } from "vitest";
import { deltaLine, deltaRead, deriveOrientation, type OrientationInput } from "../src/application/orientation";
import { ADVISORY_RULE } from "../src/ui/screens/today/advisoryCopy";
import type { AdvisorySourceModule } from "../src/domain/intelligence/types";

/**
 * GRAYSON C6.4 ("Why am I seeing this?" everywhere): Delta's line in Orientation always carries why: the rule that
 * produced it (from the same branch that chose the words) and the facts it read, only those on screen.
 */
const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m);
const PREP = { FOOD: { id: null, value: "UNCONFIRMED" as const, recordedAt: null }, BOTTLE: { id: null, value: "UNCONFIRMED" as const, recordedAt: null } };
const base = (over: Partial<OrientationInput> = {}): OrientationInput => ({
  now: at(14, 15, 5), day: { id: "d", startedAt: at(14, 16, 30).toISOString(), workContext: "WORK" }, contextBySchedule: true, scheduled: "WORK",
  picture: { now: { state: "WORK_RUN", label: "WORK RUN", line: "Shift 2 of 3.", why: [] }, next: null },
  shift: { start: at(14, 18), end: at(15, 6) }, run: { position: 2, length: 3 }, plan: null,
  sleep: { minutes: 400, fromGarmin: true, band: { low: 415, high: 470, kind: "WORK" } },
  checkIn: null, recommendation: null, draft: null, prep: PREP, obligations: [], ...over,
});
const DRAFT = { kind: "RECOVER" as const, title: "Protect recovery", reason: "Two short nights.", nights: [{ livedDayStart: "", minutes: 400, kind: "WORK" as const, low: 415, high: 470 }, { livedDayStart: "", minutes: 390, kind: "WORK" as const, low: 415, high: 470 }] };

describe("C6.4 · why Delta said it", () => {
  it("names the draft rule and exactly the facts on screen, with the lived day's date", () => {
    const o = deriveOrientation(base({ draft: DRAFT }));
    expect(o.deltaWhy).toEqual({
      rule: "A recover draft from your recent nights, before your check-in; the Engine decides after it.",
      facts: [
        { label: "Day", value: "SAT, NOV 14 · work day" },
        { label: "Sleep", value: "6:40 main sleep · Garmin" },
        { label: "Usual range", value: "6:55–7:50 on a work day" },
        { label: "Check-in", value: "not yet" },
        { label: "Guidance", value: "Draft before check-in: Protect recovery" },
        { label: "Short nights", value: "2 in a row" },
        { label: "Shift run", value: "night 2 of 3" },
      ],
    });
  });

  it("after check-in names the Engine, never a draft", () => {
    const o = deriveOrientation(base({ draft: DRAFT, checkIn: { energy: 3, stress: 2, mood: 4 }, recommendation: { kind: "EXECUTE_PLANNED_WORK", title: "Do the planned work", rationale: "", suggestedCommand: null } as never }));
    expect(o.deltaWhy!.rule).toMatch(/^The Engine says do the planned work/);
    expect(o.deltaWhy!.facts).toContainEqual({ label: "Check-in", value: "Energy 3 · Stress 2 · Mood 4" });
    expect(o.deltaWhy!.facts).toContainEqual({ label: "Guidance", value: "Engine: Do the planned work" });
  });

  it("no sleep recorded says so and makes no reading of rest", () => {
    const o = deriveOrientation(base({ sleep: null }));
    expect(o.deltaWhy!.rule).toBe("No main sleep is recorded, so Delta doesn’t read your rest.");
    expect(o.deltaWhy!.facts).toContainEqual({ label: "Sleep", value: "none recorded since the shift" });
    expect(o.deltaWhy!.facts.find((f) => f.label === "Usual range")).toBeUndefined();
  });

  it("whenever Delta speaks there is a why, and the words are exactly deltaLine's (every branch)", () => {
    const sleeps = [{ state: "KNOWN", minutes: 400, source: "GARMIN", band: { low: 415, high: 470, kind: "WORK" }, under: true },
      { state: "KNOWN", minutes: 450, source: "LOGGED", band: { low: 415, high: 470, kind: "OFF" }, under: false },
      { state: "KNOWN", minutes: 450, source: "LOGGED", band: null, under: false }, { state: "NONE" }, { state: "ERROR" }] as const;
    const checkIns = [{ state: "DONE", energy: 3, stress: 2, mood: 4 }, { state: "NONE" }, { state: "ERROR" }] as const;
    const recs = [null, ...(["EXECUTE_PLANNED_WORK", "NO_ACTION_REQUIRED", "STABILIZE", "RECOVER", "POST_SHIFT_TRANSITION", "OBLIGATION_DUE"] as const).map((kind) => ({ source: "ENGINE" as const, kind, title: kind, rationale: "", opensTrain: false })),
      { source: "DRAFT" as const, kind: "RECOVER" as const, title: "Draft", rationale: "", opensTrain: false }, { source: "DRAFT" as const, kind: "POST_SHIFT_TRANSITION" as const, title: "Draft", rationale: "", opensTrain: false }];
    let spoken = 0;
    for (const sleep of sleeps) for (const checkIn of checkIns) for (const recommendation of recs)
      for (const purpose of ["WORK", "RECOVERY", "OFF", "FLIP"] as const) for (const minimumDay of [false, true]) for (const shortNights of [0, 2]) {
        const input = { sleep, checkIn, recommendation, shortNights, run: { position: 2, length: 3 }, purpose, minimumDay, dueCount: 1 } as Parameters<typeof deltaRead>[0];
        const read = deltaRead(input);
        expect(read?.text ?? null).toBe(deltaLine(input));
        if (read) { spoken++; expect(read.rule.length).toBeGreaterThan(10); }
      }
    expect(spoken).toBeGreaterThan(500);
  });
});

describe("C6.4 · every advisory producer has a rule", () => {
  it("covers every source module", () => {
    const modules: AdvisorySourceModule[] = ["obligationRelevance", "progression", "decisionJournal", "shiftProtection", "continuity", "patternProposal", "dayRolloverAmbiguity"];
    for (const m of modules) expect(ADVISORY_RULE[m], m).toMatch(/\w{4,}/);
  });
});
