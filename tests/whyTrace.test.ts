import { describe, expect, it } from "vitest";
import { deltaLine, deltaRead, deriveOrientation, type OrientationInput } from "../src/application/orientation";
import { ADVISORY_RULE } from "../src/ui/screens/today/advisoryCopy";
import { TRAIN_RULE } from "../src/application/coachCards";
import { DELOAD_FRACTION, RE_ENTRY_DAYS, RE_ENTRY_FRACTION } from "../src/engine/progression";
import { STALL_SESSIONS } from "../src/engine/stall";
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
    // #638 review: wording checked against each producer (engine/advisory.ts); pinned so it can't drift silently.
    expect(ADVISORY_RULE.shiftProtection).toBe("Shift protection: water or protein still short of the Minimum Day amount before a shift.");
    expect(ADVISORY_RULE.obligationRelevance).toBe("Your commitments: one that is overdue, due today or soon, or planned for today.");
    expect(ADVISORY_RULE.continuity).toBe("Continuity: last time's recommendation, brought back because it still applies today.");
  });
});

describe("C6.4 · each branch names its own rule (#638 review: a mis-paired rule must fail)", () => {
  type In = Parameters<typeof deltaRead>[0];
  const KNOWN_UNDER = { state: "KNOWN", minutes: 400, source: "GARMIN", band: { low: 415, high: 470, kind: "WORK" }, under: true } as const;
  const KNOWN_IN = { ...KNOWN_UNDER, minutes: 450, under: false } as const;
  const DONE = { state: "DONE", energy: 3, stress: 2, mood: 4 } as const;
  const engine = (kind: string) => ({ source: "ENGINE" as const, kind: kind as never, title: kind, rationale: "", opensTrain: false });
  const draft = (kind: string) => ({ source: "DRAFT" as const, kind: kind as never, title: kind, rationale: "", opensTrain: false });
  const base: In = { sleep: KNOWN_IN, checkIn: { state: "NONE" }, recommendation: null, shortNights: 0, run: null, purpose: "WORK" };
  const table: [string, Partial<In>, string][] = [
    ["minimum day", { minimumDay: true }, "Minimum Day is on, so Delta keeps to the essentials."],
    ["execute, 2 short nights", { checkIn: DONE, recommendation: engine("EXECUTE_PLANNED_WORK"), shortNights: 2 }, "The Engine says do the planned work; two or more short nights in a row, so Delta says so."],
    ["execute", { checkIn: DONE, recommendation: engine("EXECUTE_PLANNED_WORK") }, "The Engine says do the planned work, after your check-in."],
    ["no action", { checkIn: DONE, recommendation: engine("NO_ACTION_REQUIRED") }, "The Engine asks for nothing more after your check-in; a short night, if there was one, is still named."],
    ["stabilize", { checkIn: DONE, recommendation: engine("STABILIZE") }, "The Engine says stabilize after your check-in; a hard day, so plain words."],
    ["engine recover", { checkIn: DONE, recommendation: engine("RECOVER") }, "The Engine’s recover recommendation, after your check-in."],
    ["engine post-shift", { checkIn: DONE, recommendation: engine("POST_SHIFT_TRANSITION") }, "The Engine’s post-shift recommendation, after your check-in."],
    ["engine obligation", { checkIn: DONE, recommendation: engine("OBLIGATION_DUE") }, "The Engine’s obligation-due recommendation, after your check-in."],
    ["sleep error", { sleep: { state: "ERROR" } }, "Sleep couldn’t be read, so Delta says nothing about rest."],
    ["no sleep", { sleep: { state: "NONE" } }, "No main sleep is recorded, so Delta doesn’t read your rest."],
    ["draft recover", { recommendation: draft("RECOVER") }, "A recover draft from your recent nights, before your check-in; the Engine decides after it."],
    ["draft post-shift", { recommendation: draft("POST_SHIFT_TRANSITION") }, "A post-shift draft, before your check-in; the Engine decides after it."],
    ["recovery day", { purpose: "RECOVERY" }, "The first day after a run of shifts: a recovery day."],
    ["day off", { purpose: "OFF" }, "A day off: Delta names what is due."],
    ["flip day", { purpose: "FLIP" }, "A flip day between nights and days."],
    ["range not learned", { sleep: { ...KNOWN_IN, band: null } }, "Your usual sleep range isn’t learned yet, so there’s no comparison."],
    ["under range", { sleep: KNOWN_UNDER }, "Last sleep was under your usual range for this kind of day."],
    ["in range", {}, "Last sleep was within your usual range for this kind of day."],
  ];
  for (const [name, over, rule] of table) it(name, () => expect(deltaRead({ ...base, ...over })!.rule).toBe(rule));
});

describe("C6.4 · coach-card TRAIN rules are the engine's own numbers", () => {
  it("re-entry, deload and reduce", () => {
    expect(TRAIN_RULE.RE_ENTRY).toBe(`Re-entry: ${RE_ENTRY_DAYS} or more days since this lift, so about ${Math.round(RE_ENTRY_FRACTION * 100)}% of the last load.`);
    expect(TRAIN_RULE.DELOAD).toBe(`Deload: ${STALL_SESSIONS} sessions in a row without a record, so about ${Math.round(DELOAD_FRACTION * 100)}% of the stalled load, once.`);
    expect(TRAIN_RULE.REDUCE).toMatch(/every required set came in under the rep range/);
  });
});
